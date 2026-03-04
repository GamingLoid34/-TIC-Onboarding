-- Kör denna SQL i Supabase → SQL Editor (när "Role" och övriga tabeller redan finns).
-- Lägger bara till ADMIN i Role och skapar SubTask + SubTaskProgress. Säker att köra flera gånger.

-- Lägg till ADMIN i Role om det inte finns (säkert att köra flera gånger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'ADMIN'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'ADMIN';
  END IF;
END $$;

-- SubTask (hoppar över om tabellen finns)
CREATE TABLE IF NOT EXISTS "SubTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "taskId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubTask_taskId_fkey') THEN
    ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- SubTaskProgress
CREATE TABLE IF NOT EXISTS "SubTaskProgress" (
    "id" TEXT NOT NULL,
    "subTaskId" TEXT NOT NULL,
    "nyanstalldId" TEXT NOT NULL,
    "isVisad" BOOLEAN NOT NULL DEFAULT false,
    "isKan" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubTaskProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubTaskProgress_subTaskId_nyanstalldId_key" ON "SubTaskProgress"("subTaskId", "nyanstalldId");
CREATE INDEX IF NOT EXISTS "SubTaskProgress_subTaskId_idx" ON "SubTaskProgress"("subTaskId");
CREATE INDEX IF NOT EXISTS "SubTaskProgress_nyanstalldId_idx" ON "SubTaskProgress"("nyanstalldId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubTaskProgress_subTaskId_fkey') THEN
    ALTER TABLE "SubTaskProgress" ADD CONSTRAINT "SubTaskProgress_subTaskId_fkey" FOREIGN KEY ("subTaskId") REFERENCES "SubTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubTaskProgress_nyanstalldId_fkey') THEN
    ALTER TABLE "SubTaskProgress" ADD CONSTRAINT "SubTaskProgress_nyanstalldId_fkey" FOREIGN KEY ("nyanstalldId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
