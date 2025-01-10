/*
  Warnings:

  - You are about to drop the column `shareId` on the `Folder` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_shareId_fkey";

-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "shareId";

-- CreateTable
CREATE TABLE "_FolderToShareFolder" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FolderToShareFolder_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FolderToShareFolder_B_index" ON "_FolderToShareFolder"("B");

-- AddForeignKey
ALTER TABLE "_FolderToShareFolder" ADD CONSTRAINT "_FolderToShareFolder_A_fkey" FOREIGN KEY ("A") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FolderToShareFolder" ADD CONSTRAINT "_FolderToShareFolder_B_fkey" FOREIGN KEY ("B") REFERENCES "ShareFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
