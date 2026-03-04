import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [nyanstallda, totalTasks] = await Promise.all([
      prisma.user.findMany({
        where: { role: "NYANSTALLD" },
        include: {
          systemChecklists: true,
          taskProgresses: true,
        },
      }),
      prisma.task.count(),
    ]);

    const data = nyanstallda.map((n) => {
      const completedVisad = n.taskProgresses.filter((p) => p.isVisad).length;
      const completedKan = n.taskProgresses.filter((p) => p.isKan).length;
      return {
        id: n.id,
        name: n.name,
        startDate: n.createdAt.toISOString().slice(0, 10),
        totalTasks,
        completedVisad,
        completedKan,
        systems: n.systemChecklists.map((s) => ({
          systemName: s.systemName,
          status: s.status,
        })),
      };
    });

    return NextResponse.json({ nyanstallda: data, totalTasks });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Kunde inte hämta nyanställda" },
      { status: 500 }
    );
  }
}
