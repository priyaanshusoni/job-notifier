/*
  Warnings:

  - Added the required column `metaInfo` to the `Preference` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Preference" ADD COLUMN     "metaInfo" TEXT NOT NULL;
