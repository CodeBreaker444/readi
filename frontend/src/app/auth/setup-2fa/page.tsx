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
  const [userId, setUserId] = useState<number | null>(null)

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

      const { data: userData } = await supabase
        .from('users')
        .select('user_id')
        .eq('auth_user_id', user.id)
        .single()

      if (userData) {
        setUserId(userData.user_id)
      }

      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      })

      if (enrollError) throw enrollError

      setFactorId(enrollData.id)
      setSecret(enrollData.totp.secret)
      setQrCode(enrollData.totp.qr_code)
    } catch (err: any) {
      console.error('MFA initialization error:', err)
      setError('Failed to initialize 2FA setup')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!factorId) {
      setError('2FA not properly initialized')
      return
    }

    if (!userId) {
      setError('User ID not found')
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

      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert([
          {
            fk_user_id: userId,
            setting_key: 'mfa_enabled',
            setting_value: 'true',
            setting_type: 'boolean',
            updated_at: new Date().toISOString()
          },
          {
            fk_user_id: userId,
            setting_key: 'mfa_setup_shown',
            setting_value: 'true',
            setting_type: 'boolean',
            updated_at: new Date().toISOString()
          }
        ], {
          onConflict: 'fk_user_id,setting_key'
        })

      if (settingsError) {
        console.error('Settings update error:', settingsError)
      }

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

  const handleSkip = async () => {
    if (!userId) {
      setError('User ID not found')
      return
    }

    setLoading(true)

    try {
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert([
          {
            fk_user_id: userId,
            setting_key: 'mfa_enabled',
            setting_value: 'false',
            setting_type: 'boolean',
            updated_at: new Date().toISOString()
          },
          {
            fk_user_id: userId,
            setting_key: 'mfa_setup_shown',
            setting_value: 'true',
            setting_type: 'boolean',
            updated_at: new Date().toISOString()
          }
        ], {
          onConflict: 'fk_user_id,setting_key'
        })

      if (settingsError) {
        console.error('Settings update error:', settingsError)
        throw settingsError
      }

      if (factorId) {
        try {
          await supabase.auth.mfa.unenroll({ factorId })
        } catch (unenrollError) {
          console.error('Unenroll error:', unenrollError)
        }
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Skip error:', err)
      setError('Failed to skip 2FA setup. Please try again.')
    } finally {
      setLoading(false)
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
              Set Up Two-Factor Authentication
            </h2>
            <p className="text-sm text-gray-600">
              Add an extra layer of security to your account
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-6">
            {qrCode ? (
              <>
                <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
                  <p className="text-sm text-blue-800">
                    <strong>How it works:</strong> Scan the QR code below with an authenticator app 
                    (Google Authenticator, Microsoft Authenticator, or Authy). The app will generate 
                    a new 6-digit code every 30 seconds that you'll use to log in.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>

                {secret && (
                  <div className="w-full">
                    <p className="text-xs text-gray-600 text-center mb-2">
                      Can't scan? Enter this code manually:
                    </p>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded text-black text-center break-all">
                      {secret}
                    </p>
                  </div>
                )}

                <form className="w-full" onSubmit={handleVerify}>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                        Enter the 6-digit code from your app
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        required
                        className="h-12 w-full text-center text-xl font-mono tracking-widest rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>

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
                      disabled={loading}
                      className="h-12 w-full rounded-lg border border-gray-300 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Processing...' : 'Skip for now'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-8 w-8 animate-spin text-gray-900" />
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/80">
          You can always enable 2FA later from your account settings
        </p>
      </div>
    </div>
  )
}