'use client'

import { ArrowLeftIcon, HomeIcon, SearchIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-50 z-50"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, #ede9fe 0%, transparent 70%)', opacity: 0.5 }}
        />
        <div
          className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, #ede9fe 0%, transparent 70%)', opacity: 0.4 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-6 flex flex-col items-center">
        <div className="flex items-center gap-2.5 mb-12">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
          >
            <Image
              src="/logo-sm.png"
              alt="ReADI"
              width={18}
              height={18}
              className="object-contain brightness-0 invert"
            />
          </div>
          <div>
            <p className="text-slate-900 font-bold text-sm leading-none">ReADI</p>
            <p className="text-slate-400 text-[0.55rem] tracking-[0.16em] uppercase mt-0.5">
              Drone Control
            </p>
          </div>
        </div>

        <div className=" rounded-2xl p-8 w-full text-center  ">
          <div className="mb-6">
            <p className="text-7xl font-extrabold tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-br from-violet-600 to-violet-700">
              404
            </p>
          </div>

          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center">
              <SearchIcon className="h-5 w-5 text-violet-500" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">Page not found</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved to a different route.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 cursor-pointer h-10 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all duration-150 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Go back
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 cursor-pointer h-10 rounded-lg text-white text-sm font-semibold transition-all duration-150 active:scale-[0.99] flex items-center justify-center gap-2 bg-gradient-to-br from-violet-600 to-violet-700 shadow-[0_2px_12px_rgba(124,58,237,0.25)]"
            >
              <HomeIcon className="h-4 w-4" />
              Home
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-8">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-400">All systems operational</span>
        </div>
      </div>
    </div>
  )
}