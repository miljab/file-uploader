/*
  Warnings:

  - Added the required column `headFolderId` to the `ShareFolder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShareFolder" ADD COLUMN     "headFolderId" INTEGER NOT NULL;
