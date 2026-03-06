import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

const VALID_STATUSES = ["PENDING", "ORDERED", "READY"] as const;

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["ARBETSLEDARE"])) {
      return NextResponse.json(
        { error: "Endast chef kan ändra IT-status" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nyanstalldId, systemName, status } = body;

    if (!nyanstalldId || !systemName || !status) {
      return NextResponse.json(
        { error: "nyanstalldId, systemName och status krävs" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Ogiltig status" },
        { status: 400 }
      );
    }

    const updated = await prisma.systemChecklist.updateMany({
      where: {
        nyanstalldId: String(nyanstalldId),
        systemName: String(systemName),
      },
      data: { status: status as "PENDING" | "ORDERED" | "READY" },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "IT-system hittades inte för denna nyanställd" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte uppdatera status" },
      { status: 500 }
    );
  }
}
