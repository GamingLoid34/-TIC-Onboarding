import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/arbetsplats – hämtar aktiv bild med hotspots och kopplade tasks/subtasks
export async function GET() {
  const image = await prisma.workspaceImage.findFirst({
    where: { isActive: true },
    include: {
      hotspots: {
        include: {
          tasks: {
            include: {
              task: {
                include: {
                  subTasks: {
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(image ?? null);
}
