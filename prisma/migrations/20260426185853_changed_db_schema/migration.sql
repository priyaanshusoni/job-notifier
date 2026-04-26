/*
  Warnings:

  - The `roles` column on the `Preference` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `skills` column on the `Preference` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `location` column on the `Preference` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Preference" DROP COLUMN "roles",
ADD COLUMN     "roles" TEXT[],
DROP COLUMN "skills",
ADD COLUMN     "skills" TEXT[],
DROP COLUMN "location",
ADD COLUMN     "location" TEXT[];
