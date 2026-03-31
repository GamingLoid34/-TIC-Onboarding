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
    if (!hasAnyRole(user.roles, ["ADMIN", "MENTOR"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        category: true,
        subTasks: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Uppgift hittades inte" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta uppgift" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["ADMIN", "MENTOR"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, categoryId, sortOrder } = body;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Uppgift hittades inte" }, { status: 404 });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(description !== undefined && { description: String(description).trim() || null }),
        ...(categoryId !== undefined && { categoryId: String(categoryId) }),
        ...(typeof sortOrder === "number" && { sortOrder }),
      },
      include: {
        category: true,
        subTasks: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte uppdatera uppgift" },
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
    if (!hasAnyRole(user.roles, ["ADMIN", "MENTOR"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Uppgift hittades inte" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte radera uppgift" },
      { status: 500 }
    );
  }
}
