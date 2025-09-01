import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MockAuthProvider } from "@/context/MockAuthContext";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import Dashboard from "@/pages/dashboard";
import ManagementDashboard from "@/pages/management-dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "./pages/project-detail.tsx";
import Resources from "@/pages/resources";
import ResourceDetail from "@/pages/resource-detail";
import Calendar from "@/pages/calendar";
import TimeLogging from "@/pages/time-logging";
import MobileTimeLogging from "@/pages/mobile-time-logging";
import SubmissionOverview from "@/pages/submission-overview";
import Reports from "@/pages/reports";
import ChangeLeadReports from "@/pages/change-lead-reports";
import Settings from "@/pages/settings";
import UserManagement from "@/pages/user-management";
import LoginPage from "@/pages/login";

/**
 * Testing Version of App Component
 * 
 * This version bypasses all authentication and provides immediate access
 * to all application features for stakeholder testing and MVP demonstrations.
 * 
 * Key Changes for Testing:
 * 1. Uses MockAuthProvider instead of SupabaseAuthProvider
 * 2. Removes authentication checks and loading states
 * 3. Provides direct access to all routes without login requirements
 * 4. Grants full permissions to all features
 * 
 * To use this for testing:
 * 1. Rename the current App.tsx to App.production.tsx
 * 2. Rename this file to App.tsx
 * 3. All authentication barriers will be removed
 */

function Router() {
  // No authentication checks - direct access to all features
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto main-content-bg">
        <Header />
        <Switch>
          {/* Main Dashboard Routes */}
          <Route path="/" component={Dashboard} />
          <Route path="/management-dashboard" component={ManagementDashboard} />
          <Route path="/dashboard" component={Dashboard} />
          
          {/* Project Management Routes */}
          <Route path="/projects" component={Projects} />
          <Route path="/projects/:id" component={ProjectDetail} />
          
          {/* Resource Management Routes */}
          <Route path="/resources" component={Resources} />
          <Route path="/resources/:id" component={ResourceDetail} />
          
          {/* Time Management Routes */}
          <Route path="/calendar" component={Calendar} />
          <Route path="/time-logging" component={TimeLogging} />
          <Route path="/mobile-time-logging" component={MobileTimeLogging} />
          <Route path="/submission-overview" component={SubmissionOverview} />
          
          {/* Reporting Routes */}
          <Route path="/reports" component={Reports} />
          <Route path="/change-lead-reports" component={ChangeLeadReports} />
          
          {/* Admin Routes */}
          <Route path="/settings" component={Settings} />
          <Route path="/user-management" component={UserManagement} />
          
          {/* Login route (for completeness, but not required) */}
          <Route path="/login" component={LoginPage} />
          
          {/* Fallback to dashboard for any unmatched routes */}
          <Route component={Dashboard} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </MockAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
