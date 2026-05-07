'use client'

import axios from 'axios'
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { CiLock } from 'react-icons/ci'
import { toast } from 'sonner'

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters long'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (formData.newPassword !== formData.confirmPassword) throw new Error('Passwords do not match')
      const passwordError = validatePassword(formData.newPassword)
      if (passwordError) throw new Error(passwordError)

      const response = await axios.post('/api/auth/update-password', { newPassword: formData.newPassword })
      if (response.data?.success) {
        toast.success('Password changed successfully!')
        setTimeout(() => { window.location.href = '/auth/setup-2fa' }, 500)
      } else {
        throw new Error(response.data?.error || 'Failed to change password')
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to change password.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const requirements = [
    { label: 'At least 8 characters', met: formData.newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(formData.newPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(formData.newPassword) },
    { label: 'One number', met: /[0-9]/.test(formData.newPassword) },
    { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) },
  ]

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, #ede9fe 0%, transparent 70%)', opacity: 0.5 }} />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, #ede9fe 0%, transparent 70%)', opacity: 0.4 }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-6 flex items-center gap-12">

        <div className="hidden lg:flex flex-col flex-1">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
              <Image src="/logo-sm.png" alt="ReADI" width={18} height={18} className="object-contain brightness-0 invert" />
            </div>
            <div>
              <p className="text-slate-900 font-bold text-sm leading-none">ReADI</p>
              <p className="text-slate-400 text-[0.55rem] tracking-[0.16em] uppercase mt-0.5">Drone Control</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 leading-tight tracking-tight mb-4">
            Secure your<br />
            <span className="text-violet-600">account</span> first.
          </h1>

          <p className="text-slate-500 text-sm leading-relaxed mb-10 max-w-xs">
            Create a strong password to protect your ReADI operator account and keep your fleet data safe.
          </p>

          <div className="space-y-0">
            {requirements.map(({ label, met }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-slate-200">
                <span className="text-xs text-slate-400">{label}</span>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${met ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                  {met && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 max-w-[380px] w-full mx-auto lg:mx-0">

          <div className="lg:hidden flex items-center gap-2.5 justify-center mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
              <Image src="/logo-sm.png" alt="ReADI" width={18} height={18} className="object-contain brightness-0 invert" />
            </div>
            <p className="text-slate-900 font-bold text-base">ReADI</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Update password</h2>
              <p className="text-slate-400 text-sm">Create a new strong password for your account</p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">New password</label>
                <div className="group relative">
                  <CiLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="w-full h-10 pl-9 pr-10 text-sm text-slate-800 rounded-lg border border-slate-200 bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-150 disabled:opacity-50"
                    value={formData.newPassword}
                    onChange={handleChange}
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors" disabled={loading}>
                    {showNewPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm password</label>
                <div className="group relative">
                  <CiLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="w-full h-10 pl-9 pr-10 text-sm text-slate-800 rounded-lg border border-slate-200 bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-150 disabled:opacity-50"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition-colors" disabled={loading}>
                    {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
                )}
              </div>

              <div className="lg:hidden space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                {requirements.map(({ label, met }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${met ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      {met && (
                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs transition-colors ${met ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full cursor-pointer h-10 rounded-lg text-white text-sm font-semibold transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.25)' }}
              >
                {loading ? <><Loader2Icon className="h-4 w-4 animate-spin" /> Updating…</> : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}