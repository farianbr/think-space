import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


export async function getMyBoards(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const boards = await prisma.board.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { notes: true } }, //note count
      },
    });

    return res.json({ boards });
  } catch (err) {
    console.error("getMyBoards error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
