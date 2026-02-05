'use client'

import { supabase } from '@/src/lib/supabase'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CiLock, CiMail } from 'react-icons/ci'

export default function LoginPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: '', // Changed from username to email
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Step 1: Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) {
        throw new Error('Invalid email or password')
      }

      if (!authData.user) {
        throw new Error('Authentication failed')
      }

      // Step 2: Check if user exists in public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, username, email, user_active')
        .eq('auth_user_id', authData.user.id)
        .single()

      if (userError || !userData) {
        // User exists in auth but not in public.users (shouldn't happen with trigger)
        await supabase.auth.signOut()
        throw new Error('User profile not found. Please contact administrator.')
      }

      // Step 3: Check if user is active
      if (userData.user_active !== 'Y') {
        await supabase.auth.signOut()
        throw new Error('Your account has been deactivated. Please contact administrator.')
      }

      // Step 4: Get user profile to check password change status
      const { data: profileData, error: profileError } = await supabase
        .from('users_profile')
        .select('profile_id, bio')
        .eq('fk_user_id', userData.user_id)
        .single()

      // Step 5: Check user settings for password_changed flag
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('setting_value')
        .eq('fk_user_id', userData.user_id)
        .eq('setting_key', 'password_changed')
        .single()

      if (!settingsData || settingsData.setting_value !== 'true') {
        router.push('/auth/change-password')
        return
      }

      const { data: factors } = await supabase.auth.mfa.listFactors()

      if (factors && factors.totp && factors.totp.length > 0) {
        router.push('/auth/verify-mfa')
      } else {
        const { data: mfaRequiredSetting } = await supabase
          .from('user_settings')
          .select('setting_value')
          .eq('fk_user_id', userData.user_id)
          .eq('setting_key', 'mfa_required')
          .single()

        if (mfaRequiredSetting && mfaRequiredSetting.setting_value === 'true') {
          router.push('/auth/setup-2fa')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please try again.')
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

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 flex flex-col items-center justify-center gap-4">
          <Image
            src="/logo-sm.png"
            alt="ReADI logo"
            width={200}
            height={60}
            className="h-16 w-auto"
          />
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8">
          <form className="w-full" onSubmit={handleSubmit}>
            <p className="mb-7 text-center text-base text-gray-600">
              Please login to continue to your account
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="relative">
                <CiMail className="absolute left-4 top-[35%] h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="relative">
                <CiLock className="absolute left-4 top-[35%] h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  required
                  className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-12 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="button-section">
                <button
                  type="submit"
                  disabled={loading}
                  className="mb-2 h-12 w-full rounded-lg bg-gray-900 text-base font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </button>

              </div>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/80">
          Contact your administrator for account access
        </p>
      </div>
    </div>
  )
}