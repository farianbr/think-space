import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const DEMO_BOARD_ID = "demo-board";

async function main() {
  // upsert demo board
  await prisma.board.upsert({
    where: { id: DEMO_BOARD_ID },
    update: {},
    create: { id: DEMO_BOARD_ID, title: "Demo Board" },
  });

  // upsert demo user
  const email = "demo@thinkspace.dev";
  const passwordPlain = "demo1234"; // for dev only
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  await prisma.user.upsert({
    where: { email },
    update: { password: passwordHash },
    create: { email, name: "Demo User", password: passwordHash },
  });

  console.log("Seeded user:", email, "password:", passwordPlain);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
