"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { WorkspaceAdminOverlay } from "@/components/WorkspaceAdminOverlay";
import type { HotspotData, WorkspaceImageData } from "@/components/WorkspaceViewer";

interface Task {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  category: { name: string };
}

export default function AdminArbetsplatsPage() {
  const [image, setImage] = useState<WorkspaceImageData | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bild-URL-formulär
  const [imageUrl, setImageUrl] = useState("");
  const [imageLabel, setImageLabel] = useState("");
  const [savingImage, setSavingImage] = useState(false);

  // Vald hotspot (task-koppling)
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotData | null>(null);

  // Formulär för ny hotspot
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [savingHotspot, setSavingHotspot] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [imgRes, taskRes] = await Promise.all([
        fetch("/api/arbetsplats"),
        fetch("/api/admin/tasks"),
      ]);
      const img = imgRes.ok ? await imgRes.json() : null;
      const tasks = taskRes.ok ? await taskRes.json() : [];
      setImage(img);
      setAllTasks(tasks);
    } catch {
      setError("Kunde inte hämta data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Sätt ny bild ---
  async function handleSaveImage(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl.trim() || !imageLabel.trim()) return;
    setSavingImage(true);
    try {
      const res = await fetch("/api/arbetsplats/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageUrl.trim(), label: imageLabel.trim() }),
      });
      if (!res.ok) throw new Error();
      const newImg = await res.json();
      setImage({ ...newImg, hotspots: [] });
      setImageUrl("");
      setImageLabel("");
    } catch {
      setError("Kunde inte spara bilden.");
    } finally {
      setSavingImage(false);
    }
  }

  // --- Klick på bild → öppna formulär för ny hotspot ---
  function handleImageClick(x: number, y: number) {
    setSelectedHotspot(null);
    setPendingPos({ x, y });
    setNewLabel("");
  }

  // --- Spara ny hotspot ---
  async function handleSaveHotspot(e: React.FormEvent) {
    e.preventDefault();
    if (!image || !pendingPos || !newLabel.trim()) return;
    setSavingHotspot(true);
    try {
      const res = await fetch("/api/arbetsplats/hotspots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceImageId: image.id,
          label: newLabel.trim(),
          x: pendingPos.x,
          y: pendingPos.y,
        }),
      });
      if (!res.ok) throw new Error();
      const hotspot: HotspotData = { ...(await res.json()), tasks: [] };
      setImage((prev) =>
        prev ? { ...prev, hotspots: [...prev.hotspots, hotspot] } : prev,
      );
      setPendingPos(null);
      setNewLabel("");
    } catch {
      setError("Kunde inte spara hotspot.");
    } finally {
      setSavingHotspot(false);
    }
  }

  // --- Flytta hotspot (drag slut) ---
  async function handleHotspotMove(id: string, x: number, y: number) {
    // Uppdatera lokalt direkt
    setImage((prev) =>
      prev
        ? {
            ...prev,
            hotspots: prev.hotspots.map((h) => (h.id === id ? { ...h, x, y } : h)),
          }
        : prev,
    );
    if (selectedHotspot?.id === id) {
      setSelectedHotspot((prev) => (prev ? { ...prev, x, y } : prev));
    }
    await fetch(`/api/arbetsplats/hotspots/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y }),
    });
  }

  // --- Ta bort hotspot ---
  async function handleHotspotDelete(id: string) {
    if (!confirm("Ta bort den här hotspoten?")) return;
    await fetch(`/api/arbetsplats/hotspots/${id}`, { method: "DELETE" });
    setImage((prev) =>
      prev ? { ...prev, hotspots: prev.hotspots.filter((h) => h.id !== id) } : prev,
    );
    if (selectedHotspot?.id === id) setSelectedHotspot(null);
  }

  // --- Koppla task till vald hotspot ---
  async function handleLinkTask(taskId: string) {
    if (!selectedHotspot) return;
    const res = await fetch(`/api/arbetsplats/hotspots/${selectedHotspot.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    if (!res.ok) return;
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;
    const newLink = { task: { id: task.id, title: task.title, description: task.description, subTasks: [] } };
    const updated = {
      ...selectedHotspot,
      tasks: [...selectedHotspot.tasks, newLink],
    };
    setSelectedHotspot(updated);
    setImage((prev) =>
      prev
        ? {
            ...prev,
            hotspots: prev.hotspots.map((h) => (h.id === updated.id ? updated : h)),
          }
        : prev,
    );
  }

  // --- Ta bort task-koppling ---
  async function handleUnlinkTask(taskId: string) {
    if (!selectedHotspot) return;
    await fetch(`/api/arbetsplats/hotspots/${selectedHotspot.id}/tasks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    const updated = {
      ...selectedHotspot,
      tasks: selectedHotspot.tasks.filter((ht) => ht.task.id !== taskId),
    };
    setSelectedHotspot(updated);
    setImage((prev) =>
      prev
        ? {
            ...prev,
            hotspots: prev.hotspots.map((h) => (h.id === updated.id ? updated : h)),
          }
        : prev,
    );
  }

  const linkedTaskIds = new Set(selectedHotspot?.tasks.map((ht) => ht.task.id) ?? []);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-gray-400">Laddar…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Arbetsplats – redigering</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* --- Bild-URL-formulär --- */}
      <form
        onSubmit={handleSaveImage}
        className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs font-medium text-gray-500">Bild-URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-otic-primary focus:outline-none focus:ring-1 focus:ring-otic-primary"
            required
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-36">
          <label className="text-xs font-medium text-gray-500">Bildnamn</label>
          <input
            type="text"
            value={imageLabel}
            onChange={(e) => setImageLabel(e.target.value)}
            placeholder="T.ex. Plats 01"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-otic-primary focus:outline-none focus:ring-1 focus:ring-otic-primary"
            required
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={savingImage}
            className="flex items-center gap-2 rounded-lg bg-otic-primary px-4 py-2 text-sm font-medium text-white hover:bg-otic-primaryDark disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {savingImage ? "Sparar…" : "Sätt bild"}
          </button>
        </div>
      </form>

      {!image ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">Ingen bild inställd.</p>
          <p className="text-xs text-gray-400">Fyll i en bild-URL ovan för att komma igång.</p>
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          {/* --- Bild med overlay --- */}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs text-gray-400">
              Klicka på bilden för att lägga till en hotspot. Dra en befintlig hotspot för att flytta den.
            </p>
            <WorkspaceAdminOverlay
              image={image}
              onImageClick={handleImageClick}
              onHotspotMove={handleHotspotMove}
              onHotspotSelect={setSelectedHotspot}
              selectedHotspotId={selectedHotspot?.id ?? null}
              onHotspotDelete={handleHotspotDelete}
            />
          </div>

          {/* --- Sidopanel --- */}
          <aside className="w-72 shrink-0 space-y-4">

            {/* Ny hotspot-formulär */}
            {pendingPos && (
              <form
                onSubmit={handleSaveHotspot}
                className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Ny hotspot</h3>
                  <button
                    type="button"
                    onClick={() => setPendingPos(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Position: {pendingPos.x.toFixed(1)}% × {pendingPos.y.toFixed(1)}%
                </p>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Namn, t.ex. Telefon"
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-otic-primary focus:outline-none focus:ring-1 focus:ring-otic-primary"
                  required
                />
                <button
                  type="submit"
                  disabled={savingHotspot}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-otic-primary px-3 py-2 text-sm font-medium text-white hover:bg-otic-primaryDark disabled:opacity-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {savingHotspot ? "Sparar…" : "Lägg till hotspot"}
                </button>
              </form>
            )}

            {/* Task-koppling för vald hotspot */}
            {selectedHotspot && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {selectedHotspot.label}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedHotspot(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Kopplade tasks */}
                {selectedHotspot.tasks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Kopplade rutiner</p>
                    {selectedHotspot.tasks.map((ht) => (
                      <div
                        key={ht.task.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-otic-surface px-3 py-2"
                      >
                        <span className="text-xs text-gray-700 truncate">{ht.task.title}</span>
                        <button
                          type="button"
                          onClick={() => handleUnlinkTask(ht.task.id)}
                          className="shrink-0 text-red-400 hover:text-red-600"
                          title="Ta bort koppling"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tillgängliga tasks att koppla */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Lägg till rutin</p>
                  <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                    {allTasks
                      .filter((t) => !linkedTaskIds.has(t.id))
                      .map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleLinkTask(task.id)}
                          className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-otic-primary" />
                          <span className="truncate">{task.title}</span>
                        </button>
                      ))}
                    {allTasks.filter((t) => !linkedTaskIds.has(t.id)).length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400">Alla rutiner är kopplade.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!pendingPos && !selectedHotspot && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                <p className="text-xs text-gray-400">
                  Klicka på bilden för att lägga till en hotspot,<br />
                  eller klicka på en befintlig för att redigera.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
