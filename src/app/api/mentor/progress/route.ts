import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const nyanstalldId = request.nextUrl.searchParams.get("nyanstalldId");
  if (!nyanstalldId) {
    return NextResponse.json(
      { error: "nyanstalldId krävs" },
      { status: 400 }
    );
  }
  try {
    const progress = await prisma.taskProgress.findMany({
      where: { nyanstalldId },
      include: { task: true },
    });

    const data = progress.map((p) => ({
      taskId: p.taskId,
      isVisad: p.isVisad,
      isKan: p.isKan,
      notes: p.notes ?? "",
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
