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

    const supabase = createAdminClient();

    // 1) Hämta alla Auth-användare (Supabase) – dessa är "källan" för inloggningar.
    const authUsers: Array<{
      id: string;
      email: string | null;
      user_metadata?: { name?: string };
      created_at?: string;
    }> = [];

    let page = 1;
    const perPage = 1000;
    // Supabase admin listUsers är paginerad.
    // Vi loopar tills vi inte får tillbaka fler users.
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error(error);
        break;
      }
      const batch = (data?.users ?? []) as typeof authUsers;
      authUsers.push(...batch);
      if (!batch.length || batch.length < perPage) break;
      page += 1;
    }

    // 2) Hämta app-profiler (Prisma). Om DB-schemat saknas ska admin ändå kunna se Auth-användarna.
    let prismaUsers:
      | Array<{
          id: string;
          name: string;
          email: string;
          role: "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD";
          roles: Array<{ role: "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD" }>;
        }>
      | null = null;
    try {
      prismaUsers = await prisma.user.findMany({
        orderBy: [{ role: "asc" }, { name: "asc" }],
        include: { roles: { select: { role: true } } },
      });
    } catch (e) {
      console.error(e);
      prismaUsers = null;
    }

    const prismaById = new Map((prismaUsers ?? []).map((u) => [u.id, u]));
    const prismaByEmail = new Map(
      (prismaUsers ?? []).map((u) => [u.email.trim().toLowerCase(), u])
    );

    const merged = authUsers.map((authUser) => {
      const dbUserById = prismaById.get(authUser.id);
      const authEmailNorm = String(authUser.email ?? "").trim().toLowerCase();
      const dbUserByEmail = authEmailNorm ? prismaByEmail.get(authEmailNorm) : null;
      const dbUser = dbUserById ?? dbUserByEmail ?? null;
      const nameFromAuth =
        String(authUser.user_metadata?.name ?? "").trim() ||
        String(authUser.email ?? "").trim() ||
        "Okänd";

      if (dbUser) {
        return {
          id: authUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          roles: dbUser.roles.length ? dbUser.roles.map((r) => r.role) : [dbUser.role],
          hasProfile: true,
          idMismatch: !!dbUserByEmail && !dbUserById,
        };
      }

      return {
        id: authUser.id,
        name: nameFromAuth,
        email: String(authUser.email ?? ""),
        role: "NYANSTALLD" as const,
        roles: ["NYANSTALLD"] as const,
        hasProfile: false,
      };
    });

    // Om det finns app-profiler som saknar motsvarande Auth-användare (borde inte hända),
    // inkludera dem ändå så admin kan se/städa.
    const authIds = new Set(authUsers.map((u) => u.id));
    const dbOnly = (prismaUsers ?? [])
      .filter((u) => !authIds.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        roles: u.roles.length ? u.roles.map((r) => r.role) : [u.role],
        hasProfile: true,
      }));

    const combined = [...merged, ...dbOnly];

    // Stabil sortering: ADMIN först, sen Chef, Mentor, Nyanställd, och därefter namn.
    const rank = (role: string) =>
      ["ADMIN", "ARBETSLEDARE", "MENTOR", "NYANSTALLD"].indexOf(role);
    combined.sort((a, b) => {
      const ra = rank(a.role);
      const rb = rank(b.role);
      if (ra !== rb) return ra - rb;
      return String(a.name).localeCompare(String(b.name), "sv");
    });

    return NextResponse.json(combined);
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
