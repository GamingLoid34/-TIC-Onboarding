import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const { id } = await params;
    const system = await prisma.system.findUnique({ where: { id } });
    if (!system) {
      return NextResponse.json({ error: "Program hittades inte" }, { status: 404 });
    }
    return NextResponse.json(system);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta program" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, sortOrder } = body;

    const existing = await prisma.system.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Program hittades inte" }, { status: 404 });
    }

    const newName = name !== undefined ? String(name).trim() : existing.name;
    if (!newName) {
      return NextResponse.json({ error: "Namn krävs" }, { status: 400 });
    }

    const system = await prisma.$transaction(async (tx) => {
      const updated = await tx.system.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: newName }),
          ...(typeof sortOrder === "number" && { sortOrder }),
        },
      });
      if (newName !== existing.name) {
        await tx.systemChecklist.updateMany({
          where: { systemName: existing.name },
          data: { systemName: newName },
        });
      }
      return updated;
    });

    return NextResponse.json(system);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "";
    const isUnique = /unique|Unique/.test(msg);
    return NextResponse.json(
      { error: isUnique ? "Ett program med det namnet finns redan" : "Kunde inte uppdatera program" },
      { status: isUnique ? 409 : 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.system.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Program hittades inte" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.systemChecklist.deleteMany({ where: { systemName: existing.name } });
      await tx.system.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte radera program" },
      { status: 500 }
    );
  }
}
