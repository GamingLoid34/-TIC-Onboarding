import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["NYANSTALLD", "MENTOR", "ARBETSLEDARE", "ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const onlySelf = user.roles.includes("NYANSTALLD") && !hasAnyRole(user.roles, ["MENTOR", "ARBETSLEDARE", "ADMIN"]);
    const [nyanstallda, systemsFromDb, systemNamesFromTasks] = await Promise.all([
      prisma.user.findMany({
        where: onlySelf ? { id: user.id } : { role: "NYANSTALLD" },
        include: { systemChecklists: true },
      }),
      prisma.system.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true } }),
      prisma.task.findMany({ where: { requiredSystemName: { not: null } }, select: { requiredSystemName: true } }),
    ]);

    const allSystemNames =
      systemsFromDb.length > 0
        ? systemsFromDb.map((s) => s.name)
        : Array.from(new Set((systemNamesFromTasks.map((t) => t.requiredSystemName).filter(Boolean) as string[]).sort()));

    const data = nyanstallda.map((n) => {
      const byName = new Map(n.systemChecklists.map((s) => [s.systemName, s.status]));
      const systems =
        allSystemNames.length > 0
          ? allSystemNames.map((systemName) => ({
              systemName,
              status: (byName.get(systemName) ?? "PENDING") as "PENDING" | "ORDERED" | "READY",
            }))
          : n.systemChecklists.map((s) => ({ systemName: s.systemName, status: s.status }));
      return {
        id: n.id,
        name: n.name,
        systems,
      };
    });

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta nyanställda" },
      { status: 500 }
    );
  }
}
