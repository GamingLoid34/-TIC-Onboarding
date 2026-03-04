import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Användare hittades inte" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta användare" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, role } = body;

    const validRoles = ["ADMIN", "ARBETSLEDARE", "MENTOR", "NYANSTALLD"];
    if (role !== undefined && !validRoles.includes(String(role))) {
      return NextResponse.json(
        { error: "Ogiltig roll" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Användare hittades inte" }, { status: 404 });
    }

    if (email !== undefined) {
      const trimmed = String(email).trim().toLowerCase();
      const duplicate = await prisma.user.findFirst({
        where: { email: trimmed, id: { not: id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "En annan användare har redan den e-postadressen" },
          { status: 409 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(email !== undefined && { email: String(email).trim().toLowerCase() }),
        ...(role !== undefined && { role: String(role) as "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD" }),
      },
    });

    return NextResponse.json(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte uppdatera användare" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Användare hittades inte" }, { status: 404 });
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte radera användare" },
      { status: 500 }
    );
  }
}
