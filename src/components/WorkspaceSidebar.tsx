"use client";

import {
  Activity,
  Calendar,
  FileText,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Mail,
  Map,
  MessageSquare,
  Monitor,
  Phone,
  Radio,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SystemData {
  id: string;
  name: string;
  url: string | null;
  icon: string | null;
  sortOrder: number;
}

interface WorkspaceSidebarProps {
  systems: SystemData[];
}

/** Mappar ikonnamn (strängar från databasen) till Lucide-komponenter */
const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  Calendar,
  FileText,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Mail,
  Map,
  MessageSquare,
  Monitor,
  Phone,
  Radio,
  Settings,
  Users,
};

function SystemIcon({ name }: { name: string | null }) {
  const Icon = name ? (ICON_MAP[name] ?? Monitor) : Monitor;
  return <Icon className="h-5 w-5 shrink-0" />;
}

export function WorkspaceSidebar({ systems }: WorkspaceSidebarProps) {
  if (systems.length === 0) {
    return (
      <aside className="flex w-56 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Datorprogram
        </h2>
        <p className="text-xs text-gray-400">Inga program tillagda ännu.</p>
      </aside>
    );
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Datorprogram
        </h2>
      </div>

      <ul className="flex flex-col gap-0.5 p-2">
        {systems.map((system) => {
          const inner = (
            <span className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors group-hover:bg-otic-surface group-hover:text-otic-primary">
              <SystemIcon name={system.icon} />
              <span className="truncate">{system.name}</span>
            </span>
          );

          return (
            <li key={system.id} className="group">
              {system.url ? (
                <a
                  href={system.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={system.name}
                >
                  {inner}
                </a>
              ) : (
                <div title={system.name}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
