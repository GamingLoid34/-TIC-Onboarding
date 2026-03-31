import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// POST /api/arbetsplats/image – sätt ny aktiv bild (admin/mentor)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser || !["ADMIN", "MENTOR"].includes(dbUser.role)) {
    return NextResponse.json({ error: "Åtkomst nekad" }, { status: 403 });
  }

  const body = await req.json();
  const { imageUrl, label } = body as { imageUrl: string; label: string };

  if (!imageUrl || !label) {
    return NextResponse.json({ error: "imageUrl och label krävs" }, { status: 400 });
  }

  // Sätt ny bild som aktiv och inaktivera alla andra i en transaktion
  const image = await prisma.$transaction(async (tx) => {
    await tx.workspaceImage.updateMany({ data: { isActive: false } });
    return tx.workspaceImage.create({
      data: { imageUrl, label, isActive: true },
    });
  });

  return NextResponse.json(image, { status: 201 });
}
