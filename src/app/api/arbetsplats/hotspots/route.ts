import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// POST /api/arbetsplats/hotspots – skapa ny hotspot på aktiv bild (admin/mentor)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser || !["ADMIN", "MENTOR"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const { workspaceImageId, label, x, y, icon } = body as {
    workspaceImageId: string;
    label: string;
    x: number;
    y: number;
    icon?: string;
  };

  if (!workspaceImageId || !label || x == null || y == null) {
    return NextResponse.json({ error: "workspaceImageId, label, x och y krävs" }, { status: 400 });
  }

  const hotspot = await prisma.hotspot.create({
    data: { workspaceImageId, label, x, y, icon },
  });

  return NextResponse.json(hotspot, { status: 201 });
}
