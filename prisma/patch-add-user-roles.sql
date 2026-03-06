-- Flera roller per användare. Kör i Supabase SQL Editor en gång.
-- Behåller nuvarande User.role som primär roll och backfillar UserRole.

-- Skapa enum "Role" om den inte finns (krävs om tabellen User skapats utan Prisma).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'ARBETSLEDARE', 'MENTOR', 'NYANSTALLD');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_userId_role_key" ON "UserRole"("userId", "role");
CREATE INDEX IF NOT EXISTS "UserRole_userId_idx" ON "UserRole"("userId");

-- Lägg FK + backfill endast om tabellen "User" finns i DBn.
-- (Det här gör patchen körbar även om grundschemat inte är applicerat än.)
DO $$
BEGIN
  IF to_regclass('public."User"') IS NOT NULL THEN
    ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_fkey";
    ALTER TABLE "UserRole"
      ADD CONSTRAINT "UserRole_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    INSERT INTO "UserRole" ("id", "userId", "role")
    SELECT gen_random_uuid()::text, "id", "role"
    FROM "User"
    ON CONFLICT ("userId", "role") DO NOTHING;
  END IF;
END
$$;
