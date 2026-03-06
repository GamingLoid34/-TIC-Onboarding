import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const { name, email, role, roles: rolesBody, password } = body;

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

    const supabase = createAdminClient();

    // Uppdatera Supabase Auth (lösenord / e-post / metadata) om något av det skickas in.
    const updateAuth: Record<string, unknown> = {};
    if (email !== undefined) {
      const trimmed = String(email).trim().toLowerCase();
      if (!trimmed) {
        return NextResponse.json({ error: "Ogiltig e-post" }, { status: 400 });
      }
      updateAuth.email = trimmed;
      // Admin-ändring: undvik att hamna i "unconfirmed" läge.
      updateAuth.email_confirm = true;
    }
    if (name !== undefined) {
      updateAuth.user_metadata = { name: String(name).trim() };
    }
    if (password !== undefined) {
      const pwd = String(password);
      if (pwd.length < 6) {
        return NextResponse.json(
          { error: "Lösenordet måste vara minst 6 tecken" },
          { status: 400 }
        );
      }
      updateAuth.password = pwd;
    }

    if (Object.keys(updateAuth).length) {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, updateAuth);
      if (authError) {
        console.error(authError);
        return NextResponse.json(
          { error: authError.message || "Kunde inte uppdatera inloggning" },
          { status: 400 }
        );
      }
    }

    // Prisma-profil + roller (om DB finns). Saknas profilen men roller skickas in:
    // skapa profilen ("importera" Auth-user till appens DB).
    let existing: { id: string; name: string; email: string; role: string } | null = null;
    try {
      existing = await prisma.user.findUnique({ where: { id } });
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        {
          error:
            "Databasschemat saknas eller är trasigt. Kör Prisma db push/migrations mot Supabase innan du kan hantera roller i appen.",
        },
        { status: 500 }
      );
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

    // Skapa profil om den saknas och admin skickar roller.
    if (!existing && roleList) {
      const { data: authData, error: authGetError } = await supabase.auth.admin.getUserById(id);
      if (authGetError) {
        console.error(authGetError);
        return NextResponse.json(
          { error: authGetError.message || "Kunde inte hämta inloggning" },
          { status: 400 }
        );
      }
      const authEmail = String(authData?.user?.email ?? "");
      const authName = String((authData?.user?.user_metadata as { name?: string } | null)?.name ?? "");

      const createEmail = (email !== undefined ? String(email).trim().toLowerCase() : authEmail).trim();
      const createName = (name !== undefined ? String(name).trim() : authName).trim() || createEmail;

      if (!createEmail) {
        return NextResponse.json(
          { error: "Användaren saknar e-post och kan inte importeras" },
          { status: 400 }
        );
      }

      const created = await prisma.user.create({
        data: {
          id,
          name: createName,
          email: createEmail,
          role: roleList[0] as "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD",
          roles: {
            create: roleList.map((item) => ({
              role: item as "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD",
            })),
          },
        },
        include: { roles: { select: { role: true } } },
      });

      return NextResponse.json({
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        roles: created.roles.length ? created.roles.map((entry) => entry.role) : [created.role],
        hasProfile: true,
      });
    }

    if (!existing) {
      // Om profilen saknas och bara lösenord/e-post uppdateras i Auth: returnera ett minimalt svar.
      return NextResponse.json({ success: true, hasProfile: false });
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
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roles: user.roles.length ? user.roles.map((entry) => entry.role) : [user.role],
      hasProfile: true,
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
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: "Du kan inte ta bort ditt eget konto." },
        { status: 400 }
      );
    }

    // Radera i Prisma om profilen finns (kan saknas om det är en Auth-only user).
    try {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (existing) {
        await prisma.user.delete({ where: { id } });
      }
    } catch (e) {
      console.error(e);
      // Fortsätt ändå och försök radera inloggningen.
    }

    const supabase = createAdminClient();
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      console.error(authError);
      return NextResponse.json(
        { error: authError.message || "Kunde inte radera inloggning" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte radera användare" },
      { status: 500 }
    );
  }
}
