import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["ADMIN", "MENTOR"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const [tasks, categories] = await Promise.all([
      prisma.task.findMany({
        orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
        include: {
          category: true,
          subTasks: { orderBy: { sortOrder: "asc" } },
        },
      }),
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return NextResponse.json({ tasks, categories });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta uppgifter" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["ADMIN", "MENTOR"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, categoryId, sortOrder } = body;

    if (!title || !categoryId) {
      return NextResponse.json(
        { error: "title och categoryId krävs" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: body.description != null ? String(description).trim() || undefined : undefined,
        categoryId: String(categoryId),
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
      include: {
        category: true,
        subTasks: true,
      },
    });

    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte skapa uppgift" },
      { status: 500 }
    );
  }
}
