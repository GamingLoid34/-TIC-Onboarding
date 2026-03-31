-- Kör denna SQL i Supabase → SQL Editor om "prisma db push" hänger.
-- Lägger till kolumnen startDate på User (valfritt datum för första arbetsdag).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
