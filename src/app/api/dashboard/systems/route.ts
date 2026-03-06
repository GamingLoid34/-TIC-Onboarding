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
    if (!hasAnyRole(user.roles, ["ARBETSLEDARE", "ADMIN"])) {
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

    const nid = String(nyanstalldId);
    const sname = String(systemName);
    const newStatus = status as "PENDING" | "ORDERED" | "READY";

    await prisma.systemChecklist.upsert({
      where: {
        nyanstalldId_systemName: { nyanstalldId: nid, systemName: sname },
      },
      create: {
        nyanstalldId: nid,
        systemName: sname,
        status: newStatus,
      },
      update: { status: newStatus },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte uppdatera status" },
      { status: 500 }
    );
  }
}
