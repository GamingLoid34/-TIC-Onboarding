"use client";

import Image from "next/image";
import { useState } from "react";
import { HotspotPopup } from "./HotspotPopup";

export interface SubTaskData {
  id: string;
  title: string;
  url: string | null;
  sortOrder: number;
}

export interface TaskData {
  id: string;
  title: string;
  description: string | null;
  subTasks: SubTaskData[];
}

export interface HotspotData {
  id: string;
  label: string;
  x: number; // 0–100 % från vänster
  y: number; // 0–100 % från toppen
  icon: string | null;
  tasks: { task: TaskData }[];
}

export interface WorkspaceImageData {
  id: string;
  imageUrl: string;
  label: string;
  hotspots: HotspotData[];
}

interface WorkspaceViewerProps {
  image: WorkspaceImageData;
  /** Om true visas hotspots med redigeringslägets stil (t.ex. större, mörkare) */
  editMode?: boolean;
  /** Callback när användaren klickar på en tom punkt i bilden (för admin-placering) */
  onImageClick?: (x: number, y: number) => void;
  /** Callback för att flytta en befintlig hotspot (drag-and-drop via admin-overlay) */
  onHotspotMove?: (id: string, x: number, y: number) => void;
}

export function WorkspaceViewer({
  image,
  editMode = false,
  onImageClick,
  onHotspotMove,
}: WorkspaceViewerProps) {
  const [activeHotspot, setActiveHotspot] = useState<HotspotData | null>(null);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onImageClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onImageClick(x, y);
  }

  function handleHotspotMouseDown(
    e: React.MouseEvent<HTMLButtonElement>,
    hotspot: HotspotData,
  ) {
    if (!editMode || !onHotspotMove) {
      // Läsläge – öppna popup
      e.stopPropagation();
      setActiveHotspot(hotspot);
      return;
    }

    // Redigeringsläge – starta drag
    e.stopPropagation();
    e.preventDefault();

    const container = (e.currentTarget as HTMLElement).closest(
      "[data-workspace-container]",
    ) as HTMLElement | null;
    if (!container) return;

    function onMouseMove(mv: MouseEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((mv.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((mv.clientY - rect.top) / rect.height) * 100));
      onHotspotMove!(hotspot.id, x, y);
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return (
    <>
      <div
        data-workspace-container
        className="relative w-full overflow-hidden rounded-xl shadow-lg"
        style={{ cursor: editMode && onImageClick ? "crosshair" : "default" }}
        onClick={editMode ? handleImageClick : undefined}
      >
        <Image
          src={image.imageUrl}
          alt={image.label}
          width={1920}
          height={1080}
          className="w-full object-cover"
          priority
        />

        {image.hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            onMouseDown={(e) => handleHotspotMouseDown(e, hotspot)}
            style={{
              position: "absolute",
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            className={[
              "group flex items-center justify-center rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2",
              editMode
                ? "h-9 w-9 border-amber-400 bg-amber-400/80 text-white shadow-lg hover:scale-110 cursor-grab active:cursor-grabbing"
                : "h-8 w-8 border-white bg-otic-primary/80 text-white shadow-md hover:scale-110 hover:bg-otic-primary",
            ].join(" ")}
            title={hotspot.label}
            aria-label={`Öppna ${hotspot.label}`}
          >
            <span className="text-xs font-bold">+</span>

            {/* Tooltip med label */}
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
              {hotspot.label}
            </span>
          </button>
        ))}
      </div>

      {activeHotspot && (
        <HotspotPopup
          hotspot={activeHotspot}
          onClose={() => setActiveHotspot(null)}
        />
      )}
    </>
  );
}
