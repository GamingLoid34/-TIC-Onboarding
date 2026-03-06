-- Flera roller per användare. Kör i Supabase SQL Editor en gång.
-- Behåller nuvarande User.role som primär roll och backfillar UserRole.

CREATE TABLE IF NOT EXISTS "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_userId_role_key" ON "UserRole"("userId", "role");
CREATE INDEX IF NOT EXISTS "UserRole_userId_idx" ON "UserRole"("userId");

ALTER TABLE "UserRole" DROP CONSTRAINT IF EXISTS "UserRole_userId_fkey";
ALTER TABLE "UserRole"
  ADD CONSTRAINT "UserRole_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserRole" ("id", "userId", "role")
SELECT gen_random_uuid()::text, "id", "role"
FROM "User"
ON CONFLICT ("userId", "role") DO NOTHING;
