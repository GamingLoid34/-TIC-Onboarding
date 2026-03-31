import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ÖTIC",
  description: "Onboarding av nya medarbetare på trafikledningscentralen",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans bg-gray-50 text-gray-900 antialiased">
        <AppHeader />
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 safe-area-padding">
          {children}
        </main>
      </body>
    </html>
  );
}
