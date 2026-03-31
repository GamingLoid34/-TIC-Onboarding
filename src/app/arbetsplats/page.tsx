"use client";

import { useEffect, useState } from "react";
import { WorkspaceViewer, type WorkspaceImageData } from "@/components/WorkspaceViewer";
import { WorkspaceSidebar, type SystemData } from "@/components/WorkspaceSidebar";

export default function ArbetsplatsPage() {
  const [image, setImage] = useState<WorkspaceImageData | null>(null);
  const [systems, setSystems] = useState<SystemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/arbetsplats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/systems").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([img, sys]) => {
        setImage(img);
        setSystems(sys ?? []);
      })
      .catch(() => setError("Kunde inte hämta arbetsplatsen."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-gray-400">Laddar arbetsplats…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-sm font-medium text-gray-500">Ingen arbetsplats är inställd ännu.</p>
        <p className="text-xs text-gray-400">Kontakta din mentor eller admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Min arbetsplats</h1>
      <p className="text-sm text-gray-500">
        Klicka på en markerad punkt för att se rutiner och länkar kopplade till den.
      </p>

      <div className="flex gap-4 items-start">
        <div className="min-w-0 flex-1">
          <WorkspaceViewer image={image} />
        </div>
        <WorkspaceSidebar systems={systems} />
      </div>
    </div>
  );
}
