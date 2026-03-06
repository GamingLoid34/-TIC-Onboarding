import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { AppRole, normalizeRoles } from "./roles";

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: typeof session.user.user_metadata?.name === "string" ? session.user.user_metadata.name : null,
      role: null,
      roles: [],
    };
  }

  const roles = normalizeRoles([user.role]);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roles,
  };
}
