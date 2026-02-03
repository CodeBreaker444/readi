import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import ClientLayoutWrapper from "../components/ClientLayoutWrapper";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// export const metadata: Metadata = {
//   title: "ReADI - Drone Control Center",
//   description: "Professional Drone Control Center Dashboard",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}