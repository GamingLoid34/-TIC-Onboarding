"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppRole, ROLE_LABELS } from "@/lib/auth/roles";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setLoading(false);
    });

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { roles?: AppRole[]; role?: AppRole } | null) => {
        const nextRoles = Array.isArray(data?.roles)
          ? data.roles
          : data?.role
            ? [data.role]
            : [];
        setRoles(nextRoles);
      })
      .catch(() => setRoles([]));
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="card-section">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Inställningar
        </h1>
        <p className="mt-3 text-sm text-gray-500">Inloggad som</p>
        <p className="mt-1 font-medium text-gray-900">
          {loading ? "…" : email ?? "Ej inloggad"}
        </p>
        {roles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-otic-primary/10 px-2.5 py-1 text-xs font-medium text-otic-primary"
              >
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        )}
      </div>

      {roles.includes("ADMIN") && (
        <Link
          href="/admin/tasks"
          className="block rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50"
        >
          Admin
        </Link>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="min-h-[48px] rounded-xl bg-otic-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-otic-primaryDark"
      >
        Logga ut
      </button>
    </div>
  );
}
