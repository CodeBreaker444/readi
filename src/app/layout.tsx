import { Toaster } from "@/components/ui/sonner";
import { Bebas_Neue, Geist, Geist_Mono } from "next/font/google";
import ClientLayoutWrapper from "../components/ClientLayoutWrapper";
import { I18nProvider } from "../components/I18nProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { TimezoneProvider } from "../components/TimezoneProvider";
import { getUserSession } from "../lib/auth/server-session";
import "./globals.css";

export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
  display: 'swap',
});


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionPromise = getUserSession();
  const session = await sessionPromise;
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} antialiased`}>
        <ThemeProvider>
          <I18nProvider>
              <TimezoneProvider userTimezone={session?.user?.timezone}>
                <Toaster />
                <ClientLayoutWrapper sessionPromise={Promise.resolve(session)}>
                  {children}
                </ClientLayoutWrapper>
              </TimezoneProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}