'use client'

import { supabase } from '@/src/lib/supabase/client'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CiLock } from 'react-icons/ci'

export default function ChangePasswordPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user_id from public.users
      const { data: userData } = await supabase
        .from('users')
        .select('user_id')
        .eq('auth_user_id', user.id)
        .single()

      if (userData) {
        setUserId(userData.user_id)
      }
    }

    getCurrentUser()
  }, [router])

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }

      const passwordError = validatePassword(formData.newPassword)
      if (passwordError) {
        throw new Error(passwordError)
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword
      })

      if (updateError) throw updateError

      if (!userId) {
        throw new Error('User ID not found')
      }

      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          fk_user_id: userId,
          setting_key: 'password_changed',
          setting_value: 'true',
          setting_type: 'boolean',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'fk_user_id,setting_key'
        })

      if (settingsError) throw settingsError

      await supabase
        .from('user_settings')
        .upsert({
          fk_user_id: userId,
          setting_key: 'mfa_setup_shown',
          setting_value: 'false',
          setting_type: 'boolean',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'fk_user_id,setting_key'
        })

      router.push('/auth/setup-2fa')
    } catch (err: any) {
      console.error('Password change error:', err)
      setError(err.message || 'Failed to change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/readi_login.png"
          alt="Control Center Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gray-900/50"></div>
      </div>

      {/* Change Password Form */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo Section */}
        <div className="mb-8 flex flex-col items-center justify-center gap-4">
          <Image
            src="/logo-sm.png"
            alt="ReADI logo"
            width={200}
            height={60}
            className="h-16 w-auto"
          />
        </div>

        {/* Form Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8">
          <form className="w-full" onSubmit={handleSubmit}>
            <h2 className="mb-2 text-2xl font-semibold text-gray-900 text-center">
              Change Password
            </h2>
            <p className="mb-7 text-center text-sm text-gray-600">
              Please create a new strong password for your account
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* New Password Input */}
              <div className="relative">
                <CiLock className="absolute left-4 top-[35%] h-4 w-4 text-gray-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  placeholder="New Password"
                  required
                  className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-12 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Confirm Password Input */}
              <div className="relative">
                <CiLock className="absolute left-4 top-[35%] h-4 w-4 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Confirm New Password"
                  required
                  className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-12 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-medium">Password must contain:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>At least 8 characters</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                  <li>One special character (!@#$%^&*)</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-lg bg-gray-900 text-base font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Changing Password...
                  </span>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}