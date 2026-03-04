"use client";

import { useCallback, useEffect, useState } from "react";

type Role = "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  ARBETSLEDARE: "Arbetsledare",
  MENTOR: "Mentor",
  NYANSTALLD: "Nyanställd",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("NYANSTALLD");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("NYANSTALLD");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Kunde inte hämta användare");
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ett fel uppstod");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte skapa användare");
      setUsers((prev) => [...prev, data]);
      setNewName("");
      setNewEmail("");
      setNewRole("NYANSTALLD");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte skapa användare");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte uppdatera");
      setUsers((prev) => prev.map((u) => (u.id === id ? data : u)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte uppdatera");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ta bort denna användare? Detta kan inte ångras.")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Kunde inte radera");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte radera");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-500">Hämtar användare…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Användare
        </h1>
        <p className="mt-1 text-gray-600">
          Bjud in användare och tilldela roll (Admin, Arbetsledare, Mentor, Nyanställd). Skapa sedan samma e-post i Supabase → Authentication → Users så att personen kan logga in.
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

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Bjud in användare</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-[200px]">
            <label htmlFor="new-name" className="mb-1 block text-sm font-medium text-gray-700">
              Namn
            </label>
            <input
              id="new-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Anna Andersson"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
              required
            />
          </div>
          <div className="min-w-0 flex-1 sm:max-w-[240px]">
            <label htmlFor="new-email" className="mb-1 block text-sm font-medium text-gray-700">
              E-post
            </label>
            <input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="anna@ostgotatrafiken.se"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
              required
            />
          </div>
          <div className="min-w-0 flex-1 sm:max-w-[180px]">
            <label htmlFor="new-role" className="mb-1 block text-sm font-medium text-gray-700">
              Roll
            </label>
            <select
              id="new-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            >
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-otic-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-otic-primaryDark disabled:opacity-50"
          >
            {submitting ? "Sparar…" : "Lägg till användare"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Alla användare</h2>
        {users.length === 0 ? (
          <p className="text-gray-500">Inga användare än. Lägg till en ovan.</p>
        ) : (
          <ul className="space-y-3">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50/50 p-4"
              >
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editingId === u.id ? (
                    <>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as Role)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleUpdateRole(u.id)}
                        className="rounded bg-otic-primary px-2 py-1 text-sm text-white"
                      >
                        Spara
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                      >
                        Avbryt
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-otic-primary/15 px-2.5 py-0.5 text-xs font-medium text-otic-primary">
                        {ROLE_LABELS[u.role]}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(u.id);
                          setEditRole(u.role);
                        }}
                        className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-white"
                      >
                        Ändra roll
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                      >
                        Ta bort
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
