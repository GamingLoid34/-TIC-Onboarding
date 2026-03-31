"use client";

import { ExternalLink, X } from "lucide-react";
import { useEffect } from "react";
import type { HotspotData } from "./WorkspaceViewer";

interface HotspotPopupProps {
  hotspot: HotspotData;
  onClose: () => void;
}

export function HotspotPopup({ hotspot, onClose }: HotspotPopupProps) {
  // Stäng med Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tasks = hotspot.tasks.map((ht) => ht.task);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{hotspot.label}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Stäng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Innehåll */}
        <div className="divide-y divide-gray-100 px-6 py-4">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Inga rutiner kopplade till den här punkten ännu.
            </p>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="py-4 first:pt-0 last:pb-0">
                <h3 className="mb-2 text-sm font-semibold text-gray-800">
                  {task.title}
                </h3>

                {task.description && (
                  <p className="mb-3 text-sm text-gray-500">{task.description}</p>
                )}

                {task.subTasks.length > 0 && (
                  <ul className="space-y-1.5">
                    {task.subTasks.map((sub) => (
                      <li key={sub.id}>
                        {sub.url ? (
                          <a
                            href={sub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-otic-primary hover:bg-otic-surface hover:underline transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            {sub.title}
                          </a>
                        ) : (
                          <span className="block px-2.5 py-1.5 text-sm text-gray-600">
                            {sub.title}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
