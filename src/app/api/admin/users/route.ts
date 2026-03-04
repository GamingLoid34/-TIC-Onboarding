import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(users);
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
    const body = await request.json();
    const { name, email, role, password } = body;
    const emailNorm = String(email).trim().toLowerCase();

    if (!name?.trim() || !emailNorm || !role) {
      return NextResponse.json(
        { error: "Namn, e-post och roll krävs" },
        { status: 400 }
      );
    }

    if (!password || String(password).length < 6) {
      return NextResponse.json(
        { error: "Lösenord krävs (minst 6 tecken)" },
        { status: 400 }
      );
    }

    const validRoles = ["ADMIN", "ARBETSLEDARE", "MENTOR", "NYANSTALLD"];
    if (!validRoles.includes(String(role))) {
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
        role: String(role) as "ADMIN" | "ARBETSLEDARE" | "MENTOR" | "NYANSTALLD",
      },
    });

    return NextResponse.json(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte skapa användare" },
      { status: 500 }
    );
  }
}
