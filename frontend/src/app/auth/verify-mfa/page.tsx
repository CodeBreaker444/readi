'use client'

import { supabase } from '@/src/lib/supabase/client'
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

  useEffect(() => {
    initializeMFA()
  }, [])

  const initializeMFA = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()

      if (factorsError) throw factorsError

      if (!factors || !factors.totp || factors.totp.length === 0) {
        router.push('/auth/setup-2fa')
        return
      }

      const totpFactor = factors.totp[0]
      setFactorId(totpFactor.id)
    } catch (err: any) {
      console.error('MFA initialization error:', err)
      setError('Failed to initialize MFA verification')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!factorId) {
      setError('MFA not properly initialized')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (challengeError || !challengeData) {
        throw new Error('Failed to create challenge')
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      })

      if (verifyError) throw verifyError

      document.cookie = 'mfa_verified=true; path=/; max-age=86400; samesite=strict'

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Verification error:', err)
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
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Two-Factor Authentication
            </h2>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <form className="w-full" onSubmit={handleVerify}>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                autoFocus
                className="h-14 w-full text-center text-2xl font-mono tracking-widest rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="h-12 w-full rounded-lg bg-gray-900 text-base font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify'
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="h-12 w-full rounded-lg border border-gray-300 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel & Sign Out
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Lost access to your authenticator app?
              <br />
              Contact your administrator for help.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}