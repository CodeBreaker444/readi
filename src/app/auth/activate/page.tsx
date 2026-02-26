'use client';

import { CheckCircle, Loader2Icon, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ActivatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const activateAccount = async () => {
      const activationKey = searchParams.get('id');
      const email = searchParams.get('email');
      const usernameParam = searchParams.get('username');
      const ownerId = searchParams.get('o');

      if (!activationKey || !email || !usernameParam) {
        setStatus('error');
        toast.error('Invalid activation link. Please contact your administrator.');
        return;
      }

      setUsername(usernameParam);

      try {
        const response = await fetch('/api/auth/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: activationKey,
            email: email,
            username: usernameParam,
            o: ownerId,
          }),
        });

        const data = await response.json();

        if (data.code === 1) {
          setStatus('success');
          toast.success('Your account has been activated successfully!');

          setTimeout(() => {
            router.push(`/auth/login?activated=true&username=${usernameParam}`);
          }, 3000);
        } else {
          setStatus('error');
          toast.error(data.message || 'Activation failed. The link may have expired or already been used.');
        }
      } catch (error) {
        console.error('Activation error:', error);
        setStatus('error');
        toast.error('An error occurred during activation. Please try again or contact administrator.');
      }
    };

    activateAccount();
  }, [searchParams, router]);

 return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white">
      <div className="absolute inset-0 z-0">
        <Image
          src="/readi_login.png"
          alt="Background"
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-violet-950/60" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-indigo-500/8 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo-sm.png"
            alt="ReADI logo"
            width={160}
            height={48}
            className="h-12 w-auto"
          />
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className={`h-0.5 w-full ${
            status === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
            : status === 'error'  ? 'bg-gradient-to-r from-red-500 to-rose-400'
            :                       'bg-gradient-to-r from-violet-500 to-indigo-400'
          }`} />

          <div className="p-8 flex flex-col items-center text-center">

            {status === 'loading' && (
              <>
                <div className="relative mb-6">
                  <div className="h-20 w-20 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Loader2Icon className="h-9 w-9 text-violet-400 animate-spin" />
                  </div>
                  <span className="absolute inset-0 rounded-full border border-violet-400/30 animate-ping" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
                  Activating your account
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Please hold on while we verify your activation link…
                </p>
                <div className="flex gap-1.5 mt-5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="relative mb-6">
                  <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="h-9 w-9 text-emerald-400" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-white mb-1 tracking-tight">
                  Account activated!
                </h2>
                <p className="text-sm text-slate-400 mb-5">
                  Welcome aboard. You're all set to get started.
                </p>

                {username && (
                  <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 mb-5 text-left">
                    <p className="text-xs text-emerald-400/70 mb-0.5 uppercase tracking-widest font-medium">Username</p>
                    <p className="text-sm font-semibold text-emerald-300">{username}</p>
                  </div>
                )}

                <div className="w-full space-y-3">
                  <button
                    onClick={() => router.push(`/auth/login?activated=true&username=${username}`)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                  >
                    Continue to Login
                  </button>
                  <p className="text-xs text-slate-500">
                    Redirecting automatically in 3 seconds…
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="relative mb-6">
                  <div className="h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <XCircle className="h-9 w-9 text-red-400" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-white mb-1 tracking-tight">
                  Activation failed
                </h2>
                <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                  This link may have expired or already been used. Contact your administrator for a new link.
                </p>

                <div className="w-full space-y-2.5">
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-white text-sm font-medium transition-all duration-200 active:scale-[0.98]"
                  >
                    Go to Login
                  </button>
                  <p className="text-xs text-slate-500">
                    Need help? Contact your administrator
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} ReADI. All rights reserved.
        </p>
      </div>
    </div>
  );
}