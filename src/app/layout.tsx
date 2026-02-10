import { Geist, Geist_Mono } from "next/font/google";
import ClientLayoutWrapper from "../components/ClientLayoutWrapper";
import { ThemeProvider } from "../components/ThemeProvider";
import { getUserSession } from "../lib/auth/server-session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getUserSession();
  const role = session?.user?.role ?? null;
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ClientLayoutWrapper role={role}>
            {children}
          </ClientLayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}