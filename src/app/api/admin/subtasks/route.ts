import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, url, taskId, sortOrder } = body;

    if (!title || !taskId) {
      return NextResponse.json(
        { error: "title och taskId krävs" },
        { status: 400 }
      );
    }

    const taskExists = await prisma.task.findUnique({ where: { id: String(taskId) } });
    if (!taskExists) {
      return NextResponse.json(
        { error: "Uppgift hittades inte" },
        { status: 404 }
      );
    }

    const subTask = await prisma.subTask.create({
      data: {
        title: String(title).trim(),
        url: body.url != null ? String(url).trim() || null : null,
        taskId: String(taskId),
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
      include: { task: true },
    });

    return NextResponse.json(subTask);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte skapa delmoment" },
      { status: 500 }
    );
  }
}
