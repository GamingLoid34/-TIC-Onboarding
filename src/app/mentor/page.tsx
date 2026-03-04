"use client";

import { useCallback, useEffect, useState } from "react";

type SystemStatus = "PENDING" | "ORDERED" | "READY";

interface SystemChecklistItem {
  systemName: string;
  status: SystemStatus;
}

interface Nyanstalld {
  id: string;
  name: string;
  systems: SystemChecklistItem[];
}

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  tasks: Task[];
}

interface SubTask {
  id: string;
  title: string;
  url: string | null;
  sortOrder: number;
}

interface Task {
  id: string;
  title: string;
  categoryId: string;
  requiredSystemName: string | null;
  sortOrder: number;
  subTasks?: SubTask[];
}

interface TaskProgressState {
  isVisad: boolean;
  isKan: boolean;
  notes: string;
}

function SystemStatusBadge({ status }: { status: SystemStatus }) {
  const styles = {
    PENDING: "bg-status-red/15 text-status-red border-status-red/30",
    ORDERED: "bg-status-yellow/15 text-yellow-800 border-status-yellow/30",
    READY: "bg-status-green/15 text-status-green border-status-green/30",
  };
  const labels = { PENDING: "Ej beställd", ORDERED: "Beställd", READY: "Klar" };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function MentorPage() {
  const [nyanstallda, setNyanstallda] = useState<Nyanstalld[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedNyanstalldId, setSelectedNyanstalldId] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [progress, setProgress] = useState<Record<string, TaskProgressState>>({});
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTasks = categories.flatMap((c) => c.tasks);

  useEffect(() => {
    Promise.all([
      fetch("/api/mentor/nyanstallda").then((r) => (r.ok ? r.json() : Promise.reject(new Error("Nyanställda")))),
      fetch("/api/mentor/categories").then((r) => (r.ok ? r.json() : Promise.reject(new Error("Kategorier")))),
    ])
      .then(([nyanstalldaData, categoriesData]) => {
        setNyanstallda(nyanstalldaData);
        setCategories(categoriesData);
        if (nyanstalldaData.length > 0 && !selectedNyanstalldId) {
          setSelectedNyanstalldId(nyanstalldaData[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fetchProgress = useCallback(async (nyanstalldId: string) => {
    setLoadingProgress(true);
    try {
      const res = await fetch(`/api/mentor/progress?nyanstalldId=${encodeURIComponent(nyanstalldId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const next: Record<string, TaskProgressState> = {};
      data.forEach((p: { taskId: string; isVisad: boolean; isKan: boolean; notes: string }) => {
        next[p.taskId] = { isVisad: p.isVisad, isKan: p.isKan, notes: p.notes ?? "" };
      });
      setProgress(next);
    } finally {
      setLoadingProgress(false);
    }
  }, []);

  useEffect(() => {
    if (selectedNyanstalldId) fetchProgress(selectedNyanstalldId);
  }, [selectedNyanstalldId, fetchProgress]);

  const saveProgress = useCallback(
    async (taskId: string, upd: Partial<TaskProgressState>) => {
      if (!selectedNyanstalldId) return;
      setProgress((prev) => ({
        ...prev,
        [taskId]: { ...(prev[taskId] ?? { isVisad: false, isKan: false, notes: "" }), ...upd },
      }));
      try {
        await fetch("/api/mentor/progress", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nyanstalldId: selectedNyanstalldId,
            taskId,
            ...upd,
          }),
        });
      } catch {
        // Rollback on error if desired
      }
    },
    [selectedNyanstalldId]
  );

  const selectedNyanstalld = nyanstallda.find((n) => n.id === selectedNyanstalldId);
  const filteredTasks = categoryFilter
    ? allTasks.filter((t) => t.categoryId === categoryFilter)
    : allTasks;
  const tasksByCategory = categories.map((cat) => ({
    ...cat,
    tasks: filteredTasks.filter((t) => t.categoryId === cat.id),
  })).filter((g) => g.tasks.length > 0);

  const getProgress = (taskId: string): TaskProgressState =>
    progress[taskId] ?? { isVisad: false, isKan: false, notes: "" };

  const setTaskProgress = (taskId: string, upd: Partial<TaskProgressState>) => {
    setProgress((prev) => ({
      ...prev,
      [taskId]: { ...getProgress(taskId), ...upd },
    }));
    if ("isVisad" in upd || "isKan" in upd) saveProgress(taskId, upd);
  };

  const isSystemReady = (systemName: string) =>
    selectedNyanstalld?.systems.find((s) => s.systemName === systemName)?.status === "READY";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">Hämtar data från databasen…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Fel</p>
        <p className="mt-1 text-red-700">{error}</p>
        <p className="mt-2 text-sm text-red-600">
          Kontrollera att databasen är nåbar (DATABASE_URL) och att du körtt db:push och db:seed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Mentorvy
        </h1>
        <p className="mt-1 text-gray-600">
          Checklistor, Genomgången/Behärskar och anteckningar per nyanställd
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {allTasks.length} moment i {categories.length} kategorier. Använd filtret för att begränsa vy.
        </p>
      </div>

      {/* Välj nyanställd */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Nyanställd
        </h2>
        {nyanstallda.length === 0 ? (
          <p className="text-gray-500">Inga nyanställda i databasen. Kör db:seed för testdata.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nyanstallda.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedNyanstalldId(n.id)}
                className={`min-h-[44px] rounded-xl border-2 px-4 py-2.5 text-left font-medium transition touch-manipulation sm:min-h-0 ${
                  selectedNyanstalldId === n.id
                    ? "border-otic-primary bg-otic-primary/10 text-otic-primary"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {n.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedNyanstalld && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            IT-system (status)
          </h2>
          <div className="flex flex-wrap gap-2">
            {selectedNyanstalld.systems.map((s) => (
              <div
                key={s.systemName}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5"
              >
                <span className="text-sm font-medium text-gray-800">{s.systemName}</span>
                <SystemStatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Filtrera moment
        </h2>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full min-h-[44px] max-w-sm rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-700 shadow-sm focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
        >
          <option value="">Alla kategorier</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>

      {loadingProgress && (
        <p className="text-sm text-gray-500">Hämtar checklista…</p>
      )}

      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Moment</h2>
        {tasksByCategory.length === 0 ? (
          <p className="text-gray-500">Inga moment. Kör db:seed för att lägga in uppgifter.</p>
        ) : (
          tasksByCategory.map((group) => (
            <div key={group.id} className="space-y-3">
              <h3 className="text-base font-medium text-otic-primary">{group.name}</h3>
              <ul className="space-y-3">
                {group.tasks.map((task) => {
                  const prog = getProgress(task.id);
                  const systemLock = task.requiredSystemName && !isSystemReady(task.requiredSystemName);
                  return (
                    <li
                      key={task.id}
                      className={`card-touch overflow-hidden ${systemLock ? "opacity-75" : ""}`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-medium text-gray-900">{task.title}</p>
                          {task.requiredSystemName && (
                            <span className="text-xs text-gray-500">
                              Kräver: {task.requiredSystemName}
                              {systemLock && " (ej klar)"}
                            </span>
                          )}
                        </div>

                        {(task.subTasks?.length ?? 0) > 0 && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Länkar till rutiner (SharePoint)
                            </p>
                            <ul className="space-y-1.5">
                              {task.subTasks!.map((st) => (
                                <li key={st.id}>
                                  {st.url ? (
                                    <a
                                      href={st.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm text-otic-primary hover:underline"
                                    >
                                      <span className="font-medium">{st.title}</span>
                                      <span aria-hidden>↗</span>
                                    </a>
                                  ) : (
                                    <span className="text-sm text-gray-600">{st.title}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-6">
                          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 touch-manipulation">
                            <input
                              type="checkbox"
                              checked={prog.isVisad}
                              onChange={(e) => setTaskProgress(task.id, { isVisad: e.target.checked })}
                              className="h-5 w-5 rounded border-gray-300 text-otic-primary focus:ring-otic-primary"
                            />
                            <span className="font-medium text-gray-700">Genomgången</span>
                          </label>
                          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 touch-manipulation">
                            <input
                              type="checkbox"
                              checked={prog.isKan}
                              onChange={(e) => setTaskProgress(task.id, { isKan: e.target.checked })}
                              className="h-5 w-5 rounded border-gray-300 text-otic-primary focus:ring-otic-primary"
                            />
                            <span className="font-medium text-gray-700">Behärskar</span>
                          </label>
                        </div>

                        <div className="mt-3">
                          <label htmlFor={`notes-${task.id}`} className="sr-only">
                            Anteckningar för {task.title}
                          </label>
                          <textarea
                            id={`notes-${task.id}`}
                            placeholder="Anteckningar (t.ex. behöver öva mer…)"
                            value={prog.notes}
                            onChange={(e) => setProgress((prev) => ({ ...prev, [task.id]: { ...getProgress(task.id), notes: e.target.value } }))}
                            onBlur={(e) => saveProgress(task.id, { notes: e.target.value })}
                            rows={2}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
