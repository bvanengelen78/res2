import { config } from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { type Server as HTTPServer } from "http";

// Load environment variables from .env file
config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let httpServer: HTTPServer | null = null;

// Basic request logging with compact API summaries
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

function setupGracefulShutdown() {
  const shutdown = (signal: string) => {
    log(`[watch] Received ${signal}. Shutting down server…`);
    if (httpServer) {
      httpServer.close(() => {
        log("[watch] Server closed.");
        process.exit(0);
      });
      // Force-exit if not closed within 5s
      setTimeout(() => {
        log("[watch] Force exiting after timeout.");
        process.exit(1);
      }, 5000).unref();
    } else {
      process.exit(0);
    }
  };

  // Windows may not support SIGTERM, handle both
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (err: any) => {
    console.error("[watch] UnhandledRejection:", err);
  });
  process.on("uncaughtException", (err) => {
    console.error("[watch] UncaughtException:", err);
    shutdown("uncaughtException");
  });
}

(async () => {
  log(`[watch] Server starting (pid ${process.pid})`);
  httpServer = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Set up Vite middleware in dev only after routes
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 5000 (API + client)
  const port = 5000;
  const host = process.platform === 'win32' ? 'localhost' : '0.0.0.0';

  httpServer.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
  });

  httpServer.on("close", () => {
    log("[watch] HTTP server closed");
  });

  setupGracefulShutdown();
})();
