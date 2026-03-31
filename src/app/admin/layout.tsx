"use client";

import { ListTodo, Monitor, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppRole } from "@/lib/auth/roles";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { roles?: AppRole[]; role?: AppRole } | null) => {
        const next = Array.isArray(data?.roles)
          ? data.roles
          : data?.role
            ? [data.role]
            : [];
        setRoles(next);
      })
      .catch(() => setRoles([]));
  }, []);

  const showFullAdmin = roles.includes("ADMIN");

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-3 border-b border-gray-100 pb-4">
        <Link
          href="/admin/tasks"
          className="min-h-[44px] flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-otic-primary touch-manipulation"
        >
          <ListTodo className="h-4 w-4" aria-hidden /> Uppgifter
        </Link>
        {showFullAdmin && (
          <>
            <Link
              href="/admin/users"
              className="min-h-[44px] flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-otic-primary touch-manipulation"
            >
              <Users className="h-4 w-4" aria-hidden /> Användare
            </Link>
            <Link
              href="/admin/systems"
              className="min-h-[44px] flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-otic-primary touch-manipulation"
            >
              <Monitor className="h-4 w-4" aria-hidden /> Program
            </Link>
          </>
        )}
      </nav>
      {children}
    </div>
  );
}
