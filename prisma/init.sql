-- Kör denna SQL i Supabase → SQL Editor (en gång när databasen är tom).
-- Därefter: npm run db:seed
-- Innehåller: Role (ADMIN, ARBETSLEDARE, MENTOR, NYANSTALLD), Task, SubTask, SubTaskProgress.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ARBETSLEDARE', 'MENTOR', 'NYANSTALLD');

-- CreateEnum
CREATE TYPE "SystemStatus" AS ENUM ('PENDING', 'ORDERED', 'READY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemChecklist" (
    "id" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "status" "SystemStatus" NOT NULL DEFAULT 'PENDING',
    "nyanstalldId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "requiredSystemName" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "taskId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskProgress" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "nyanstalldId" TEXT NOT NULL,
    "isVisad" BOOLEAN NOT NULL DEFAULT false,
    "visadAt" TIMESTAMP(3),
    "visadByMentorId" TEXT,
    "isKan" BOOLEAN NOT NULL DEFAULT false,
    "kanAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubTaskProgress" (
    "id" TEXT NOT NULL,
    "subTaskId" TEXT NOT NULL,
    "nyanstalldId" TEXT NOT NULL,
    "isVisad" BOOLEAN NOT NULL DEFAULT false,
    "isKan" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubTaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "SystemChecklist_nyanstalldId_idx" ON "SystemChecklist"("nyanstalldId");
CREATE UNIQUE INDEX "SystemChecklist_nyanstalldId_systemName_key" ON "SystemChecklist"("nyanstalldId", "systemName");
CREATE INDEX "TaskProgress_nyanstalldId_idx" ON "TaskProgress"("nyanstalldId");
CREATE INDEX "TaskProgress_taskId_idx" ON "TaskProgress"("taskId");
CREATE UNIQUE INDEX "TaskProgress_taskId_nyanstalldId_key" ON "TaskProgress"("taskId", "nyanstalldId");
CREATE INDEX "SubTaskProgress_subTaskId_idx" ON "SubTaskProgress"("subTaskId");
CREATE INDEX "SubTaskProgress_nyanstalldId_idx" ON "SubTaskProgress"("nyanstalldId");
CREATE UNIQUE INDEX "SubTaskProgress_subTaskId_nyanstalldId_key" ON "SubTaskProgress"("subTaskId", "nyanstalldId");

-- AddForeignKey
ALTER TABLE "SystemChecklist" ADD CONSTRAINT "SystemChecklist_nyanstalldId_fkey" FOREIGN KEY ("nyanstalldId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubTask" ADD CONSTRAINT "SubTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskProgress" ADD CONSTRAINT "TaskProgress_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskProgress" ADD CONSTRAINT "TaskProgress_nyanstalldId_fkey" FOREIGN KEY ("nyanstalldId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskProgress" ADD CONSTRAINT "TaskProgress_visadByMentorId_fkey" FOREIGN KEY ("visadByMentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubTaskProgress" ADD CONSTRAINT "SubTaskProgress_subTaskId_fkey" FOREIGN KEY ("subTaskId") REFERENCES "SubTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubTaskProgress" ADD CONSTRAINT "SubTaskProgress_nyanstalldId_fkey" FOREIGN KEY ("nyanstalldId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
