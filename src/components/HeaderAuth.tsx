"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export function HeaderAuth() {
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

  if (!mounted) return null;

  if (session) return null;

  return (
    <Link
      href="/login"
      className="text-sm font-medium text-gray-600 transition hover:text-otic-primary"
    >
      Logga in
    </Link>
  );
}
