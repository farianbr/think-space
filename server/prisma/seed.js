import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // demo credentials — keep these in .env for real apps
  const email = 'demo@thinkspace.dev';
  const plainPassword = 'demo1234';

  // 1) upsert demo user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hashed = await bcrypt.hash(plainPassword, 10);
    user = await prisma.user.create({
      data: {
        email,
        name: 'Demo User',
        password: hashed,
      },
    });
  }

  // 2) ensure demo-board exists and set ownerId
  await prisma.board.upsert({
    where: { id: 'demo-board' },
    update: { ownerId: user.id },
    create: {
      id: 'demo-board',
      title: 'Demo Board',
      ownerId: user.id,
    },
  });

  console.log('Seed complete — demo user id:', user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
