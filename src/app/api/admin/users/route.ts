import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { name, email, role } = body;

    if (!name?.trim() || !email?.trim() || !role) {
      return NextResponse.json(
        { error: "name, email och role krävs" },
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
      where: { email: String(email).trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "En användare med den e-postadressen finns redan" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
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
