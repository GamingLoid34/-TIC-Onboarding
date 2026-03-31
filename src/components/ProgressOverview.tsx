"use client";

import { BarChart3, Monitor, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppRole, hasAnyRole } from "@/lib/auth/roles";

type SystemStatus = "PENDING" | "ORDERED" | "READY";

interface SystemChecklistItem {
  systemName: string;
  status: SystemStatus;
}

interface Nyanstalld {
  id: string;
  name: string;
  startDate: string;
  totalTasks: number;
  completedVisad: number;
  completedKan: number;
  systems: SystemChecklistItem[];
}

function SystemStatusBadge({ status }: { status: SystemStatus }) {
  const styles = {
    PENDING: "bg-red-100 text-red-800",
    ORDERED: "bg-amber-100 text-amber-800",
    READY: "bg-emerald-100 text-emerald-800",
  };
  const labels = {
    PENDING: "Ej beställd",
    ORDERED: "Beställd",
    READY: "Klar",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ProgressBar({
  value,
  max,
  label,
  showPercent = true,
}: {
  value: number;
  max: number;
  label: string;
  showPercent?: boolean;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
        {showPercent && (
          <span className="font-semibold text-gray-900">
            {value} / {max} ({percent}%)
          </span>
        )}
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-otic-primary to-otic-accent transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 8,
  id = "ring",
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  id?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const dash = (clamped / 100) * circumference;
  const gradientId = `progressRingGradient-${id}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        strokeDashoffset={0}
        transform={`rotate(-90 ${cx} ${cy})`}
        className="transition-all duration-500"
      />
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const SYSTEM_STATUS_OPTIONS: { value: SystemStatus; label: string }[] = [
  { value: "PENDING", label: "Ej beställd" },
  { value: "ORDERED", label: "Beställd" },
  { value: "READY", label: "Klar" },
];

export function ProgressOverview({ mode }: { mode: "dashboard" | "chef" }) {
  const [roles, setRoles] = useState<AppRole[] | null>(null);
  const [nyanstallda, setNyanstallda] = useState<Nyanstalld[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
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

  const canView = useMemo(() => {
    if (!roles) return false;
    return hasAnyRole(roles, ["MENTOR", "ARBETSLEDARE", "ADMIN"]);
  }, [roles]);

  const canEditSystems = useMemo(() => {
    if (!roles) return false;
    return roles.includes("ARBETSLEDARE") || roles.includes("ADMIN");
  }, [roles]);

  useEffect(() => {
    if (!roles) return;
    if (!canView || (mode === "chef" && !roles.includes("ARBETSLEDARE") && !roles.includes("ADMIN"))) {
      setLoading(false);
      return;
    }

    fetch("/api/dashboard/nyanstallda")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data?.error as string) || "Kunde inte hämta data");
        return data;
      })
      .then((data: { nyanstallda: Nyanstalld[]; totalTasks: number }) => {
        setNyanstallda(data.nyanstallda);
        setTotalTasks(data.totalTasks);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roles, canView, mode]);

  const updateSystemStatus = (nyanstalldId: string, systemName: string, status: SystemStatus) => {
    fetch("/api/dashboard/systems", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nyanstalldId, systemName, status }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Kunde inte spara");
        setNyanstallda((prev) =>
          prev.map((person) =>
            person.id === nyanstalldId
              ? {
                  ...person,
                  systems: person.systems.map((system) =>
                    system.systemName === systemName ? { ...system, status } : system
                  ),
                }
              : person
          )
        );
      })
      .catch(() => setError("Kunde inte uppdatera IT-status"));
  };

  if (loading || roles === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-otic-primary border-t-transparent" aria-hidden />
      </div>
    );
  }

  if (!canView || (mode === "chef" && !roles.includes("ARBETSLEDARE") && !roles.includes("ADMIN"))) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Ingen behörighet</p>
        <p className="mt-1 text-red-700">
          Du har inte åtkomst till denna vy.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Fel</p>
        <p className="mt-1 text-red-700">{error}</p>
      </div>
    );
  }

  const totalVisad = nyanstallda.reduce((sum, person) => sum + person.completedVisad, 0);
  const totalKan = nyanstallda.reduce((sum, person) => sum + person.completedKan, 0);
  const maxTasks = nyanstallda.length * totalTasks || 1;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">
          {mode === "chef" ? "Chef" : "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          {mode === "chef"
            ? "Chefsvy för onboarding, framsteg och IT-status."
            : "Översikt över onboarding och IT-beställningar för nyanställda."}
        </p>
      </div>

      <section className="card-section">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:text-sm">
          <BarChart3 className="h-4 w-4" aria-hidden /> Övergripande framsteg
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-md sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Genomgången
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalVisad} / {maxTasks}
            </p>
            <ProgressBar value={totalVisad} max={maxTasks} label="" showPercent={false} />
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Behärskar
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {totalKan} / {maxTasks}
            </p>
            <ProgressBar value={totalKan} max={maxTasks} label="" showPercent={false} />
          </div>
          <div className="rounded-xl bg-white p-4 shadow-md sm:col-span-2 sm:p-5 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nyanställda</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {nyanstallda.length}
            </p>
            <p className="text-xs text-gray-500">aktiva i onboarding</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 sm:space-y-6">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:text-sm">
          <Users className="h-4 w-4" aria-hidden /> Nyanställda – framsteg och IT-status
        </h2>
        {nyanstallda.length === 0 ? (
          <p className="text-gray-500">
            Inga nyanställda.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nyanstallda.map((person) => {
                const visadPercent =
                  person.totalTasks > 0
                    ? Math.round((person.completedVisad / person.totalTasks) * 100)
                    : 0;
                const kanPercent =
                  person.totalTasks > 0
                    ? Math.round((person.completedKan / person.totalTasks) * 100)
                    : 0;

                return (
                  <article
                    key={person.id}
                    className="card-touch flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:border-otic-primary/30 hover:shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPersonId(person.id)}
                      className="flex flex-col items-center gap-4 p-6 text-left focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-inset"
                    >
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <ProgressRing id={person.id} percent={kanPercent} size={100} strokeWidth={10} />
                          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900">
                            {kanPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full min-w-0">
                        <h3 className="truncate text-lg font-bold text-gray-900">{person.name}</h3>
                        <p className="mt-0.5 text-xs uppercase tracking-wider text-gray-500">Start {person.startDate}</p>
                        <p className="mt-2 text-sm text-gray-600">
                          {visadPercent}% Genomgången · {kanPercent}% Behärskar
                        </p>
                      </div>
                    </button>
                    <div className="border-t border-gray-100 bg-gray-50/80 p-4" onClick={(e) => e.stopPropagation()}>
                      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <Monitor className="h-3.5 w-3.5" aria-hidden /> IT-system (status)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {person.systems.map((system) => (
                          <div
                            key={system.systemName}
                            className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-sm"
                          >
                            <span className="text-sm font-medium text-gray-800">
                              {system.systemName}
                            </span>
                            {canEditSystems ? (
                              <select
                                value={system.status}
                                onChange={(e) =>
                                  updateSystemStatus(
                                    person.id,
                                    system.systemName,
                                    e.target.value as SystemStatus
                                  )
                                }
                                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
                              >
                                {SYSTEM_STATUS_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <SystemStatusBadge status={system.status} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {selectedPersonId && (() => {
              const person = nyanstallda.find((p) => p.id === selectedPersonId);
              if (!person) return null;
              return (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="modal-title"
                  onClick={() => setSelectedPersonId(null)}
                >
                  <div
                    className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
                      <h2 id="modal-title" className="text-lg font-bold text-gray-900">{person.name}</h2>
                      <button
                        type="button"
                        onClick={() => setSelectedPersonId(null)}
                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-otic-primary"
                        aria-label="Stäng"
                      >
                        <X className="h-5 w-5" aria-hidden />
                      </button>
                    </div>
                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="flex items-center gap-4">
                        <ProgressRing id={`modal-${person.id}`} percent={person.totalTasks > 0 ? Math.round((person.completedKan / person.totalTasks) * 100) : 0} size={80} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Start {person.startDate}</p>
                          <p className="text-sm text-gray-600">
                            {person.completedVisad} / {person.totalTasks} Genomgången · {person.completedKan} / {person.totalTasks} Behärskar
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <ProgressBar value={person.completedVisad} max={person.totalTasks} label="Genomgången" />
                        <ProgressBar value={person.completedKan} max={person.totalTasks} label="Behärskar" />
                      </div>
                      <div>
                        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          <Monitor className="h-3.5 w-3.5" aria-hidden /> IT-system (status)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {person.systems.map((system) => (
                            <div
                              key={system.systemName}
                              className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5"
                            >
                              <span className="text-sm font-medium text-gray-800">
                                {system.systemName}
                              </span>
                              {canEditSystems ? (
                                <select
                                  value={system.status}
                                  onChange={(e) =>
                                    updateSystemStatus(
                                      person.id,
                                      system.systemName,
                                      e.target.value as SystemStatus
                                    )
                                  }
                                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
                                >
                                  {SYSTEM_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <SystemStatusBadge status={system.status} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </section>
    </div>
  );
}
