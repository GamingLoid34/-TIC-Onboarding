import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function requireAdminOrMentor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser || !["ADMIN", "MENTOR"].includes(dbUser.role)) return null;
  return dbUser;
}

// POST /api/arbetsplats/hotspots/[id]/tasks – koppla en task till hotspot
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdminOrMentor()) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { taskId } = await req.json() as { taskId: string };
  if (!taskId) return NextResponse.json({ error: "taskId krävs" }, { status: 400 });

  const link = await prisma.hotspotTask.create({
    data: { hotspotId: params.id, taskId },
  });

  return NextResponse.json(link, { status: 201 });
}

// DELETE /api/arbetsplats/hotspots/[id]/tasks – ta bort koppling mellan task och hotspot
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdminOrMentor()) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const { taskId } = await req.json() as { taskId: string };
  if (!taskId) return NextResponse.json({ error: "taskId krävs" }, { status: 400 });

  await prisma.hotspotTask.delete({
    where: { hotspotId_taskId: { hotspotId: params.id, taskId } },
  });

  return new NextResponse(null, { status: 204 });
}
