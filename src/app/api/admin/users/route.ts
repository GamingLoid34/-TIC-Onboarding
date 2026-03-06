import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const currentUser = await getCurrentAppUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(currentUser.roles, ["ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: { roles: { select: { role: true } } },
    });
    return NextResponse.json(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles.length ? user.roles.map((entry) => entry.role) : [user.role],
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta användare" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentAppUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(currentUser.roles, ["ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, roles: rolesBody, password } = body;
    const emailNorm = String(email).trim().toLowerCase();
    const validRoles = ["ADMIN", "ARBETSLEDARE", "MENTOR", "NYANSTALLD"];

    const roleList = Array.isArray(rolesBody) && rolesBody.length
      ? rolesBody.filter((item: string) => validRoles.includes(String(item)))
      : role
        ? [String(role)]
        : [];
    const primaryRole = roleList[0] || role;

    if (!name?.trim() || !emailNorm) {
      return NextResponse.json(
        { error: "Namn och e-post krävs" },
        { status: 400 }
      );
    }
    if (!roleList.length) {
      return NextResponse.json(
        { error: "Minst en roll krävs" },
        { status: 400 }
      );
    }

    if (!password || String(password).length < 6) {
      return NextResponse.json(
        { error: "Lösenord krävs (minst 6 tecken)" },
        { status: 400 }
      );
    }

    if (!primaryRole || !validRoles.includes(String(primaryRole))) {
      return NextResponse.json(
        { error: "Ogiltig roll" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: emailNorm },
    });
    if (existing) {
      return NextResponse.json(
        { error: "En användare med den e-postadressen finns redan" },
        { status: 409 }
      );
    }

    const supabase = createAdminClient();
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: emailNorm,
      password: String(password),
      email_confirm: true,
      user_metadata: { name: String(name).trim() },
    });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Den e-postadressen är redan registrerad i inloggningen." },
          { status: 409 }
        );
      }
      console.error(authError);
      return NextResponse.json(
        { error: authError.message || "Kunde inte skapa inloggning" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        id: authUser.user.id,
        name: String(name).trim(),
        email: emailNorm,
        role: String(primaryRole) as "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD",
        roles: {
          create: roleList.map((item: string) => ({
            role: item as "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD",
          })),
        },
      },
      include: { roles: { select: { role: true } } },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roles: user.roles.length ? user.roles.map((entry) => entry.role) : [user.role],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte skapa användare" },
      { status: 500 }
    );
  }
}
