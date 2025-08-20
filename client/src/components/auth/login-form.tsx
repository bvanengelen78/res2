import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, LogIn, AlertCircle, Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  // Removed onForgotPassword and onRegister as per requirements
}

export function LoginForm({}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data);
    } catch (err) {
      console.error('[LOGIN_FORM] Login error:', err);

      // Provide user-friendly error messages
      let errorMessage = "Login failed";

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        if (message.includes('500') || message.includes('internal server error')) {
          errorMessage = "Server temporarily unavailable. Please try again in a moment.";
        } else if (message.includes('401') || message.includes('unauthorized') || message.includes('invalid credentials')) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (message.includes('400') || message.includes('bad request')) {
          errorMessage = "Please check your email and password format.";
        } else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md drop-shadow-xl border-0 bg-white/70 backdrop-blur-md rounded-2xl mx-4 sm:mx-0">
        <CardHeader className="space-y-4 text-center pt-8 pb-6 px-6 sm:px-8">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <LogIn className="text-slate-700 w-8 h-8" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-slate-800">Sign in with email</CardTitle>
              <CardDescription className="text-slate-600 text-sm leading-relaxed px-2 sm:px-0">
                Access your ResourceFlow account to manage<br className="hidden sm:block" />
                <span className="sm:hidden"> </span>projects and resources
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-6 sm:px-8 pb-8">
          {error && (
            <Alert variant="destructive" className="bg-red-50/80 border-red-200/50 backdrop-blur-sm" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="sr-only">Email address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  required
                  aria-describedby={form.formState.errors.email ? "email-error" : undefined}
                  className="h-12 rounded-xl border-slate-200/50 bg-slate-50/30 focus:bg-white/80 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50 transition-all duration-200 text-slate-800 placeholder:text-slate-500"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p id="email-error" className="text-sm text-red-500 ml-1" role="alert">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="sr-only">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  aria-describedby={form.formState.errors.password ? "password-error" : undefined}
                  className="pr-12 h-12 rounded-xl border-slate-200/50 bg-slate-50/30 focus:bg-white/80 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50 transition-all duration-200 text-slate-800 placeholder:text-slate-500"
                  {...form.register("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100/50 rounded-lg focus:ring-2 focus:ring-slate-200/50"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  )}
                </Button>
              </div>
              {form.formState.errors.password && (
                <p id="password-error" className="text-sm text-red-500 ml-1" role="alert">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3 hidden sm:flex">
              <Checkbox
                id="rememberMe"
                className="rounded-md border-slate-300 focus:ring-2 focus:ring-slate-200/50"
                {...form.register("rememberMe")}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-medium text-slate-700 cursor-pointer select-none"
              >
                Remember me
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-slate-800 hover:bg-slate-900 focus:bg-slate-900 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              aria-describedby={isLoading ? "loading-status" : undefined}
            >
              {isLoading ? (
                <>
                  <span className="sr-only" id="loading-status">Signing in, please wait</span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full border-slate-200/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/70 px-3 text-slate-500 font-medium backdrop-blur-sm">OR</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={true}
              className="w-full h-12 border-slate-200/50 bg-slate-50/30 text-slate-600 font-medium rounded-xl transition-all duration-200 opacity-60 cursor-not-allowed hover:bg-slate-50/30 hover:border-slate-200/50"
              aria-label="Single Sign-On login - Coming soon"
              aria-describedby="sso-status"
            >
              <Building2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Sign in with your organization
              <span className="sr-only" id="sso-status">This feature is coming soon</span>
            </Button>

            <div className="text-center text-xs text-slate-500 mt-4 p-3 bg-slate-50/50 rounded-lg border border-slate-200/50">
              <p>Forgot your password? Contact your administrator to reset it.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}