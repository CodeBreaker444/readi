'use client'

import { getDefaultRoute } from '@/lib/auth/roles'
import axios from 'axios'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CiLock, CiMail } from 'react-icons/ci'
import { toast } from 'sonner'

export function LoginForm() {
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('activated') === 'true') toast.success('Account activated successfully!')
    const error = searchParams.get('error')
    if (error === 'invalid_link') toast.error('Invalid activation link.')
    else if (error === 'activation_failed') toast.error('Activation failed. Link may have expired.')
    else if (error === 'activation_error') toast.error('Activation error. Please try again.')
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await axios.post('/api/auth/login', formData)
      const result = response.data
      if (!result.success) { toast.error(result.error || 'Login failed'); return }
      toast.success(result.message || 'Login successful!')
      if (result.redirect) { window.location.href = result.redirect; return }
      if (result.data) window.location.href = getDefaultRoute(result.data.role)
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-slate-50"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, #ede9fe 0%, transparent 70%)', opacity: 0.5 }} />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, #ede9fe 0%, transparent 70%)', opacity: 0.4 }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-6 flex items-center gap-12 flex-1">

        <div className="hidden lg:flex flex-col flex-1">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
              <Image src="/logo-sm.png" alt="ReADI" width={44} height={44} className="object-contain brightness-0 invert" />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-sm leading-none">ReADI</p>
              <p className="text-slate-400 text-[0.55rem] tracking-[0.16em] uppercase mt-0.5">Drone Control</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 leading-tight tracking-tight mb-4">
            Full fleet.<br />
            <span className="text-violet-600">Zero</span> blind spots.
          </h1>

          <p className="text-slate-500 text-sm leading-relaxed mb-10 max-w-xs">
            Real-time mission planning, safety management, and drone operations — unified in one command interface.
          </p>

          <div className="flex items-center gap-2 mt-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">All systems operational</span>
          </div>
        </div>

        <div className="flex-1 max-w-[380px] w-full mx-auto lg:mx-0">

          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
              <Image src="/logo-sm.png" alt="ReADI" width={44} height={44} className="object-contain brightness-0 invert" />
            </div>
            <p className="text-slate-900 font-bold text-base">ReADI</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome back</h2>
              <p className="text-slate-400 text-sm">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label>
                <div className="group relative">
                  <CiMail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    placeholder="name@company.com"
                    required
                    className="w-full h-10 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-300 rounded-lg border border-slate-200 bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-150"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <div className="group relative">
                  <CiLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    required
                    className="w-full h-10 pl-9 pr-10 text-sm text-slate-800 rounded-lg border border-slate-200 bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-150"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-violet-500 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg text-white text-sm font-semibold transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.25)' }}
              >
                {loading ? <><Loader2Icon className="h-4 w-4 animate-spin" /> Signing in…</> : 'Sign in'}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-6">
              Need access?{' '}
              <span className="text-slate-600 font-medium">Contact your administrator</span>
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center py-6">
        <Image
          src="/compliance_readi.png"
          alt="Compliance Certifications"
          width={195}
          height={40}
          className="object-contain"
        />
        <p className="text-[0.65rem] text-slate-400 mt-2">
          © {new Date().getFullYear()} ReADI. All rights reserved.
        </p>
      </div>
    </div>
  )
}