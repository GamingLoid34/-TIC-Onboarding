"use client";

import { useCallback, useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

interface SubTask {
  id: string;
  title: string;
  url: string | null;
  taskId: string;
  sortOrder: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  requiredSystemName: string | null;
  sortOrder: number;
  category: Category;
  subTasks: SubTask[];
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategoryId, setNewTaskCategoryId] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskSystemName, setNewTaskSystemName] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubTaskTaskId, setNewSubTaskTaskId] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  const [newSubTaskUrl, setNewSubTaskUrl] = useState("");
  const [submittingSubTask, setSubmittingSubTask] = useState(false);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);
  const [editSubTaskTitle, setEditSubTaskTitle] = useState("");
  const [editSubTaskUrl, setEditSubTaskUrl] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tasks");
      if (!res.ok) throw new Error("Kunde inte hämta data");
      const data = await res.json();
      setTasks(data.tasks);
      setCategories(data.categories);
      if (data.categories.length > 0 && !newTaskCategoryId) {
        setNewTaskCategoryId(data.categories[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }, [newTaskCategoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskCategoryId) return;
    setSubmittingTask(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          categoryId: newTaskCategoryId,
          description: newTaskDescription.trim() || undefined,
          requiredSystemName: newTaskSystemName.trim() || undefined,
          sortOrder: 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kunde inte skapa uppgift");
      }
      const created = await res.json();
      setTasks((prev) => [...prev, created].sort((a, b) => a.category.sortOrder - b.category.sortOrder || a.sortOrder - b.sortOrder));
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskSystemName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte skapa uppgift");
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!editTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskTitle.trim(),
          description: editTaskDescription.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Kunde inte uppdatera");
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setEditingTaskId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte uppdatera");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Radera denna uppgift och alla dess delmoment?")) return;
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Kunde inte radera");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setExpandedTaskId((id) => (id === taskId ? null : id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte radera");
    }
  };

  const handleCreateSubTask = async (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    if (!newSubTaskTitle.trim()) return;
    setSubmittingSubTask(true);
    try {
      const res = await fetch("/api/admin/subtasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          title: newSubTaskTitle.trim(),
          url: newSubTaskUrl.trim() || undefined,
          sortOrder: 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kunde inte skapa delmoment");
      }
      const created = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, subTasks: [...t.subTasks, created].sort((a, b) => a.sortOrder - b.sortOrder) }
            : t
        )
      );
      setNewSubTaskTitle("");
      setNewSubTaskUrl("");
      setNewSubTaskTaskId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte skapa delmoment");
    } finally {
      setSubmittingSubTask(false);
    }
  };

  const handleUpdateSubTask = async (subTaskId: string) => {
    if (!editSubTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/admin/subtasks/${subTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editSubTaskTitle.trim(),
          url: editSubTaskUrl.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Kunde inte uppdatera");
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === updated.taskId
            ? { ...t, subTasks: t.subTasks.map((s) => (s.id === subTaskId ? updated : s)) }
            : t
        )
      );
      setEditingSubTaskId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte uppdatera");
    }
  };

  const handleDeleteSubTask = async (taskId: string, subTaskId: string) => {
    if (!confirm("Radera detta delmoment?")) return;
    try {
      const res = await fetch(`/api/admin/subtasks/${subTaskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Kunde inte radera");
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, subTasks: t.subTasks.filter((s) => s.id !== subTaskId) } : t
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte radera");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">Hämtar uppgifter…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Admin – Uppgifter och delmoment
        </h1>
        <p className="mt-1 text-gray-600">
          Skapa, redigera och radera uppgifter (Tasks) och delmoment (SubTasks).
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 underline focus:outline-none"
          >
            Stäng
          </button>
        </div>
      )}

      {/* Formulär: Ny uppgift */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Lägg till uppgift</h2>
        <form onSubmit={handleCreateTask} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor="new-task-category" className="mb-1 block text-sm font-medium text-gray-700">
              Kategori
            </label>
            <select
              id="new-task-category"
              value={newTaskCategoryId}
              onChange={(e) => setNewTaskCategoryId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1 sm:max-w-sm">
            <label htmlFor="new-task-title" className="mb-1 block text-sm font-medium text-gray-700">
              Titel *
            </label>
            <input
              id="new-task-title"
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Titel på uppgiften"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
              required
            />
          </div>
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor="new-task-system" className="mb-1 block text-sm font-medium text-gray-700">
              Kräver system (valfritt)
            </label>
            <input
              id="new-task-system"
              type="text"
              value={newTaskSystemName}
              onChange={(e) => setNewTaskSystemName(e.target.value)}
              placeholder="t.ex. TIMS, OCA"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submittingTask || !newTaskTitle.trim()}
              className="rounded-lg bg-otic-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-otic-primaryDark disabled:opacity-50"
            >
              {submittingTask ? "Sparar…" : "Lägg till uppgift"}
            </button>
          </div>
        </form>
        <div className="mt-3">
          <label htmlFor="new-task-desc" className="mb-1 block text-sm font-medium text-gray-700">
            Beskrivning (valfritt)
          </label>
          <textarea
            id="new-task-desc"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            placeholder="Kort beskrivning"
            rows={2}
            className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
          />
        </div>
      </section>

      {/* Lista uppgifter och delmoment */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Uppgifter</h2>
        {tasks.length === 0 ? (
          <p className="text-gray-500">Inga uppgifter än. Lägg till en ovan.</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    {editingTaskId === task.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={editTaskTitle}
                          onChange={(e) => setEditTaskTitle(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1"
                        />
                        <textarea
                          value={editTaskDescription}
                          onChange={(e) => setEditTaskDescription(e.target.value)}
                          rows={2}
                          className="rounded border border-gray-300 px-2 py-1"
                          placeholder="Beskrivning"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateTask(task.id)}
                            className="rounded bg-otic-primary px-2 py-1 text-sm text-white"
                          >
                            Spara
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="rounded border border-gray-300 px-2 py-1 text-sm"
                          >
                            Avbryt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-500">
                          {task.category.name}
                          {task.requiredSystemName && (
                            <span className="ml-2">· Kräver: {task.requiredSystemName}</span>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                  {editingTaskId !== task.id && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedTaskId((id) => (id === task.id ? null : task.id));
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {expandedTaskId === task.id ? "Dölj delmoment" : "Visa delmoment"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTaskId(task.id);
                          setEditTaskTitle(task.title);
                          setEditTaskDescription(task.description || "");
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Redigera
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
                      >
                        Radera
                      </button>
                    </div>
                  )}
                </div>

                {expandedTaskId === task.id && (
                  <div className="border-t border-gray-100 bg-gray-50/80 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-gray-700">Delmoment</h4>
                    <ul className="mb-4 space-y-2">
                      {task.subTasks.map((st) => (
                        <li
                          key={st.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                        >
                          {editingSubTaskId === st.id ? (
                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                type="text"
                                value={editSubTaskTitle}
                                onChange={(e) => setEditSubTaskTitle(e.target.value)}
                                placeholder="Titel"
                                className="flex-1 rounded border border-gray-300 px-2 py-1"
                              />
                              <input
                                type="url"
                                value={editSubTaskUrl}
                                onChange={(e) => setEditSubTaskUrl(e.target.value)}
                                placeholder="https://..."
                                className="flex-1 rounded border border-gray-300 px-2 py-1"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSubTask(st.id)}
                                  className="rounded bg-otic-primary px-2 py-1 text-sm text-white"
                                >
                                  Spara
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSubTaskId(null)}
                                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                                >
                                  Avbryt
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-gray-800">{st.title}</span>
                                {st.url && (
                                  <a
                                    href={st.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-sm text-otic-primary hover:underline"
                                  >
                                    Länk
                                  </a>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubTaskId(st.id);
                                    setEditSubTaskTitle(st.title);
                                    setEditSubTaskUrl(st.url || "");
                                  }}
                                  className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  Redigera
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubTask(task.id, st.id)}
                                  className="rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Radera
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>

                    {/* Formulär: Nytt delmoment under denna task */}
                    {newSubTaskTaskId === task.id ? (
                      <form
                        onSubmit={(e) => handleCreateSubTask(e, task.id)}
                        className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 bg-white p-3 sm:flex-row sm:items-end"
                      >
                        <input
                          type="text"
                          value={newSubTaskTitle}
                          onChange={(e) => setNewSubTaskTitle(e.target.value)}
                          placeholder="Titel på delmoment"
                          className="flex-1 rounded border border-gray-300 px-2 py-1.5"
                          required
                        />
                        <input
                          type="url"
                          value={newSubTaskUrl}
                          onChange={(e) => setNewSubTaskUrl(e.target.value)}
                          placeholder="https://sharepoint.com/..."
                          className="flex-1 rounded border border-gray-300 px-2 py-1.5"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={submittingSubTask || !newSubTaskTitle.trim()}
                            className="rounded bg-otic-primary px-3 py-1.5 text-sm text-white disabled:opacity-50"
                          >
                            {submittingSubTask ? "Sparar…" : "Lägg till"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewSubTaskTaskId(null);
                              setNewSubTaskTitle("");
                              setNewSubTaskUrl("");
                            }}
                            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                          >
                            Avbryt
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNewSubTaskTaskId(task.id)}
                        className="rounded-lg border border-dashed border-gray-400 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        + Lägg till delmoment
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
