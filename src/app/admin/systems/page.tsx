"use client";

import { useCallback, useEffect, useState } from "react";

interface SystemItem {
  id: string;
  name: string;
  sortOrder: number;
}

export default function AdminSystemsPage() {
  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchSystems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/systems");
      if (!res.ok) throw new Error("Kunde inte hämta program");
      const data = await res.json();
      setSystems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { roles?: string[]; role?: string } | null) => {
        const roles = Array.isArray(data?.roles) ? data.roles : data?.role ? [data.role] : [];
        const isAdmin = roles.includes("ADMIN");
        setAuthorized(isAdmin);
        if (isAdmin) fetchSystems();
        else setLoading(false);
      })
      .catch(() => { setAuthorized(false); setLoading(false); });
  }, [fetchSystems]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), sortOrder: systems.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte skapa program");
      setSystems((prev) => [...prev, data].sort((a, b) => a.sortOrder - b.sortOrder));
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte skapa program");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/systems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte uppdatera");
      setSystems((prev) => prev.map((s) => (s.id === id ? data : s)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte uppdatera");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ta bort detta program? Status för nyanställda och koppling till uppgifter tas bort.")) return;
    try {
      const res = await fetch(`/api/admin/systems/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Kunde inte radera");
      setSystems((prev) => prev.filter((s) => s.id !== id));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte radera");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-otic-primary border-t-transparent" aria-hidden />
      </div>
    );
  }
  if (!authorized) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Ingen behörighet</p>
        <p className="mt-1 text-red-700">Du har inte åtkomst till programadministrationen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">Program</h1>
        <p className="mt-1 text-sm text-gray-600">Lägg till, redigera och ta bort IT-system (t.ex. OCA, TIMS). Dessa visas på Dashboard och för uppgifter.</p>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline focus:outline-none">Stäng</button>
        </div>
      )}
      <section className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">Lägg till program</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label htmlFor="new-system-name" className="mb-1 block text-sm font-medium text-gray-700">Namn</label>
            <input
              id="new-system-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="t.ex. OCA, TIMS"
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !newName.trim()}
            className="min-h-[48px] rounded-xl bg-otic-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-otic-primaryDark focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {submitting ? "Sparar…" : "Lägg till"}
          </button>
        </form>
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Alla program</h2>
        {systems.length === 0 ? (
          <p className="text-gray-500">Inga program än. Lägg till ett ovan.</p>
        ) : (
          <ul className="space-y-2">
            {systems.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-4">
                {editingId === s.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                      placeholder="Namn"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleUpdate(s.id)} className="rounded-lg bg-otic-primary px-3 py-2 text-sm text-white">Spara</button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Avbryt</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-900">{s.name}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEditingId(s.id); setEditName(s.name); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">Redigera</button>
                      <button type="button" onClick={() => handleDelete(s.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50">Ta bort</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
