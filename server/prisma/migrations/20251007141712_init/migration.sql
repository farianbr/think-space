-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "x" INTEGER NOT NULL DEFAULT 100,
    "y" INTEGER NOT NULL DEFAULT 100,
    "color" TEXT NOT NULL DEFAULT '#fde047',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_boardId_idx" ON "Note"("boardId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
