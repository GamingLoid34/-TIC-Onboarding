"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Link2, ListChecks, Monitor, Users } from "lucide-react";
import { AppRole, hasAnyRole } from "@/lib/auth/roles";

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
    PENDING: "bg-red-100 text-red-800",
    ORDERED: "bg-amber-100 text-amber-800",
    READY: "bg-emerald-100 text-emerald-800",
  };
  const labels = { PENDING: "Ej beställd", ORDERED: "Beställd", READY: "Klar" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function MentorPage() {
  const [roles, setRoles] = useState<AppRole[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [nyanstallda, setNyanstallda] = useState<Nyanstalld[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedNyanstalldId, setSelectedNyanstalldId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [progress, setProgress] = useState<Record<string, TaskProgressState>>({});
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ categoryId: string; index: number } | null>(null);

  const allTasks = categories.flatMap((c) => c.tasks);
  const canReorder = !!roles && hasAnyRole(roles, ["MENTOR", "ARBETSLEDARE", "ADMIN"]);

  const tasksForView = selectedCategoryId
    ? (categories.find((c) => c.id === selectedCategoryId)?.tasks ?? [])
    : allTasks;
  const currentCategory = selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null;

  const saveOrder = useCallback(
    async (
      categoriesOrder: { id: string; sortOrder: number }[],
      tasksOrder: { id: string; sortOrder: number; categoryId?: string }[]
    ) => {
      try {
        await fetch("/api/mentor/order", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categories: categoriesOrder.length ? categoriesOrder : undefined,
            tasks: tasksOrder.length ? tasksOrder : undefined,
          }),
        });
      } catch {
        // Rollback handled by not updating state on error; could refetch
      }
    },
    []
  );

  const moveCategory = (fromIndex: number, direction: 1 | -1) => {
    const next = [...categories];
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= next.length) return;
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    const reordered = next.map((c, i) => ({ id: c.id, sortOrder: i }));
    setCategories(next.map((c, i) => ({ ...c, sortOrder: i })));
    saveOrder(reordered, []);
  };

  const moveTask = (taskIndex: number, direction: 1 | -1) => {
    if (!currentCategory) return;
    const toIndex = taskIndex + direction;
    if (toIndex < 0 || toIndex >= currentCategory.tasks.length) return;
    reorderTask(taskIndex, toIndex);
  };

  const reorderTask = (fromIndex: number, toIndex: number) => {
    if (!currentCategory) return;
    reorderTaskInCategory(currentCategory.id, fromIndex, toIndex);
  };

  const reorderTaskInCategory = (categoryId: string, fromIndex: number, toIndex: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const tasks = [...cat.tasks];
    const [removed] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, removed);
    const reordered = tasks.map((t, i) => ({ id: t.id, sortOrder: i }));
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, tasks: tasks.map((t, i) => ({ ...t, sortOrder: i })) } : c
      )
    );
    saveOrder([], reordered);
  };

  const moveTaskToCategory = (
    taskId: string,
    fromCategoryId: string,
    toCategoryId: string,
    toIndex: number
  ) => {
    const fromCat = categories.find((c) => c.id === fromCategoryId);
    const toCat = categories.find((c) => c.id === toCategoryId);
    if (!fromCat || !toCat) return;
    const task = fromCat.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newFromTasks = fromCat.tasks.filter((t) => t.id !== taskId);
    const newToTasks = [...toCat.tasks];
    newToTasks.splice(toIndex, 0, { ...task, categoryId: toCategoryId, sortOrder: toIndex });

    const payload: { id: string; sortOrder: number; categoryId?: string }[] = [
      ...newFromTasks.map((t, i) => ({ id: t.id, sortOrder: i })),
      ...newToTasks.map((t, i) => ({
        id: t.id,
        sortOrder: i,
        ...(t.id === taskId ? { categoryId: toCategoryId } : {}),
      })),
    ];

    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === fromCategoryId) return { ...c, tasks: newFromTasks.map((t, i) => ({ ...t, sortOrder: i })) };
        if (c.id === toCategoryId) return { ...c, tasks: newToTasks.map((t, i) => ({ ...t, sortOrder: i, categoryId: toCategoryId })) };
        return c;
      })
    );
    saveOrder([], payload);
  };

  const handleTaskDragStart = (
    e: React.DragEvent,
    taskId: string,
    categoryId: string,
    taskIndex: number
  ) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ taskId, fromCategoryId: categoryId, fromIndex: taskIndex })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskIndex(null);
    setDragOverTarget(null);
  };

  const handleTaskDragOver = (
    e: React.DragEvent,
    targetCategoryId: string,
    taskIndex: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTaskIndex(taskIndex);
    setDragOverTarget({ categoryId: targetCategoryId, index: taskIndex });
  };

  const handleTaskDragLeave = () => {
    setDragOverTaskIndex(null);
    setDragOverTarget(null);
  };

  const handleTaskDrop = (
    e: React.DragEvent,
    toCategoryId: string,
    toIndex: number
  ) => {
    e.preventDefault();
    setDragOverTaskIndex(null);
    setDragOverTarget(null);
    setDraggedTaskId(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}") as {
        taskId?: string;
        fromCategoryId?: string;
        fromIndex?: number;
      };
      const { taskId, fromCategoryId, fromIndex } = data;
      if (!taskId || fromCategoryId === undefined || typeof fromIndex !== "number") return;

      if (fromCategoryId === toCategoryId) {
        if (fromIndex === toIndex) return;
        reorderTaskInCategory(toCategoryId, fromIndex, toIndex);
      } else {
        moveTaskToCategory(taskId, fromCategoryId, toCategoryId, toIndex);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Auth"))))
      .then((me: { id: string; roles?: AppRole[]; role?: AppRole }) => {
        const nextRoles = Array.isArray(me.roles) ? me.roles : me.role ? [me.role] : [];
        setRoles(nextRoles);
        setCurrentUserId(me.id);
        setCanEdit(nextRoles.includes("MENTOR") || nextRoles.includes("ARBETSLEDARE") || nextRoles.includes("ADMIN"));
      })
      .catch(() => {
        setRoles([]);
        setError("Du måste vara inloggad för att använda mentorvyn.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (roles === null) return;
    const canView = roles.includes("NYANSTALLD") || roles.includes("MENTOR") || roles.includes("ARBETSLEDARE") || roles.includes("ADMIN");
    if (!canView) {
      setError("Du har inte behörighet till mentorvyn.");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/mentor/nyanstallda").then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error((body?.error as string) || "Nyanställda");
        }
        return r.json();
      }),
      fetch("/api/mentor/categories").then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error((body?.error as string) || "Kategorier");
        }
        return r.json();
      }),
    ])
      .then(([nyanstalldaData, categoriesData]) => {
        setNyanstallda(nyanstalldaData);
        setCategories(categoriesData);
        if (categoriesData.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(categoriesData[0].id);
        }
        const selfOnly = roles.includes("NYANSTALLD") && !roles.includes("MENTOR") && !roles.includes("ARBETSLEDARE") && !roles.includes("ADMIN");
        if (selfOnly && currentUserId) {
          setSelectedNyanstalldId(currentUserId);
        } else if (nyanstalldaData.length > 0 && !selectedNyanstalldId) {
          setSelectedNyanstalldId(nyanstalldaData[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roles, currentUserId, selectedNyanstalldId]);

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

  const getProgress = (taskId: string): TaskProgressState =>
    progress[taskId] ?? { isVisad: false, isKan: false, notes: "" };

  const selfOnlyView =
    !!roles &&
    roles.includes("NYANSTALLD") &&
    !roles.includes("MENTOR") &&
    !roles.includes("ARBETSLEDARE") &&
    !roles.includes("ADMIN");

  const setTaskProgress = (taskId: string, upd: Partial<TaskProgressState>) => {
    if (!canEdit) return;
    setProgress((prev) => ({
      ...prev,
      [taskId]: { ...getProgress(taskId), ...upd },
    }));
    if ("isVisad" in upd || "isKan" in upd) saveProgress(taskId, upd);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-otic-primary border-t-transparent" aria-hidden />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Fel</p>
        <p className="mt-1 text-red-700">{error}</p>
        <p className="mt-2 text-sm text-red-600">
          Kontrollera att du är inloggad och att tjänsten svarar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start">
      {/* Sidomeny: kategorier (desktop) */}
      <aside className="w-full shrink-0 lg:w-56 lg:sticky lg:top-24">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-md lg:p-2">
          <h2 className="mb-2 hidden text-xs font-semibold uppercase tracking-wider text-gray-500 sm:block lg:mb-3">
            Kategorier
          </h2>
          {/* Mobil: dropdown */}
          <div className="lg:hidden">
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            >
              <option value="">Alla moment</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {/* Desktop: lista med reorder */}
          <nav className="hidden lg:block" aria-label="Kategorier">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("")}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                !selectedCategoryId ? "bg-otic-primary/10 text-otic-primary" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <ListChecks className="h-4 w-4 shrink-0" aria-hidden /> Alla moment
            </button>
            {categories.map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-0.5">
                {canReorder && (
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveCategory(idx, -1)}
                      disabled={idx === 0}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                      aria-label={`Flytta ${cat.name} upp`}
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(idx, 1)}
                      disabled={idx === categories.length - 1}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                      aria-label={`Flytta ${cat.name} ned`}
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex flex-1 items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    selectedCategoryId === cat.id ? "bg-otic-primary/10 text-otic-primary" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {cat.name}
                  <span className="ml-1.5 text-xs text-gray-400">({cat.tasks.length})</span>
                </button>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Huvudinnehåll */}
      <main className="min-w-0 flex-1 space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">
            {selfOnlyView ? "Onboarding" : "Mentorvy"}
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            {selfOnlyView
              ? "Dina moment, länkar och status i onboarding."
              : "Checklistor, Genomgången/Behärskar och anteckningar per nyanställd."}
          </p>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            {allTasks.length} moment i {categories.length} kategorier.
          </p>
        </div>

        {/* Välj nyanställd */}
        {!selfOnlyView && (
          <section className="card-section">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:text-sm">
              <Users className="h-4 w-4" aria-hidden /> Nyanställd
            </h2>
            {nyanstallda.length === 0 ? (
              <p className="text-gray-500">Inga nyanställda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nyanstallda.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedNyanstalldId(n.id)}
                    className={`min-h-[48px] rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition touch-manipulation sm:min-h-0 sm:py-2.5 ${
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
        )}

        {selectedNyanstalld && (
          <section className="card-section">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:text-sm">
              <Monitor className="h-4 w-4" aria-hidden /> IT-system (status)
            </h2>
            <div className="flex flex-wrap gap-2">
              {selectedNyanstalld.systems.map((s) => (
                <div
                  key={s.systemName}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-50/80 px-2.5 py-1.5 shadow-sm"
                >
                  <span className="text-sm font-medium text-gray-800">{s.systemName}</span>
                  <SystemStatusBadge status={s.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        {loadingProgress && (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-otic-primary border-t-transparent" aria-hidden />
        )}

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:text-sm">
            <ListChecks className="h-4 w-4" aria-hidden />
            {currentCategory ? currentCategory.name : "Alla moment"}
          </h2>
          {currentCategory && tasksForView.length === 0 ? (
            <p className="text-gray-500">Inga moment i denna kategori. Välj en annan i sidomenyn.</p>
          ) : currentCategory ? (
            <ul className="space-y-3">
              {tasksForView.map((task, taskIndex) => {
                const prog = getProgress(task.id);
                const readOnly = !canEdit;
                const isDragging = draggedTaskId === task.id;
                const isDropTarget = dragOverTaskIndex === taskIndex;
                return (
                  <li
                    key={task.id}
                    className={`flex gap-2 transition-colors ${isDropTarget ? "rounded-lg ring-2 ring-otic-primary/50 ring-offset-2" : ""}`}
                    onDragOver={canReorder ? (e) => handleTaskDragOver(e, currentCategory.id, taskIndex) : undefined}
                    onDragLeave={canReorder ? handleTaskDragLeave : undefined}
                    onDrop={canReorder ? (e) => handleTaskDrop(e, currentCategory.id, taskIndex) : undefined}
                  >
                    {canReorder && (
                      <div
                        draggable
                        onDragStart={(e) => handleTaskDragStart(e, task.id, currentCategory.id, taskIndex)}
                        onDragEnd={handleTaskDragEnd}
                        className="flex cursor-grab touch-none flex-col justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing"
                        role="button"
                        aria-label={`Dra för att flytta ${task.title}`}
                      >
                        <GripVertical className="h-5 w-5" aria-hidden />
                      </div>
                    )}
                    <div
                      className={`card-touch min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${isDragging ? "opacity-50" : ""}`}
                    >
                      <div className="p-4 sm:p-5">
                        <p className="font-semibold text-gray-900">{task.title}</p>

                        {(task.subTasks?.length ?? 0) > 0 && (
                          <div className="mt-3 rounded-lg bg-gray-50/80 p-3 shadow-sm">
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                              <Link2 className="h-3.5 w-3.5" aria-hidden /> Länkar till rutiner (SharePoint)
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
                          <label className="flex min-h-[48px] cursor-pointer items-center gap-3 touch-manipulation">
                            <input
                              type="checkbox"
                              checked={prog.isVisad}
                              disabled={readOnly}
                              onChange={(e) => setTaskProgress(task.id, { isVisad: e.target.checked })}
                              className="h-5 w-5 shrink-0 rounded-md border-2 border-gray-300 text-otic-primary focus:ring-2 focus:ring-otic-primary focus:ring-offset-0"
                            />
                            <span className="text-sm font-medium uppercase tracking-wider text-gray-500">Genomgången</span>
                          </label>
                          <label className="flex min-h-[48px] cursor-pointer items-center gap-3 touch-manipulation">
                            <input
                              type="checkbox"
                              checked={prog.isKan}
                              disabled={readOnly}
                              onChange={(e) => setTaskProgress(task.id, { isKan: e.target.checked })}
                              className="h-5 w-5 shrink-0 rounded-md border-2 border-gray-300 text-otic-primary focus:ring-2 focus:ring-otic-primary focus:ring-offset-0"
                            />
                            <span className="text-sm font-medium uppercase tracking-wider text-gray-500">Behärskar</span>
                          </label>
                        </div>

                        {!selfOnlyView && (
                          <div className="mt-3">
                            <label htmlFor={`notes-${task.id}`} className="sr-only">
                              Anteckningar för {task.title}
                            </label>
                            <textarea
                              id={`notes-${task.id}`}
                              placeholder="Anteckningar (t.ex. behöver öva mer…)"
                              value={prog.notes}
                              disabled={readOnly}
                              onChange={(e) =>
                                setProgress((prev) => ({
                                  ...prev,
                                  [task.id]: { ...getProgress(task.id), notes: e.target.value },
                                }))
                              }
                              onBlur={(e) => saveProgress(task.id, { notes: e.target.value })}
                              rows={2}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20 disabled:bg-gray-50"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="space-y-6">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">{cat.name}</h3>
                  <ul className="space-y-3">
                    {cat.tasks.map((task, taskIndex) => {
                      const prog = getProgress(task.id);
                      const readOnly = !canEdit;
                      const isDragging = draggedTaskId === task.id;
                      const isDropTarget =
                        dragOverTarget?.categoryId === cat.id && dragOverTarget?.index === taskIndex;
                      return (
                        <li
                          key={task.id}
                          className={`flex gap-2 transition-colors ${isDropTarget ? "rounded-lg ring-2 ring-otic-primary/50 ring-offset-2" : ""}`}
                          onDragOver={canReorder ? (e) => handleTaskDragOver(e, cat.id, taskIndex) : undefined}
                          onDragLeave={canReorder ? handleTaskDragLeave : undefined}
                          onDrop={canReorder ? (e) => handleTaskDrop(e, cat.id, taskIndex) : undefined}
                        >
                          {canReorder && (
                            <div
                              draggable
                              onDragStart={(e) => handleTaskDragStart(e, task.id, cat.id, taskIndex)}
                              onDragEnd={handleTaskDragEnd}
                              className="flex cursor-grab touch-none flex-col justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing"
                              role="button"
                              aria-label={`Dra för att flytta ${task.title}`}
                            >
                              <GripVertical className="h-5 w-5" aria-hidden />
                            </div>
                          )}
                          <div
                            className={`card-touch min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${isDragging ? "opacity-50" : ""}`}
                          >
                            <div className="p-4 sm:p-5">
                              <p className="font-semibold text-gray-900">{task.title}</p>
                              {(task.subTasks?.length ?? 0) > 0 && (
                                <div className="mt-3 rounded-lg bg-gray-50/80 p-3 shadow-sm">
                                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    <Link2 className="h-3.5 w-3.5" aria-hidden /> Länkar till rutiner (SharePoint)
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
                                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 touch-manipulation">
                                  <input
                                    type="checkbox"
                                    checked={prog.isVisad}
                                    disabled={readOnly}
                                    onChange={(e) => setTaskProgress(task.id, { isVisad: e.target.checked })}
                                    className="h-5 w-5 shrink-0 rounded-md border-2 border-gray-300 text-otic-primary focus:ring-2 focus:ring-otic-primary focus:ring-offset-0"
                                  />
                                  <span className="text-sm font-medium uppercase tracking-wider text-gray-500">Genomgången</span>
                                </label>
                                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 touch-manipulation">
                                  <input
                                    type="checkbox"
                                    checked={prog.isKan}
                                    disabled={readOnly}
                                    onChange={(e) => setTaskProgress(task.id, { isKan: e.target.checked })}
                                    className="h-5 w-5 shrink-0 rounded-md border-2 border-gray-300 text-otic-primary focus:ring-2 focus:ring-otic-primary focus:ring-offset-0"
                                  />
                                  <span className="text-sm font-medium uppercase tracking-wider text-gray-500">Behärskar</span>
                                </label>
                              </div>
                              {!selfOnlyView && (
                                <div className="mt-3">
                                  <label htmlFor={`notes-all-${task.id}`} className="sr-only">
                                    Anteckningar för {task.title}
                                  </label>
                                  <textarea
                                    id={`notes-all-${task.id}`}
                                    placeholder="Anteckningar (t.ex. behöver öva mer…)"
                                    value={prog.notes}
                                    disabled={readOnly}
                                    onChange={(e) =>
                                      setProgress((prev) => ({
                                        ...prev,
                                        [task.id]: { ...getProgress(task.id), notes: e.target.value },
                                      }))
                                    }
                                    onBlur={(e) => saveProgress(task.id, { notes: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20 disabled:bg-gray-50"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
