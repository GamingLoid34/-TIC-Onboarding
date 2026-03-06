import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

export async function PUT(
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
    const { title, url, sortOrder } = body;

    const existing = await prisma.subTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Delmoment hittades inte" }, { status: 404 });
    }

    const subTask = await prisma.subTask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(url !== undefined && { url: String(url).trim() || null }),
        ...(typeof sortOrder === "number" && { sortOrder }),
      },
      include: { task: true },
    });

    return NextResponse.json(subTask);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte uppdatera delmoment" },
      { status: 500 }
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

    const existing = await prisma.subTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Delmoment hittades inte" }, { status: 404 });
    }

    await prisma.subTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte radera delmoment" },
      { status: 500 }
    );
  }
}
