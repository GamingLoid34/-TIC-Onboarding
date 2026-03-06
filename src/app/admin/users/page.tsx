"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE_LABELS, type AppRole } from "@/lib/auth/roles";

interface User {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  hasProfile?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("NYANSTALLD");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("NYANSTALLD");
  const [editPassword, setEditPassword] = useState("");

  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetName, setResetName] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

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
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { roles?: AppRole[]; role?: AppRole } | null) => {
        const roles = Array.isArray(data?.roles) ? data.roles : data?.role ? [data.role] : [];
        const isAdmin = roles.includes("ADMIN");
        setAuthorized(isAdmin);
        if (isAdmin) {
          fetchUsers();
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setAuthorized(false);
        setLoading(false);
      });
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword) return;
    if (newPassword.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte skapa användare");
      setUsers((prev) => [...prev, data]);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
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
        body: JSON.stringify({
          role: editRole,
          ...(editPassword ? { password: editPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte uppdatera");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
      setEditingId(null);
      setEditPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte uppdatera");
    }
  };

  const handleResetAll = async () => {
    if (!resetConfirm) {
      setError("Bocka i att du förstår att alla användare tas bort.");
      return;
    }
    setError(null);
    setResetSuccess(null);
    setResetSubmitting(true);
    try {
      const body: { email?: string; password?: string; name?: string } = {};
      if (resetEmail.trim() && resetPassword.length >= 6 && resetName.trim()) {
        body.email = resetEmail.trim().toLowerCase();
        body.password = resetPassword;
        body.name = resetName.trim();
      }
      const res = await fetch("/api/admin/reset-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kunde inte rensa");
      setUsers([]);
      setResetConfirm(false);
      setResetEmail("");
      setResetPassword("");
      setResetName("");
      const msg = data.message ?? "Alla användare borttagna.";
      setResetSuccess(
        body.email
          ? msg + " Logga ut och logga in igen med " + body.email + "."
          : msg
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte rensa användare");
    } finally {
      setResetSubmitting(false);
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-otic-primary border-t-transparent" aria-hidden />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">Ingen behörighet</p>
        <p className="mt-1 text-red-700">Du har inte åtkomst till användaradministrationen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">
          Användare
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Bjud in användare med e-post och lösenord. Tilldela en roll. Användaren loggar in med samma e-post och lösenord.
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

      <section className="card-section">
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">Bjud in användare</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 w-full sm:max-w-[200px]">
            <label htmlFor="new-name" className="mb-1 block text-sm font-medium text-gray-700">Namn</label>
            <input
              id="new-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Anna Andersson"
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
              required
            />
          </div>
          <div className="min-w-0 w-full sm:max-w-[240px]">
            <label htmlFor="new-email" className="mb-1 block text-sm font-medium text-gray-700">E-post</label>
            <input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="anna@ostgotatrafiken.se"
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
              required
            />
          </div>
          <div className="min-w-0 w-full sm:max-w-[200px]">
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">Lösenord</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minst 6 tecken"
              minLength={6}
              autoComplete="new-password"
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
              required
            />
          </div>
          <div className="min-w-0 w-full sm:max-w-[180px]">
            <label htmlFor="new-role" className="mb-1 block text-sm font-medium text-gray-700">Roll</label>
            <select
              id="new-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AppRole)}
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3 focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            >
              {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[48px] w-full rounded-xl bg-otic-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-otic-primaryDark focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2 disabled:opacity-50 sm:w-auto"
          >
            {submitting ? "Sparar…" : "Lägg till användare"}
          </button>
        </form>
      </section>

      <section className="card-section border-amber-200 bg-amber-50/50">
        <h2 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">
          Rensa alla användare och starta om
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Tar bort alla användare i appen och i inloggningen (Supabase Auth). Använd bara om ni vill börja helt från början.
          Kategorier och moment (tasks) påverkas inte.
        </p>
        {resetSuccess && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {resetSuccess}
          </div>
        )}
        <label className="mb-3 flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-otic-primary focus:ring-otic-primary"
          />
          <span>Jag förstår att alla inloggningar och användarprofiler tas bort. Jag kan inte ångra detta.</span>
        </label>
        <p className="mb-3 text-sm font-medium text-gray-700">Valfritt: skapa första användaren direkt efter rensning (Admin)</p>
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={resetName}
            onChange={(e) => setResetName(e.target.value)}
            placeholder="Namn"
            className="min-h-[40px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:max-w-[160px]"
          />
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="E-post"
            className="min-h-[40px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:max-w-[200px]"
          />
          <input
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="Lösenord (minst 6 tecken)"
            minLength={6}
            className="min-h-[40px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:max-w-[180px]"
          />
        </div>
        <button
          type="button"
          onClick={handleResetAll}
          disabled={!resetConfirm || resetSubmitting}
          className="min-h-[44px] rounded-xl border border-red-300 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {resetSubmitting ? "Rensar…" : "Rensa alla användare och starta om"}
        </button>
      </section>

      <section className="card-section">
        <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg">Alla användare</h2>
        {users.length === 0 ? (
          <p className="text-gray-500">Inga användare än. Lägg till en ovan.</p>
        ) : (
          <ul className="space-y-3">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-gray-50/50 p-4"
              >
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editingId === u.id ? (
                    <>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-[180px]">
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Roll
                          </label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as AppRole)}
                            className="w-full min-h-[40px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
                          >
                            {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="min-w-[220px]">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Nytt lösenord (valfritt)
                        </label>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Minst 6 tecken"
                          minLength={6}
                          autoComplete="new-password"
                          className="w-full min-h-[40px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateRole(u.id)}
                        className="min-h-[40px] rounded-lg bg-otic-primary px-3 py-2 text-sm font-medium text-white touch-manipulation"
                      >
                        Spara
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditPassword("");
                        }}
                        className="min-h-[40px] rounded-lg border border-gray-300 px-3 py-2 text-sm touch-manipulation"
                      >
                        Avbryt
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded-full bg-otic-primary/15 px-2.5 py-0.5 text-xs font-medium text-otic-primary">
                          {ROLE_LABELS[u.role]}
                        </span>
                        {u.hasProfile === false && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            Saknar profil
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(u.id);
                          setEditRole(u.role);
                          setEditPassword("");
                        }}
                        className="min-h-[40px] rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-white touch-manipulation"
                      >
                        {u.hasProfile === false ? "Importera / ändra" : "Ändra användare"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="min-h-[40px] rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 touch-manipulation"
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
