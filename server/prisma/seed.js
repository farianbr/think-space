import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DEMO_BOARD_ID = "demo-board"; // stable predictable id for dev

async function main() {
  await prisma.board.upsert({
    where: { id: DEMO_BOARD_ID },
    update: {},
    create: { id: DEMO_BOARD_ID, title: "Demo Board" },
  });
  console.log("Seeded board:", DEMO_BOARD_ID);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
