import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { HeaderAuth } from "@/components/HeaderAuth";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-semibold text-otic-primary">
                Ötic Onboarding
              </span>
              <span className="hidden rounded bg-otic-primary/10 px-2 py-0.5 text-xs font-medium text-otic-primary sm:inline">
                Östgötatrafiken
              </span>
            </a>
            <nav className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="text-sm font-medium text-gray-600 transition hover:text-otic-primary"
              >
                Dashboard
              </a>
              <a
                href="/mentor"
                className="text-sm font-medium text-gray-600 transition hover:text-otic-primary"
              >
                Mentor
              </a>
              <a
                href="/admin/tasks"
                className="text-sm font-medium text-gray-600 transition hover:text-otic-primary"
              >
                Admin
              </a>
              <span className="rounded-full bg-otic-primary/15 px-3 py-1 text-xs font-medium text-otic-primary">
                Arbetsledare
              </span>
              <HeaderAuth />
            </nav>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
