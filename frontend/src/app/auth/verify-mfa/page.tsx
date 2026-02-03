'use client'

import { supabase } from '@/src/lib/supabase'
import { Loader2Icon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function VerifyMFAPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)

  useEffect(() => {
    initializeMFA()
  }, [])

  const initializeMFA = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      
      if (!factors || !factors.totp || factors.totp.length === 0) {
        router.push('/dashboard')
        return
      }

      const factor = factors.totp[0]
      setFactorId(factor.id)

      const { data: challenge } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      })

      if (challenge) {
        setChallengeId(challenge.id)
      }
    } catch (err: any) {
      setError('Failed to initialize MFA. Please try logging in again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!factorId || !challengeId) {
      setError('MFA not properly initialized')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      })

      if (verifyError) throw verifyError

      router.push('/dashboard')
    } catch (err: any) {
      setError('Invalid code. Please try again.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
  }

  return (
 <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
  {/* Background Image with Overlay */}
  <div className="absolute inset-0 z-0">
    <Image
      src="/control-center-bg.jpg"
      alt="Control Center Background"
      fill
      className="object-cover"
      priority
    />
    <div className="absolute inset-0 bg-gray-900/50"></div>
  </div>

  {/* MFA Form */}
  <div className="relative z-10 w-full max-w-100 px-3">
    {/* Logo */}
    <div className="mb-8 flex flex-col items-center justify-center gap-4">
      <Image 
        src="/logo.png"
        alt="ReADI logo" 
        width={200} 
        height={60} 
        className="h-16 w-auto" 
      />
    </div>

    {/* MFA Card */}
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-8">
      <form className="w-full" onSubmit={handleSubmit}>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-base text-gray-600">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Code Input */}
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="000000"
              value={code}
              onChange={handleChange}
              maxLength={6}
              required
              className="h-14 w-full text-center text-2xl font-mono tracking-widest rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Submit Button */}
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

          {/* Back to login */}
          <div className="text-center text-sm">
            <Link 
              href="/auth/login" 
              className="text-gray-600 hover:text-gray-900 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>
  )
}