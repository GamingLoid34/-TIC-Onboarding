"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppRole, getDefaultRoute, normalizeRoles } from "@/lib/auth/roles";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoVisible, setLogoVisible] = useState(true);

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
        let target = redirectTo || "/mentor";
        try {
          const meRes = await fetch("/api/auth/me");
          if (meRes.ok) {
            const me = await meRes.json() as { roles?: AppRole[]; role?: AppRole };
            const roles = normalizeRoles(
              Array.isArray(me.roles) ? me.roles : me.role ? [me.role] : []
            );
            if (roles.length > 0) {
              target = redirectTo || getDefaultRoute(roles);
            }
          }
        } catch {
          /* fall back to target */
        }
        router.push(target);
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-center text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">ÖTIC-Onboarding</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
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
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
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
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-base transition focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-2xl bg-otic-primary py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-otic-primaryDark hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Loggar in…" : "Logga in"}
          </button>
        </form>
        {logoVisible && (
          <div className="mt-6 flex justify-center">
            <img
src="/logo.png"
            alt="ÖTIC"
            className="h-10 w-auto max-w-[140px] object-contain object-center opacity-75"
            onError={() => setLogoVisible(false)}
            />
          </div>
        )}
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
