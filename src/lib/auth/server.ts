import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AppRole, getPrimaryRole, normalizeRoles } from "./roles";

export interface CurrentAppUser {
  id: string;
  email: string | null;
  name: string | null;
  role: AppRole | null;
  roles: AppRole[];
}

export async function getCurrentAppUser(): Promise<CurrentAppUser | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) return null;

  // Under rollout kan databasen sakna UserRole-tabellen.
  // För att undvika driftstopp försöker vi läsa roles, men faller tillbaka till User.role om det inte går.
  let user:
    | {
        id: string;
        email: string;
        name: string;
        role: AppRole;
        roles?: { role: AppRole }[];
      }
    | null = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        roles: { select: { role: true } },
      },
    });
  } catch (e) {
    console.warn("Falling back to User.role (UserRole missing?)", e);
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  if (!user) {
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: typeof session.user.user_metadata?.name === "string" ? session.user.user_metadata.name : null,
      role: null,
      roles: [],
    };
  }

  const roles = user.roles?.length
    ? normalizeRoles(user.roles.map((entry) => entry.role))
    : normalizeRoles([user.role]);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: roles.length ? getPrimaryRole(roles) : null,
    roles,
  };
}
