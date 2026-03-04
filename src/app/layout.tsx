import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ötic Onboarding – Östgötatrafiken",
  description: "Onboarding av nya medarbetare på trafikledningscentralen",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans bg-gray-50/80 text-gray-900 antialiased">
        <AppHeader />
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 safe-area-padding">
          {children}
        </main>
      </body>
    </html>
  );
}
