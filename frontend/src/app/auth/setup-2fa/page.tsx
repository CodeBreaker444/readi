'use client'

import { supabase } from '@/src/lib/supabase'
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

      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      })

      if (enrollError) throw enrollError

      setFactorId(enrollData.id)
      setSecret(enrollData.totp.secret)

      const qrCodeUrl = enrollData.totp.qr_code
      setQrCode(qrCodeUrl)
    } catch (err: any) {
      setError('Failed to initialize 2FA setup')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!factorId) {
      setError('2FA not properly initialized')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: challengeData } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (!challengeData) throw new Error('Failed to create challenge')

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      })

      if (verifyError) throw verifyError

      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase
        .from('user_profiles')
        .update({ mfa_enabled: true })
        .eq('user_id', user?.id)

      router.push('/dashboard')
    } catch (err: any) {
      setError('Invalid code. Please try again.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase
      .from('user_profiles')
      .update({ mfa_enabled: false })
      .eq('user_id', user?.id)

    router.push('/dashboard')
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

      <div className="relative z-10 w-full max-w-md px-3">
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
              Set Up Two-Factor Authentication
            </h2>
            <p className="text-sm text-gray-600">
              Scan the QR code with your authenticator app
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-6">
            {qrCode && (
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
            )}

            {secret && (
              <div className="w-full">
                <p className="text-xs text-gray-600 text-center mb-2">
                  Or enter this code manually:
                </p>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded text-black text-center break-all">
                  {secret}
                </p>
              </div>
            )}

            <form className="w-full" onSubmit={handleVerify}>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  className="h-12 w-full text-center text-xl font-mono tracking-widest rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
                    'Enable 2FA'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  className="h-12 w-full rounded-lg border border-gray-300 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}