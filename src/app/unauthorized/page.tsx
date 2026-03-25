'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 border border-slate-200 dark:border-slate-700">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #7c3aed22, #5b21b622)' }}
          >
            <svg
              className="w-8 h-8 text-violet-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5a4 4 0 100-8 4 4 0 000 8z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 11V7a5 5 0 00-10 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"
              />
            </svg>
          </div>

          <h1
            className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            Access Denied
          </h1>
          <p
            className="text-slate-500 dark:text-slate-400 mb-8"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.9rem' }}
          >
            You do not have permission to view this page. Please contact your administrator
            if you believe this is an error.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.85rem', fontWeight: 500 }}
            >
              Go Back
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 rounded-lg text-white transition-colors"
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '0.85rem',
                fontWeight: 500,
                background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
