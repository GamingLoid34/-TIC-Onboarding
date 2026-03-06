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
    const nyanstallda = await prisma.user.findMany({
      where: onlySelf ? { id: user.id } : { role: "NYANSTALLD" },
      include: { systemChecklists: true },
    });

    const data = nyanstallda.map((n) => ({
      id: n.id,
      name: n.name,
      systems: n.systemChecklists.map((s) => ({
        systemName: s.systemName,
        status: s.status,
      })),
    }));

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta nyanställda" },
      { status: 500 }
    );
  }
}
