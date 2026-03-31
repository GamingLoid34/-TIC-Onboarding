"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { HotspotData, WorkspaceImageData } from "./WorkspaceViewer";

interface WorkspaceAdminOverlayProps {
  image: WorkspaceImageData;
  /** Kallas när admin klickar på en tom del av bilden – skapar ny hotspot */
  onImageClick: (x: number, y: number) => void;
  /** Kallas när en hotspot dragits till ny position och musen släppts */
  onHotspotMove: (id: string, x: number, y: number) => void;
  /** Kallas när admin klickar på en hotspot (väljer den för task-koppling) */
  onHotspotSelect: (hotspot: HotspotData) => void;
  /** ID på markerad hotspot */
  selectedHotspotId: string | null;
  /** Kallas för att ta bort en hotspot */
  onHotspotDelete: (id: string) => void;
}

export function WorkspaceAdminOverlay({
  image,
  onImageClick,
  onHotspotMove,
  onHotspotSelect,
  selectedHotspotId,
  onHotspotDelete,
}: WorkspaceAdminOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Vilken hotspot som just nu dras, plus lokal position (% av container)
  const [dragging, setDragging] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // --- Hjälpfunktion: pixlar → % av containern ---
  function toPercent(clientX: number, clientY: number) {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  // --- Container-nivå: mouse move ---
  function handleContainerMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging) return;
    const { x, y } = toPercent(e.clientX, e.clientY);
    setDragging((prev) => (prev ? { ...prev, x, y } : null));
  }

  // --- Container-nivå: mouse up → spara ny position ---
  function handleContainerMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging) return;
    const { x, y } = toPercent(e.clientX, e.clientY);
    onHotspotMove(dragging.id, x, y);
    setDragging(null);
  }

  // --- Container-nivå: klick på tom yta → ny hotspot ---
  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    // Ignorera om vi precis avslutade ett drag
    if (dragging) return;
    // Ignorera klick på hotspot-knappar
    if ((e.target as HTMLElement).closest("[data-hotspot]")) return;
    const { x, y } = toPercent(e.clientX, e.clientY);
    onImageClick(x, y);
  }

  // --- Hotspot mousedown → starta drag ---
  function handleHotspotMouseDown(
    e: React.MouseEvent<HTMLButtonElement>,
    hotspot: HotspotData,
  ) {
    e.stopPropagation();
    setDragging({ id: hotspot.id, x: hotspot.x, y: hotspot.y });
  }

  // --- Hotspot click (utan drag) → välj ---
  function handleHotspotClick(
    e: React.MouseEvent<HTMLButtonElement>,
    hotspot: HotspotData,
  ) {
    e.stopPropagation();
    onHotspotSelect(hotspot);
  }

  // Nuvarande position (live under drag, annars från data)
  function getPos(hotspot: HotspotData) {
    if (dragging?.id === hotspot.id) return { x: dragging.x, y: dragging.y };
    return { x: hotspot.x, y: hotspot.y };
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl shadow-lg"
      style={{ cursor: dragging ? "grabbing" : "crosshair" }}
      onMouseMove={handleContainerMouseMove}
      onMouseUp={handleContainerMouseUp}
      onClick={handleContainerClick}
    >
      <Image
        src={image.imageUrl}
        alt={image.label}
        width={1920}
        height={1080}
        className="w-full object-cover select-none"
        draggable={false}
        priority
      />

      {image.hotspots.map((hotspot) => {
        const { x, y } = getPos(hotspot);
        const isSelected = selectedHotspotId === hotspot.id;
        const isDraggingThis = dragging?.id === hotspot.id;

        return (
          <div
            key={hotspot.id}
            data-hotspot
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: isDraggingThis ? 50 : 10,
            }}
          >
            <button
              type="button"
              onMouseDown={(e) => handleHotspotMouseDown(e, hotspot)}
              onClick={(e) => handleHotspotClick(e, hotspot)}
              className={[
                "group flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-lg transition-all focus:outline-none",
                isSelected
                  ? "border-white bg-otic-primary text-white scale-110 ring-2 ring-otic-primary ring-offset-2"
                  : "border-white bg-amber-400 text-white hover:scale-110",
                isDraggingThis ? "cursor-grabbing scale-125" : "cursor-grab",
              ].join(" ")}
              title={hotspot.label}
            >
              <span className="text-xs font-bold">+</span>

              {/* Tooltip */}
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                {hotspot.label}
              </span>
            </button>

            {/* Ta bort-knapp vid sidan av hotspot */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onHotspotDelete(hotspot.id);
              }}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 focus:outline-none"
              title={`Ta bort ${hotspot.label}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
