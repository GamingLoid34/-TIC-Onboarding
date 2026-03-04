import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const nyanstallda = await prisma.user.findMany({
      where: { role: "NYANSTALLD" },
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
