import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

/**
 * POST /api/admin/reset-users
 * Rensar alla användare i app-databasen och i Supabase Auth så ni kan börja om.
 * Kräver ADMIN. Valfritt body: { email, password, name } för att skapa första användaren direkt efter reset.
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentAppUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(currentUser.roles, ["ADMIN"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    let firstUser: { email: string; password: string; name: string } | null = null;
    try {
      const body = await request.json().catch(() => ({}));
      if (body?.email && body?.password && body?.name) {
        const email = String(body.email).trim().toLowerCase();
        const password = String(body.password);
        const name = String(body.name).trim();
        if (email && password.length >= 6 && name) {
          firstUser = { email, password, name };
        }
      }
    } catch {
      // ingen body eller ogiltig JSON
    }

    // 1) Rensa app-databasen i rätt ordning (FK). Hoppa över tabeller som saknas (t.ex. UserRole om patchen inte körts).
    const steps = [
      () => prisma.subTaskProgress.deleteMany({}),
      () => prisma.taskProgress.deleteMany({}),
      () => prisma.systemChecklist.deleteMany({}),
      () => prisma.userRole.deleteMany({}),
      () => prisma.user.deleteMany({}),
    ];
    for (const step of steps) {
      try {
        await step();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (/does not exist|saknas/i.test(msg)) {
          console.warn("Tabell saknas, hoppar över:", msg);
          continue;
        }
        console.error(e);
        return NextResponse.json(
          {
            error:
              "Kunde inte rensa användardata i databasen. Detalj: " +
              (e instanceof Error ? e.message : "Okänt fel"),
          },
          { status: 500 }
        );
      }
    }

    // 2) Rensa Supabase Auth
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (e) {
      return NextResponse.json(
        {
          error:
            "Supabase admin-klient kunde inte skapas. Kontrollera miljövariabler. Auth-användare har inte rensats.",
        },
        { status: 500 }
      );
    }

    const deletedAuthIds: string[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error(error);
        return NextResponse.json(
          {
            error:
              "Kunde inte lista Auth-användare. Kontrollera SUPABASE_SERVICE_ROLE_KEY. Detalj: " +
              error.message,
          },
          { status: 500 }
        );
      }
      const users = data?.users ?? [];
      for (const u of users) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) console.error(delErr);
        else deletedAuthIds.push(u.id);
      }
      if (users.length < perPage) break;
      page += 1;
    }

    // 3) Om önskat: skapa första användaren (Auth + Prisma med ADMIN)
    if (firstUser) {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: firstUser.email,
        password: firstUser.password,
        email_confirm: true,
        user_metadata: { name: firstUser.name },
      });
      if (authError) {
        return NextResponse.json(
          {
            error:
              "Användardata och Auth rensade, men kunde inte skapa första användaren. Logga in via Supabase Dashboard och lägg till en användare manuellt. Detalj: " +
              authError.message,
          },
          { status: 400 }
        );
      }
      const newId = authUser.user?.id;
      if (newId) {
        try {
          await prisma.user.create({
            data: {
              id: newId,
              name: firstUser.name,
              email: firstUser.email,
              role: "ADMIN",
              roles: {
                create: [{ role: "ADMIN" }],
              },
            },
          });
        } catch (e) {
          console.error(e);
          return NextResponse.json(
            {
              error:
                "Auth-användare skapad men profilen kunde inte skapas i databasen. Logga in med " +
                firstUser.email +
                " och importera användaren under Admin > Användare. Detalj: " +
                (e instanceof Error ? e.message : "Okänt fel"),
            },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: firstUser
        ? "Alla användare borttagna. Första användaren skapad – logga in med " +
          firstUser.email
        : "Alla användare borttagna. Lägg till en användare via Supabase Dashboard (Authentication > Users) och importera under Admin > Användare, eller använd formuläret här efter att du skapat en användare i Supabase.",
      deletedAuthCount: deletedAuthIds.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Kunde inte rensa användare",
      },
      { status: 500 }
    );
  }
}
