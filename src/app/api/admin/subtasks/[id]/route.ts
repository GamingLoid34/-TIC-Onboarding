import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, url, sortOrder } = body;

    const existing = await prisma.subTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Delmoment hittades inte" }, { status: 404 });
    }

    const subTask = await prisma.subTask.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(url !== undefined && { url: String(url).trim() || null }),
        ...(typeof sortOrder === "number" && { sortOrder }),
      },
      include: { task: true },
    });

    return NextResponse.json(subTask);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte uppdatera delmoment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.subTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Delmoment hittades inte" }, { status: 404 });
    }

    await prisma.subTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte radera delmoment" },
      { status: 500 }
    );
  }
}
