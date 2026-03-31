"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppRole, buildNavItems } from "@/lib/auth/roles";
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

  // Lås body-scroll på mobil när menyn är öppen
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (pathname === "/login") return null;

  const visibleNavLinks = navLinks ?? [];

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white shadow-md backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2"
        >
          <span className="text-xl font-bold tracking-tight text-otic-primary sm:text-2xl">
            ÖTIC
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {visibleNavLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2 ${
                  active
                    ? "bg-otic-primary/10 text-otic-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {roles.length > 0 && (
            <Link
              href="/profile"
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2 ${
                isActive("/profile")
                  ? "bg-otic-primary/10 text-otic-primary"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              Inställningar
            </Link>
          )}
          <div className="ml-2 border-l border-gray-200 pl-2">
            <HeaderAuth />
          </div>
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

      {/* Mobilmeny renderas i body via portal så den alltid ligger ovanpå allt */}
      {typeof document !== "undefined" &&
        mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] md:hidden" role="dialog" aria-modal aria-label="Meny">
            <div
              className="absolute inset-0 bg-black/60"
              aria-hidden
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl">
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
                    Inställningar
                  </Link>
                )}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
