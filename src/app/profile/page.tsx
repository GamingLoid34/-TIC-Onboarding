"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppRole, ROLE_LABELS } from "@/lib/auth/roles";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
      setLoading(false);
    });

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Nytt lösenord måste vara minst 6 tecken." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Nytt lösenord och bekräftelse matchar inte." });
      return;
    }
    if (!email || !currentPassword) {
      setPasswordMessage({ type: "error", text: "Fyll i nuvarande lösenord." });
      return;
    }
    setPasswordLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setPasswordMessage({
          type: "error",
          text: signInError.message === "Invalid login credentials" ? "Nuvarande lösenord är fel." : signInError.message,
        });
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setPasswordMessage({ type: "error", text: updateError.message });
        return;
      }
      setPasswordMessage({ type: "success", text: "Lösenordet är bytt. Du kan logga in med det nya lösenordet nästa gång." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMessage({ type: "error", text: "Kunde inte byta lösenord. Försök igen." });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-section">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          <Settings className="h-6 w-6" aria-hidden /> Inställningar
        </h1>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Inloggad som</p>
        <p className="mt-1 font-medium text-gray-900">
          {loading ? "…" : email ?? "Ej inloggad"}
        </p>
        {roles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
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
      </div>

      <div className="card-section">
        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Byt lösenord</h2>
        <p className="mt-1 text-sm text-gray-600">
          Ändra ditt inloggningslösenord. Du behöver ange ditt nuvarande lösenord.
        </p>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-3 max-w-sm">
          <div>
            <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-gray-700">
              Nuvarande lösenord
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
              Nytt lösenord (minst 6 tecken)
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
              Bekräfta nytt lösenord
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-otic-primary focus:outline-none focus:ring-2 focus:ring-otic-primary/20"
            />
          </div>
          {passwordMessage && (
            <p
              className={`text-sm ${passwordMessage.type === "success" ? "text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2" : "text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"}`}
            >
              {passwordMessage.text}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordLoading}
            className="min-h-[44px] rounded-xl bg-otic-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-otic-primaryDark focus:outline-none focus:ring-2 focus:ring-otic-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {passwordLoading ? "Sparar…" : "Spara nytt lösenord"}
          </button>
        </form>
      </div>

      {(roles.includes("ADMIN") || roles.includes("MENTOR")) && (
        <Link
          href="/admin/tasks"
          className="block rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-md hover:shadow-lg hover:bg-gray-50 transition-shadow"
        >
          Gå till admin
        </Link>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="min-h-[48px] rounded-xl bg-otic-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-otic-primaryDark"
      >
        Logga ut
      </button>
    </div>
  );
}
