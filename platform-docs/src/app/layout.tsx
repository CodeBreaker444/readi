import { Layout } from '@/components/Layout'
import { Redirects } from '@/lib/redirects'
import '@/styles/page.css'
import '@/styles/tailwind.css'
import clsx from 'clsx'
import { type Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import Fathom from '../components/Fathom'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const lexend = localFont({
  src: '../fonts/lexend.woff2',
  display: 'swap',
  variable: '--font-lexend',
})

export const metadata: Metadata = {
   title: {
    template: '%s - DeepInspect3D',
    default: 'DeepInspect3D Platform',
  },
  description:
    'Help, tutorials & documentation for DeepInspect3D Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={clsx('h-full antialiased', inter.variable, lexend.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-full bg-white dark:bg-slate-900">
        <Fathom />
        <Redirects />
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  )
}
