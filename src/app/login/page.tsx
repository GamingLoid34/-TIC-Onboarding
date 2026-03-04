"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Fel e-post eller lösenord."
            : signInError.message
        );
        return;
      }
      if (data.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setError(
        "Inloggningen misslyckades. Kontrollera att Supabase Auth är konfigurerad."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Logga in</h1>
        <p className="mt-1 text-sm text-gray-500">Ötic Onboarding – Östgötatrafiken</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              E-post
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Lösenord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-otic-primary py-2.5 text-sm font-semibold text-white hover:bg-otic-primaryDark disabled:opacity-50"
          >
            {loading ? "Loggar in…" : "Logga in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-500">
          Skapa användare under Admin → Användare. Skapa samma e-post i Supabase →
          Authentication → Users och sätt lösenord för inloggning.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-gray-500">Laddar…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
