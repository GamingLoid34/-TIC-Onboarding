import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    if (!hasAnyRole(user.roles, ["ADMIN"])) return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    const systems = await prisma.system.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(systems);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Kunde inte hämta program" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser();
    if (!user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    if (!hasAnyRole(user.roles, ["ADMIN"])) return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    const body = await request.json();
    const name = body.name != null ? String(body.name).trim() : "";
    if (!name) return NextResponse.json({ error: "Namn krävs" }, { status: 400 });
    const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;
    const system = await prisma.system.create({
      data: { name, sortOrder },
    });
    return NextResponse.json(system);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json(
      { error: /unique|Unique/.test(msg) ? "Ett program med det namnet finns redan" : "Kunde inte skapa program" },
      { status: /unique|Unique/.test(msg) ? 409 : 500 }
    );
  }
}
