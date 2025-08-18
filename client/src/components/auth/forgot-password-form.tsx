import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { CalendarDiamondIcon } from "@/components/icons/calendar-diamond-icon";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onLogin?: () => void;
  onRegister?: () => void;
}

export function ForgotPasswordForm({ onLogin, onRegister }: ForgotPasswordFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await apiRequest('/api/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center bg-gradient-to-r from-green-50 to-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-gray-900">Check Your Email</CardTitle>
            <CardDescription className="text-gray-600">
              Password reset link has been sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                If an account with that email exists, we've sent a password reset link to your email address.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-2">
              {onLogin && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onLogin}
                >
                  Back to Sign In
                </Button>
              )}
              
              {onRegister && (
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-blue-600 hover:text-blue-700"
                    onClick={onRegister}
                  >
                    Sign up
                  </Button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center bg-gradient-to-r from-blue-50 to-white rounded-t-lg pt-8 pb-6 px-8">
          <div className="space-y-4">
            <div className="flex justify-center">
              <CalendarDiamondIcon className="text-slate-700" size={48} />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-gray-900">Reset Password</CardTitle>
              <CardDescription className="text-gray-600">
                Enter your email to receive a reset link
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            {onLogin && (
              <p className="text-sm text-gray-600">
                Remember your password?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-blue-600 hover:text-blue-700"
                  onClick={onLogin}
                >
                  Sign in
                </Button>
              </p>
            )}
            
            {onRegister && (
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-blue-600 hover:text-blue-700"
                  onClick={onRegister}
                >
                  Sign up
                </Button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}