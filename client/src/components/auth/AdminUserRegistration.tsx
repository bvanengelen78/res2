import { useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { UserPlus, AlertCircle, CheckCircle, Eye, EyeOff, Copy, RefreshCw, Shield, Key } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { DEFAULT_ROLE_PERMISSIONS, type UserRole } from "@/types/rbac"

// Enhanced password validation schema
const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")

const userRegistrationSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  role: z.enum(["user", "manager", "admin"], {
    required_error: "Please select a role",
  }),
  department: z.string()
    .min(1, "Department is required")
    .max(100, "Department must be less than 100 characters"),
  jobRole: z.string()
    .min(1, "Job role is required")
    .max(100, "Job role must be less than 100 characters"),
  capacity: z.number()
    .min(1, "Capacity must be at least 1 hour")
    .max(80, "Capacity cannot exceed 80 hours per week")
    .default(40),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type UserRegistrationData = z.infer<typeof userRegistrationSchema>

interface AdminUserRegistrationProps {
  onUserCreated?: () => void
}

// Password generation utility
const generateSecurePassword = (): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const allChars = lowercase + uppercase + numbers + symbols

  let password = ''
  // Ensure at least one character from each required set
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // Fill the rest randomly
  for (let i = 4; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Password strength calculation
const calculatePasswordStrength = (password: string): { score: number; feedback: string[] } => {
  let score = 0
  const feedback: string[] = []

  if (password.length >= 12) score += 25
  else feedback.push('Use at least 12 characters')

  if (/[a-z]/.test(password)) score += 25
  else feedback.push('Add lowercase letters')

  if (/[A-Z]/.test(password)) score += 25
  else feedback.push('Add uppercase letters')

  if (/[0-9]/.test(password)) score += 25
  else feedback.push('Add numbers')

  if (/[^a-zA-Z0-9]/.test(password)) score += 25
  else feedback.push('Add special characters')

  if (password.length >= 16) score += 10

  return { score: Math.min(score, 100), feedback }
}

// Department options
const DEPARTMENT_OPTIONS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'Human Resources',
  'Customer Success',
  'General'
]

// Job role options
const JOB_ROLE_OPTIONS = [
  'Software Engineer',
  'Senior Software Engineer',
  'Lead Engineer',
  'Product Manager',
  'Senior Product Manager',
  'Designer',
  'Senior Designer',
  'Marketing Manager',
  'Sales Representative',
  'Operations Manager',
  'Financial Analyst',
  'HR Manager',
  'Customer Success Manager',
  'Employee'
]

export function AdminUserRegistration({ onUserCreated }: AdminUserRegistrationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] as string[] })
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<UserRegistrationData>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      role: "user",
      department: "General",
      jobRole: "Employee",
      capacity: 40,
    },
    mode: "onChange", // Enable real-time validation
  })

  // Watch password for strength calculation
  const watchedPassword = form.watch("password")
  const watchedEmail = form.watch("email")

  // Update password strength when password changes
  useEffect(() => {
    if (watchedPassword) {
      setPasswordStrength(calculatePasswordStrength(watchedPassword))
    } else {
      setPasswordStrength({ score: 0, feedback: [] })
    }
  }, [watchedPassword])

  // Email uniqueness check with debouncing
  useEffect(() => {
    if (!watchedEmail || !z.string().email().safeParse(watchedEmail).success) {
      setEmailExists(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingEmail(true)
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('email', watchedEmail)
          .maybeSingle()

        setEmailExists(!!data)
      } catch (error) {
        console.error('Error checking email:', error)
      } finally {
        setIsCheckingEmail(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [watchedEmail])

  // Generate password function
  const handleGeneratePassword = useCallback(() => {
    const newPassword = generateSecurePassword()
    form.setValue("password", newPassword)
    form.setValue("confirmPassword", newPassword)
    setGeneratedPassword(newPassword)
    toast({
      title: "Password Generated",
      description: "A secure password has been generated and filled in the form.",
    })
  }, [form, toast])

  // Copy password to clipboard
  const handleCopyPassword = useCallback(async (password: string) => {
    try {
      await navigator.clipboard.writeText(password)
      toast({
        title: "Password Copied",
        description: "Password has been copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy password to clipboard.",
        variant: "destructive",
      })
    }
  }, [toast])

  const createUserMutation = useMutation({
    mutationFn: async (data: UserRegistrationData) => {
      // Use our backend API to create user with proper RBAC integration
      const response = await fetch('/api/rbac/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          role: data.role,
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password,
          department: data.department,
          jobRole: data.jobRole,
          capacity: data.capacity,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create user')
      }

      return await response.json()
    },
    onSuccess: (data) => {
      const createdPassword = data.defaultPassword || generatedPassword
      setSuccess(`User ${data.user.email} created successfully!`)
      setGeneratedPassword(createdPassword)
      setError(null)

      toast({
        title: "User Created Successfully",
        description: `User account for ${data.user.email} has been created with ${data.user.role} role.`,
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['rbac', 'users'] })

      onUserCreated?.()

      // Don't auto-close dialog to allow password copying
    },
    onError: (error: Error) => {
      console.error('User creation error:', error)
      
      let errorMessage = "Failed to create user. Please try again."
      
      if (error.message.includes('User already registered')) {
        errorMessage = "A user with this email address already exists."
      } else if (error.message.includes('Invalid email')) {
        errorMessage = "Please enter a valid email address."
      } else if (error.message.includes('Password')) {
        errorMessage = "Password does not meet requirements."
      } else {
        errorMessage = error.message
      }

      setError(errorMessage)
      setSuccess(null)
    },
  })

  const onSubmit = async (data: UserRegistrationData) => {
    // Final validation checks
    if (emailExists) {
      setError("A user with this email address already exists.")
      return
    }

    setError(null)
    setSuccess(null)
    await createUserMutation.mutateAsync(data)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      form.reset()
      setError(null)
      setSuccess(null)
      setGeneratedPassword(null)
      setPasswordStrength({ score: 0, feedback: [] })
      setEmailExists(false)
    }
  }

  const handleCloseSuccess = () => {
    setIsOpen(false)
    form.reset()
    setError(null)
    setSuccess(null)
    setGeneratedPassword(null)
    setPasswordStrength({ score: 0, feedback: [] })
    setEmailExists(false)
  }

  // Get password strength color
  const getPasswordStrengthColor = (score: number) => {
    if (score < 25) return "bg-red-500"
    if (score < 50) return "bg-orange-500"
    if (score < 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  // Get password strength text
  const getPasswordStrengthText = (score: number) => {
    if (score < 25) return "Weak"
    if (score < 50) return "Fair"
    if (score < 75) return "Good"
    return "Strong"
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <UserPlus className="w-4 h-4" />
          <span>Create User</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account with assigned role and permissions. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && generatedPassword && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium text-green-800">{success}</p>
                  <div className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Generated Password:</p>
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {generatedPassword}
                        </code>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPassword(generatedPassword)}
                        className="ml-2"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleCloseSuccess}
                      className="flex-1"
                    >
                      Close & Create Another
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopyPassword(generatedPassword)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Password
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!success && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...form.register("firstName")}
                      disabled={createUserMutation.isPending}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...form.register("lastName")}
                      disabled={createUserMutation.isPending}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Account Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@company.com"
                      {...form.register("email")}
                      disabled={createUserMutation.isPending}
                      className={emailExists ? "border-red-500" : ""}
                    />
                    {isCheckingEmail && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                  {emailExists && (
                    <p className="text-sm text-red-600">
                      A user with this email address already exists.
                    </p>
                  )}
                </div>
              </div>

              {/* Role Selection with Permission Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Role & Permissions</h3>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(value) => form.setValue("role", value as any)}
                    disabled={createUserMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <div>
                            <div className="font-medium">User</div>
                            <div className="text-xs text-gray-500">Basic access to time logging and dashboard</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <div>
                            <div className="font-medium">Manager</div>
                            <div className="text-xs text-gray-500">Team management and reporting capabilities</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <div>
                            <div className="font-medium">Admin</div>
                            <div className="text-xs text-gray-500">Full system access and user management</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.role.message}
                    </p>
                  )}
                </div>

                {/* Permission Preview */}
                {form.watch("role") && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Permissions for {form.watch("role")} role:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_ROLE_PERMISSIONS[form.watch("role") as UserRole]?.map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-xs">
                          {permission.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Password Section with Generation */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Password</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePassword}
                    disabled={createUserMutation.isPending}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Secure Password
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 12 characters with mixed case, numbers, and symbols"
                      {...form.register("password")}
                      disabled={createUserMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Password Strength Indicator */}
                  {watchedPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Password strength:</span>
                        <span className={`text-sm font-medium ${
                          passwordStrength.score < 50 ? 'text-red-600' :
                          passwordStrength.score < 75 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {getPasswordStrengthText(passwordStrength.score)}
                        </span>
                      </div>
                      <Progress
                        value={passwordStrength.score}
                        className="h-2"
                      />
                      {passwordStrength.feedback.length > 0 && (
                        <div className="text-xs text-gray-600">
                          <p>Suggestions:</p>
                          <ul className="list-disc list-inside">
                            {passwordStrength.feedback.map((feedback, index) => (
                              <li key={index}>{feedback}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {form.formState.errors.password && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      {...form.register("confirmPassword")}
                      disabled={createUserMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Work Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Work Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select
                      value={form.watch("department")}
                      onValueChange={(value) => form.setValue("department", value)}
                      disabled={createUserMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENT_OPTIONS.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.department && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.department.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobRole">Job Role *</Label>
                    <Select
                      value={form.watch("jobRole")}
                      onValueChange={(value) => form.setValue("jobRole", value)}
                      disabled={createUserMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select job role" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.jobRole && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.jobRole.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Weekly Capacity (hours) *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    max="80"
                    placeholder="40"
                    {...form.register("capacity", { valueAsNumber: true })}
                    disabled={createUserMutation.isPending}
                  />
                  {form.formState.errors.capacity && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.capacity.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Standard full-time capacity is 40 hours per week
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={createUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending || emailExists}
              >
                {createUserMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
