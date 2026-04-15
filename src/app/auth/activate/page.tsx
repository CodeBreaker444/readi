'use client'

import { CheckCircle, Loader2Icon, XCircle } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function ActivatePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [username, setUsername] = useState('')

  useEffect(() => {
    const activateAccount = async () => {
      const activationKey = searchParams.get('id')
      const email = (searchParams.get('email') ?? '').replace(/ /g, '+') || null
      const usernameParam = searchParams.get('username')
      const ownerId = searchParams.get('o')

      if (!activationKey || !email || !usernameParam) {
        setStatus('error')
        toast.error('Invalid activation link. Please contact your administrator.')
        return
      }

      setUsername(usernameParam)

      try {
        const response = await fetch('/api/auth/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activationKey, email, username: usernameParam, o: ownerId }),
        })

        const data = await response.json()

        if (data.code === 1) {
          setStatus('success')
          toast.success('Your account has been activated successfully!')
          setTimeout(() => router.push(`/auth/login?activated=true&username=${usernameParam}`), 3000)
        } else {
          setStatus('error')
          toast.error(data.message || 'Activation failed.')
        }
      } catch (error) {
        setStatus('error')
        toast.error('An error occurred during activation.')
      }
    }

    activateAccount()
  }, [searchParams, router])

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
            Almost there.<br />
            <span className="text-violet-600">Activating</span> your account.
          </h1>

          <p className="text-slate-500 text-sm leading-relaxed mb-10 max-w-xs">
            Your account is being verified and activated. You'll be ready to access the ReADI control center shortly.
          </p>

          <div className="flex items-center gap-2">
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

            {status === 'loading' && (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                  <Loader2Icon className="h-7 w-7 text-violet-600 animate-spin" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Activating account</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  Please hold on while we verify your activation link…
                </p>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
                  <CheckCircle className="h-7 w-7 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Account activated!</h2>
                <p className="text-sm text-slate-400 mb-6">Welcome aboard. You're all set to get started.</p>

                {username && (
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-5 text-left">
                    <p className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Username</p>
                    <p className="text-sm font-semibold text-slate-700">{username}</p>
                  </div>
                )}

                <button
                  onClick={() => router.push(`/auth/login?activated=true&username=${username}`)}
                  className="w-full h-10 rounded-lg text-white text-sm font-semibold transition-all duration-150 active:scale-[0.99] flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.25)' }}
                >
                  Continue to login
                </button>
                <p className="text-xs text-slate-400 mt-3">Redirecting automatically in 3 seconds…</p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>
                  <XCircle className="h-7 w-7 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Activation failed</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  This link may have expired or already been used. Contact your administrator for a new link.
                </p>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full h-10 rounded-lg text-white text-sm font-semibold transition-all duration-150 active:scale-[0.99] flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.25)' }}
                >
                  Go to login
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center mt-5">
            © {new Date().getFullYear()} ReADI. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}