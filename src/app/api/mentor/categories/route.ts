import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["NYANSTALLD", "MENTOR", "ARBETSLEDARE"])) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        tasks: {
          orderBy: { sortOrder: "asc" },
          include: {
            subTasks: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });

    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      tasks: c.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        categoryId: t.categoryId,
        requiredSystemName: t.requiredSystemName,
        sortOrder: t.sortOrder,
        subTasks: t.subTasks.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          sortOrder: s.sortOrder,
        })),
      })),
    }));

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta kategorier" },
      { status: 500 }
    );
  }
}
