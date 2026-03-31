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

// PUT /api/arbetsplats/hotspots/[id] – uppdatera position/label/icon
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdminOrMentor()) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const { label, x, y, icon } = body as { label?: string; x?: number; y?: number; icon?: string };

  const hotspot = await prisma.hotspot.update({
    where: { id: params.id },
    data: {
      ...(label !== undefined && { label }),
      ...(x !== undefined && { x }),
      ...(y !== undefined && { y }),
      ...(icon !== undefined && { icon }),
    },
  });

  return NextResponse.json(hotspot);
}

// DELETE /api/arbetsplats/hotspots/[id] – ta bort hotspot
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdminOrMentor()) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  await prisma.hotspot.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
