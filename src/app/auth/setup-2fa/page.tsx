'use client'

import { supabase } from '@/lib/supabase/client'
import { Loader2Icon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Setup2FAPage() {
  const router = useRouter()
  const [qrCode, setQrCode] = useState<string>('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [secret, setSecret] = useState<string>('')
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => { initializeMFA() }, [])

  const initializeMFA = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: userData } = await supabase.from('users').select('user_id').eq('auth_user_id', user.id).single()
      if (userData) setUserId(userData.user_id)

      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator App' })
      if (enrollError) throw enrollError

      setFactorId(enrollData.id)
      setSecret(enrollData.totp.secret)
      setQrCode(enrollData.totp.qr_code)
    } catch (err: any) {
      setError('Failed to initialize 2FA setup')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId || !userId) { setError('2FA not properly initialized'); return }
    setLoading(true)
    setError(null)
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeError || !challengeData) throw new Error('Failed to create challenge')

      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code })
      if (verifyError) throw verifyError

      await supabase.from('user_settings').upsert([
        { fk_user_id: userId, setting_key: 'mfa_enabled', setting_value: 'true', setting_type: 'boolean', updated_at: new Date().toISOString() },
        { fk_user_id: userId, setting_key: 'mfa_setup_shown', setting_value: 'true', setting_type: 'boolean', updated_at: new Date().toISOString() }
      ], { onConflict: 'fk_user_id,setting_key' })

      document.cookie = 'mfa_verified=true; path=/; max-age=604800; samesite=strict'
      router.push('/dashboard')
    } catch (err: any) {
      setError('Invalid code. Please try again.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!userId) { setError('User ID not found'); return }
    setLoading(true)
    try {
      await supabase.from('user_settings').upsert([
        { fk_user_id: userId, setting_key: 'mfa_enabled', setting_value: 'false', setting_type: 'boolean', updated_at: new Date().toISOString() },
        { fk_user_id: userId, setting_key: 'mfa_setup_shown', setting_value: 'true', setting_type: 'boolean', updated_at: new Date().toISOString() }
      ], { onConflict: 'fk_user_id,setting_key' })
      if (factorId) { try { await supabase.auth.mfa.unenroll({ factorId }) } catch {} }
      router.push('/dashboard')
    } catch (err: any) {
      setError('Failed to skip 2FA setup.')
    } finally {
      setLoading(false)
    }
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
            One more step.<br />
            <span className="text-violet-600">Secure</span> your login.
          </h1>

          <p className="text-slate-500 text-sm leading-relaxed mb-10 max-w-xs">
            Two-factor authentication adds an extra layer of protection to your account. Use any TOTP authenticator app to scan the QR code.
          </p>

          <div className="space-y-0">
            {[
              { step: '01', label: 'Install an authenticator app', sub: 'Google Authenticator, Authy, or similar' },
              { step: '02', label: 'Scan the QR code', sub: 'Or enter the secret key manually' },
              { step: '03', label: 'Enter the 6-digit code', sub: 'Verify and enable 2FA' },
            ].map(({ step, label, sub }) => (
              <div key={step} className="flex items-start gap-4 py-3 border-b border-slate-200">
                <span className="text-[0.65rem] font-bold text-violet-400 mt-0.5 shrink-0">{step}</span>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
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
              <h2 className="text-xl font-bold text-slate-900 mb-1">Set up 2FA</h2>
              <p className="text-slate-400 text-sm">Add an extra layer of security</p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {!qrCode ? (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-7 w-7 animate-spin text-violet-500" />
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-5">

                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 bg-white inline-flex">
                    <img src={qrCode} alt="QR Code" className="w-36 h-36" />
                  </div>
                  {secret && (
                    <div className="w-full">
                      <p className="text-xs text-slate-400 text-center mb-1.5">Can't scan? Enter manually:</p>
                      <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 text-center break-all select-all">
                        {secret}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">6-digit code from your app</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000 000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    className="w-full h-12 text-center text-xl font-mono tracking-[0.3em] rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all duration-150"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full h-10 rounded-lg text-white text-sm font-semibold transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.25)' }}
                >
                  {loading ? <><Loader2Icon className="h-4 w-4 animate-spin" /> Verifying…</> : 'Enable 2FA'}
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  className="w-full h-10 rounded-lg text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all duration-150 disabled:opacity-50"
                >
                  Skip for now
                </button>
              </form>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center mt-5">
            You can enable 2FA later from account settings
          </p>
        </div>
      </div>
    </div>
  )
}