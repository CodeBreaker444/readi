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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50">
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
          <div className="flex flex-col items-center text-center">
            {status === 'loading' && (
              <>
                <Loader2Icon className="h-16 w-16 text-blue-600 animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Activating Your Account
                </h2>
                <p className="text-gray-600">Please wait while we activate your account...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Account Activated!
                </h2>
                {username && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 w-full">
                    <p className="text-sm text-green-800">
                      <strong>Username:</strong> {username}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => router.push(`/auth/login?activated=true&username=${username}`)}
                  className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Go to Login Now
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-red-600 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Activation Failed
                </h2>
                <div className="space-y-2 w-full">
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Go to Login
                  </button>
                  <p className="text-sm text-gray-500">
                    Need help? Contact your administrator
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}