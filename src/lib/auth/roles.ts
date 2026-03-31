export type AppRole = "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD";

export const ROLE_ORDER: AppRole[] = ["ADMIN", "ARBETSLEDARE", "MENTOR", "NYANSTALLD"];

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Admin",
  ARBETSLEDARE: "Chef",
  MENTOR: "Mentor",
  NYANSTALLD: "Nyanställd",
};

export interface NavItem {
  href: string;
  label: string;
}

export function sortRoles(roles: AppRole[]) {
  return [...roles].sort(
    (a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b)
  );
}

export function normalizeRoles(input: unknown): AppRole[] {
  const raw = Array.isArray(input) ? input : [];
  const valid = raw.filter((role): role is AppRole =>
    ROLE_ORDER.includes(role as AppRole)
  );
  return sortRoles(Array.from(new Set(valid)));
}

export function getPrimaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("ARBETSLEDARE")) return "ARBETSLEDARE";
  if (roles.includes("MENTOR")) return "MENTOR";
  return "NYANSTALLD";
}

export function buildNavItems(roles: AppRole[]): NavItem[] {
  const items: NavItem[] = [];
  const canSeeMentor =
    roles.includes("NYANSTALLD") ||
    roles.includes("MENTOR") ||
    roles.includes("ARBETSLEDARE") ||
    roles.includes("ADMIN");

  if (canSeeMentor) {
    items.push({ href: "/mentor", label: "Onboarding" });
  }
  if (
    roles.includes("MENTOR") ||
    roles.includes("ARBETSLEDARE") ||
    roles.includes("ADMIN")
  ) {
    items.push({ href: "/dashboard", label: "Dashboard" });
  }
  // Användare nås via Inställningar → Gå till admin (tas inte med i huvudnav)

  const deduped = new Map<string, NavItem>();
  items.forEach((item) => {
    if (!deduped.has(item.href)) deduped.set(item.href, item);
  });
  return Array.from(deduped.values());
}

export function getDefaultRoute(roles: AppRole[]) {
  if (roles.includes("ADMIN")) return "/dashboard";
  if (roles.includes("ARBETSLEDARE")) return "/dashboard";
  if (roles.includes("MENTOR")) return "/dashboard";
  return "/mentor";
}

export function hasRole(roles: AppRole[], role: AppRole) {
  return roles.includes(role);
}

export function hasAnyRole(roles: AppRole[], allowed: AppRole[]) {
  return allowed.some((role) => roles.includes(role));
}
