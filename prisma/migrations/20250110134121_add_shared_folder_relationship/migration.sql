/*
  Warnings:

  - You are about to drop the `_FolderToShareFolder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_FolderToShareFolder" DROP CONSTRAINT "_FolderToShareFolder_A_fkey";

-- DropForeignKey
ALTER TABLE "_FolderToShareFolder" DROP CONSTRAINT "_FolderToShareFolder_B_fkey";

-- DropTable
DROP TABLE "_FolderToShareFolder";

-- CreateTable
CREATE TABLE "_ShareFolder" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ShareFolder_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ShareFolder_B_index" ON "_ShareFolder"("B");

-- AddForeignKey
ALTER TABLE "_ShareFolder" ADD CONSTRAINT "_ShareFolder_A_fkey" FOREIGN KEY ("A") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ShareFolder" ADD CONSTRAINT "_ShareFolder_B_fkey" FOREIGN KEY ("B") REFERENCES "ShareFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
