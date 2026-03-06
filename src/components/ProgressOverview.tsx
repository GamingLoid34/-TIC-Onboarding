"use client";

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
    PENDING: "bg-status-red/15 text-status-red border-status-red/30",
    ORDERED: "bg-status-yellow/15 text-yellow-800 border-status-yellow/30",
    READY: "bg-status-green/15 text-status-green border-status-green/30",
  };
  const labels = {
    PENDING: "Ej beställd",
    ORDERED: "Beställd",
    READY: "Klar",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
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
        <span className="font-medium text-gray-700">{label}</span>
        {showPercent && (
          <span className="text-gray-500">
            {value} / {max} ({percent}%)
          </span>
        )}
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-otic-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
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
      .then((res) => {
        if (!res.ok) throw new Error("Kunde inte hämta data");
        return res.json();
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
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">
          Övergripande framsteg
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-gray-50/80 p-4 sm:p-5">
            <p className="text-sm font-medium text-gray-600">
              Totalt antal moment (Genomgången)
            </p>
            <p className="mt-1 text-2xl font-bold text-otic-primary">
              {totalVisad} / {maxTasks}
            </p>
            <ProgressBar value={totalVisad} max={maxTasks} label="" showPercent={false} />
          </div>
          <div className="rounded-xl bg-gray-50/80 p-4 sm:p-5">
            <p className="text-sm font-medium text-gray-600">
              Totalt antal moment (Behärskar)
            </p>
            <p className="mt-1 text-2xl font-bold text-otic-primary">
              {totalKan} / {maxTasks}
            </p>
            <ProgressBar value={totalKan} max={maxTasks} label="" showPercent={false} />
          </div>
          <div className="rounded-xl bg-gray-50/80 p-4 sm:col-span-2 sm:p-5 lg:col-span-1">
            <p className="text-sm font-medium text-gray-600">Nyanställda</p>
            <p className="mt-1 text-2xl font-bold text-otic-primary">
              {nyanstallda.length}
            </p>
            <p className="text-sm text-gray-500">aktiva i onboarding</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 sm:space-y-6">
        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
          Nyanställda – framsteg och IT-status
        </h2>
        {nyanstallda.length === 0 ? (
          <p className="text-gray-500">
            Inga nyanställda i databasen. Kör <code className="rounded bg-gray-100 px-1">npm run db:seed</code>.
          </p>
        ) : (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
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
                <article key={person.id} className="card-touch flex flex-col overflow-hidden p-0">
                  <div className="border-b border-gray-100 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{person.name}</h3>
                      <span className="text-sm text-gray-500">Start {person.startDate}</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      <ProgressBar value={person.completedVisad} max={person.totalTasks} label="Genomgången" />
                      <ProgressBar value={person.completedKan} max={person.totalTasks} label="Behärskar" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-otic-primary/15 px-2.5 py-1 text-xs font-medium text-otic-primary">
                        {visadPercent}% Genomgången
                      </span>
                      <span className="rounded-full bg-otic-accent/20 px-2.5 py-1 text-xs font-medium text-otic-primary">
                        {kanPercent}% Behärskar
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50/80 p-4 sm:p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      IT-system
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {person.systems.map((system) => (
                        <div
                          key={system.systemName}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm"
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
        )}
      </section>
    </div>
  );
}
