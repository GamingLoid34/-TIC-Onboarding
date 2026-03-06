import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentAppUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(currentUser.roles, ["ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: { select: { role: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: "Användare hittades inte" }, { status: 404 });
    }
    return NextResponse.json({
      ...user,
      roles: user.roles.length ? user.roles.map((entry) => entry.role) : [user.role],
    });
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
    const currentUser = await getCurrentAppUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(currentUser.roles, ["ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, role, roles: rolesBody } = body;

    const validRoles = ["ADMIN", "ARBETSLEDARE", "MENTOR", "NYANSTALLD"];
    const roleList = Array.isArray(rolesBody) && rolesBody.length
      ? rolesBody.filter((item: string) => validRoles.includes(String(item)))
      : role !== undefined
        ? [String(role)]
        : undefined;

    if (roleList !== undefined && !roleList.length) {
      return NextResponse.json(
        { error: "Minst en roll krävs" },
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

    if (roleList) {
      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.createMany({
        data: roleList.map((item) => ({
          userId: id,
          role: item as "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD",
        })),
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(email !== undefined && { email: String(email).trim().toLowerCase() }),
        ...(roleList?.length && {
          role: roleList[0] as "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD",
        }),
      },
      include: { roles: { select: { role: true } } },
    });

    return NextResponse.json({
      ...user,
      roles: user.roles.length ? user.roles.map((entry) => entry.role) : [user.role],
    });
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
    const currentUser = await getCurrentAppUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(currentUser.roles, ["ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

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
