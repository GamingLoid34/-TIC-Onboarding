import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

/** Uppdatera ordning på kategorier och/eller moment. Endast MENTOR, ARBETSLEDARE, ADMIN. */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["MENTOR", "ARBETSLEDARE", "ADMIN"])) {
      return NextResponse.json({ error: "Endast mentor, arbetsledare eller admin kan ändra ordning" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { categories: categoriesOrder, tasks: tasksOrder } = body as {
      categories?: { id: string; sortOrder: number }[];
      tasks?: { id: string; sortOrder: number; categoryId?: string }[];
    };

    if (Array.isArray(categoriesOrder) && categoriesOrder.length > 0) {
      await Promise.all(
        categoriesOrder.map(({ id, sortOrder }) =>
          prisma.category.update({
            where: { id },
            data: { sortOrder: Number(sortOrder) },
          })
        )
      );
    }

    if (Array.isArray(tasksOrder) && tasksOrder.length > 0) {
      await Promise.all(
        tasksOrder.map(({ id, sortOrder, categoryId }) =>
          prisma.task.update({
            where: { id },
            data: {
              sortOrder: Number(sortOrder),
              ...(typeof categoryId === "string" && categoryId ? { categoryId } : {}),
            },
          })
        )
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte spara ordning" },
      { status: 500 }
    );
  }
}
