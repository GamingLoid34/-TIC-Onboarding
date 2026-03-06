import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAppUser } from "@/lib/auth/server";
import { hasAnyRole } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }
  if (!hasAnyRole(user.roles, ["NYANSTALLD", "MENTOR", "ARBETSLEDARE", "ADMIN"])) {
    return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
  }

  const nyanstalldId = request.nextUrl.searchParams.get("nyanstalldId");
  if (!nyanstalldId) {
    return NextResponse.json(
      { error: "nyanstalldId krävs" },
      { status: 400 }
    );
  }
  try {
    const selfOnly = user.roles.includes("NYANSTALLD") && !hasAnyRole(user.roles, ["MENTOR", "ARBETSLEDARE", "ADMIN"]);
    if (selfOnly && nyanstalldId !== user.id) {
      return NextResponse.json({ error: "Ingen behörighet" }, { status: 403 });
    }

    const progress = await prisma.taskProgress.findMany({
      where: { nyanstalldId },
      include: { task: true },
    });

    const data = progress.map((p) => ({
      taskId: p.taskId,
      isVisad: p.isVisad,
      isKan: p.isKan,
      notes: selfOnly ? "" : (p.notes ?? ""),
    }));

    return NextResponse.json(data);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta progress" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
    }
    if (!hasAnyRole(user.roles, ["MENTOR", "ARBETSLEDARE", "ADMIN"])) {
      return NextResponse.json({ error: "Endast mentor eller chef kan ändra progress" }, { status: 403 });
    }

    const body = await request.json();
    const { nyanstalldId, taskId, isVisad, isKan, notes } = body;

    if (!nyanstalldId || !taskId) {
      return NextResponse.json(
        { error: "nyanstalldId och taskId krävs" },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateData: {
      isVisad?: boolean;
      visadAt?: Date | null;
      isKan?: boolean;
      kanAt?: Date | null;
      notes?: string | null;
    } = {};

    if (typeof isVisad === "boolean") {
      updateData.isVisad = isVisad;
      updateData.visadAt = isVisad ? now : null;
    }
    if (typeof isKan === "boolean") {
      updateData.isKan = isKan;
      updateData.kanAt = isKan ? now : null;
    }
    if (typeof notes === "string") updateData.notes = notes || null;

    const progress = await prisma.taskProgress.upsert({
      where: {
        taskId_nyanstalldId: { taskId, nyanstalldId },
      },
      create: {
        taskId,
        nyanstalldId,
        ...updateData,
        isVisad: updateData.isVisad ?? false,
        isKan: updateData.isKan ?? false,
      },
      update: updateData,
    });

    return NextResponse.json({
      taskId: progress.taskId,
      isVisad: progress.isVisad,
      isKan: progress.isKan,
      notes: progress.notes ?? "",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte spara progress" },
      { status: 500 }
    );
  }
}
