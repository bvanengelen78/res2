import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, LogIn, AlertCircle, Building2 } from "lucide-react"
import { useSupabaseAuth } from "@/context/SupabaseAuthContext"
import { AuthError } from "@supabase/supabase-js"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function SupabaseLoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn, isLoading } = useSupabaseAuth()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)
      await signIn(data.email, data.password)
    } catch (err) {
      console.error('Login error:', err)
      
      let errorMessage = "An unexpected error occurred. Please try again."
      
      if (err instanceof Error) {
        // Handle Supabase Auth errors
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Please check your credentials and try again."
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and click the confirmation link before signing in."
        } else if (err.message.includes('Too many requests')) {
          errorMessage = "Too many login attempts. Please wait a moment before trying again."
        } else if (err.message.includes('User not found')) {
          errorMessage = "No account found with this email address. Please contact your administrator."
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md drop-shadow-xl border-0 bg-white/70 backdrop-blur-md rounded-2xl mx-4 sm:mx-0">
        <CardHeader className="space-y-4 text-center pt-8 pb-6 px-6 sm:px-8">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Building2 className="text-slate-700 w-8 h-8" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-slate-800">
                Sign in to ResourceFlow
              </CardTitle>
              <CardDescription className="text-slate-600">
                Enter your credentials to access your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 px-6 sm:px-8 pb-8">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="sr-only">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                required
                aria-describedby={form.formState.errors.email ? "email-error" : undefined}
                className="h-12 rounded-xl border-slate-200/50 bg-slate-50/30 focus:bg-white/80 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/50 transition-all duration-200 text-slate-800 placeholder:text-slate-500"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p id="email-error" className="text-sm text-red-600 mt-1">
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
                  className="absolute right-0 top-0 h-12 px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              </div>
              {form.formState.errors.password && (
                <p id="password-error" className="text-sm text-red-600 mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </div>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-slate-600">
              Need help accessing your account?{" "}
              <span className="text-slate-500">Contact your administrator</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
