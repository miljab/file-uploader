/*
  Warnings:

  - You are about to drop the column `folderId` on the `ShareFolder` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ShareFolder" DROP CONSTRAINT "ShareFolder_folderId_fkey";

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "shareId" INTEGER;

-- AlterTable
ALTER TABLE "ShareFolder" DROP COLUMN "folderId";

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "ShareFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
