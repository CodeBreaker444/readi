'use client'

import { supabase } from '@/lib/supabase/client'
import { Loader2Icon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function VerifyMFAPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)

  useEffect(() => { initializeMFA() }, [])

  const initializeMFA = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) throw factorsError
      if (!factors?.totp?.length) { router.push('/auth/setup-2fa'); return }

      setFactorId(factors.totp[0].id)
    } catch (err: any) {
      setError('Failed to initialize MFA verification')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId) { setError('MFA not properly initialized'); return }
    setLoading(true)
    setError(null)
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError || !challengeData) throw new Error('Failed to create challenge')

      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code })
      if (verifyError) throw verifyError

      document.cookie = 'mfa_verified=true; path=/; max-age=86400; samesite=strict'
      router.push('/dashboard')
    } catch (err: any) {
      setError('Invalid code. Please try again.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

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
            Verify it's<br />
            <span className="text-violet-600">really you.</span>
          </h1>

          <p className="text-slate-500 text-sm leading-relaxed mb-10 max-w-xs">
            Open your authenticator app and enter the 6-digit code to complete sign in to your ReADI account.
          </p>

          <div className="space-y-0">
            {[
              { label: 'Two-factor authentication', val: 'Enabled' },
              { label: 'Code refresh interval', val: '30 seconds' },
              { label: 'Session duration', val: '24 hours' },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-slate-200">
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-xs font-semibold text-slate-700">{val}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">All systems operational</span>
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Two-factor verification</h2>
              <p className="text-slate-400 text-sm">Enter the code from your authenticator app</p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Authentication code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000 000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full h-14 text-center text-2xl font-mono tracking-[0.4em] rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-150"
                />
                <p className="text-xs text-slate-400 mt-1.5 text-center">Code refreshes every 30 seconds</p>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full h-10 rounded-lg text-white text-sm font-semibold transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.25)' }}
              >
                {loading ? <><Loader2Icon className="h-4 w-4 animate-spin" /> Verifying…</> : 'Verify & sign in'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="w-full h-10 rounded-lg text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all duration-150 disabled:opacity-50"
              >
                Cancel  
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-6">
              Lost access to your app?{' '}
              <span className="text-slate-600 font-medium">Contact your administrator</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}