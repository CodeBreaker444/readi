import { Geist, Geist_Mono } from "next/font/google";
import ClientLayoutWrapper from "../components/ClientLayoutWrapper";
import { ThemeProvider } from "../components/ThemeProvider";
import { getRoleFromCookie } from "../lib/auth/server-auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Uncomment and configure metadata as needed
// export const metadata: Metadata = {
//   title: "ReADI - Drone Control Center",
//   description: "Professional Drone Control Center Dashboard",
// };

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const role = await getRoleFromCookie();
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