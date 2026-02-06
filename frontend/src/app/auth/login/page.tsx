'use client'

import { authCookies } from '@/src/lib/auth/auth-cookies'
import { getDefaultRoute } from '@/src/lib/auth/roles'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CiLock, CiMail } from 'react-icons/ci'
import { loginUser } from './actions'

export default function LoginPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: '',
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
    const result = await loginUser(formData.email, formData.password);

    if (!result.success) {
      setError(result.error || 'Login failed');
      return;
    }

    if (result.redirect) {
      window.location.href = result.redirect;
      return;
    }

    if (result.data) {
      authCookies.setAuthToken(result.data.token);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const defaultRoute = getDefaultRoute(result.data.role);
      
      window.location.href = defaultRoute;
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