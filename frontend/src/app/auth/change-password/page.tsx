'use client'

import { supabase } from '@/src/lib/supabase'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passwordStrength, setPasswordStrength] = useState<string>('')

  useEffect(() => {
    checkIfAlreadyChanged()
  }, [])

  const checkIfAlreadyChanged = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('password_changed')
      .eq('user_id', user.id)
      .single()

    if (profile?.password_changed) {
      router.push('/dashboard')
    }
  }

  const validatePassword = (password: string): boolean => {
    const minLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!minLength) {
      setPasswordStrength('Password must be at least 8 characters')
      return false
    }
    if (!hasUpperCase) {
      setPasswordStrength('Password must contain an uppercase letter')
      return false
    }
    if (!hasLowerCase) {
      setPasswordStrength('Password must contain a lowercase letter')
      return false
    }
    if (!hasNumber) {
      setPasswordStrength('Password must contain a number')
      return false
    }
    if (!hasSymbol) {
      setPasswordStrength('Password must contain a special character')
      return false
    }

    setPasswordStrength('Strong password')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!validatePassword(formData.newPassword)) {
      setError(passwordStrength)
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')

      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      })

      if (updateError) throw updateError

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ password_changed: true })
        .eq('user_id', user.id)

      if (profileError) throw profileError

      router.push('/auth/setup-2fa')
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
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
    
    if (name === 'newPassword') {
      validatePassword(value)
    }
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

      <div className="relative z-10 w-full max-w-100 px-3">
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
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Change Your Password
              </h2>
              <p className="text-base text-gray-600">
                You must change your password before continuing
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div className="relative">
                <CiLock className="absolute left-4 top-[35%] h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  placeholder="New Password"
                  required
                  className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-12 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>

              {formData.newPassword && (
                <p className={`text-xs ${passwordStrength === 'Strong password' ? 'text-green-600' : 'text-gray-600'}`}>
                  {passwordStrength}
                </p>
              )}

              <div className="relative">
                <CiLock className="absolute left-4 top-[35%] h-4 w-4 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Confirm Password"
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
                  {showConfirmPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>

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