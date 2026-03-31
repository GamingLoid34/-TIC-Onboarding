-- Ta bort kolumnen requiredSystemName från Task (Kräver TIMS/OCA-funktionen är borttagen i appen)
ALTER TABLE "Task" DROP COLUMN IF EXISTS "requiredSystemName";
