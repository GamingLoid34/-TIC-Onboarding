"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppRole, buildNavItems, ROLE_LABELS } from "@/lib/auth/roles";
import { HeaderAuth } from "./HeaderAuth";

export function AppHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navLinks, setNavLinks] = useState<{ href: string; label: string }[] | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    if (pathname === "/login") return;

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { roles?: AppRole[]; role?: AppRole } | null) => {
        const nextRoles = Array.isArray(data?.roles)
          ? data.roles
          : data?.role
            ? [data.role]
            : [];
        setRoles(nextRoles);
        setNavLinks(buildNavItems(nextRoles));
      })
      .catch(() => {
        setRoles([]);
        setNavLinks([]);
      });
  }, [pathname]);

  if (pathname === "/login") return null;

  const visibleNavLinks = navLinks ?? [];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2 rounded-lg"
        >
          <span className="text-lg font-semibold text-otic-primary sm:text-xl">
            Ötic Onboarding
          </span>
          <span className="hidden rounded-md bg-otic-primary/10 px-2 py-0.5 text-xs font-medium text-otic-primary sm:inline">
            Östgötatrafiken
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {visibleNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2 rounded"
            >
              {link.label}
            </Link>
          ))}
          {roles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
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
          {roles.length > 0 && (
            <Link
              href="/profile"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2 rounded"
            >
              Profil
            </Link>
          )}
          <HeaderAuth />
        </nav>

        {/* Mobile: hamburger + auth */}
        <div className="flex items-center gap-2 md:hidden">
          <HeaderAuth />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2"
            aria-label="Öppna meny"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile overlay menu */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-gray-200 bg-white shadow-xl md:hidden">
            <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
              <span className="font-semibold text-gray-900">Meny</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-otic-primary"
                aria-label="Stäng meny"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col p-4">
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium text-gray-700 transition-colors hover:bg-otic-primary/10 hover:text-otic-primary active:bg-otic-primary/15"
                >
                  {link.label}
                </Link>
              ))}
              {roles.length > 0 && (
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium text-gray-700 transition-colors hover:bg-otic-primary/10 hover:text-otic-primary active:bg-otic-primary/15"
                >
                  Profil
                </Link>
              )}
              {roles.length > 0 && (
                <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Roller</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-otic-primary/10 px-2.5 py-1 text-xs font-medium text-otic-primary"
                      >
                        {ROLE_LABELS[role]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
