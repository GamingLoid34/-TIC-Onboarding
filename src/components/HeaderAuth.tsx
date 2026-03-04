"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export function HeaderAuth() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-3">
      {session ? (
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-medium text-gray-600 transition hover:text-otic-primary"
        >
          Logga ut
        </button>
      ) : (
        <Link
          href="/login"
          className="text-sm font-medium text-gray-600 transition hover:text-otic-primary"
        >
          Logga in
        </Link>
      )}
    </div>
  );
}
