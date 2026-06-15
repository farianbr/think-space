import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Sticky palette reused across template blueprints (warm, muted).
const C = {
  amber: '#fde68a',
  peach: '#fed7aa',
  sky: '#bae6fd',
  green: '#bbf7d0',
  pink: '#fbcfe8',
  violet: '#ddd6fe',
  slate: '#e2e8f0',
};

// note helper
const n = (text, x, y, color = C.amber, w = 200, h = 140) => ({
  text,
  x,
  y,
  width: w,
  height: h,
  color,
});

const TEMPLATES = [
  {
    slug: 'brainstorm',
    title: 'Brainstorming',
    category: 'Brainstorming',
    description: 'Diverge fast, then cluster ideas into themes.',
    thumbnail: 'Lightbulb',
    sortOrder: 1,
    blueprint: {
      color: '#c2781d',
      notes: [
        n('🎯 Topic / Question', 360, 60, C.slate, 260, 90),
        n('Idea', 120, 220, C.amber),
        n('Idea', 360, 220, C.peach),
        n('Idea', 600, 220, C.sky),
        n('Idea', 120, 400, C.green),
        n('Idea', 360, 400, C.pink),
        n('Idea', 600, 400, C.violet),
      ],
    },
  },
  {
    slug: 'product-planning',
    title: 'Product Planning',
    category: 'Product Planning',
    description: 'Now / Next / Later roadmap to align the team.',
    thumbnail: 'Map',
    sortOrder: 2,
    blueprint: {
      notes: [
        n('▶ Now', 80, 60, C.green, 220, 80),
        n('⏭ Next', 360, 60, C.amber, 220, 80),
        n('🗓 Later', 640, 60, C.slate, 220, 80),
        n('Task', 80, 200, C.green),
        n('Task', 80, 360, C.green),
        n('Task', 360, 200, C.amber),
        n('Task', 360, 360, C.amber),
        n('Task', 640, 200, C.slate),
      ],
    },
  },
  {
    slug: 'user-research',
    title: 'Research Wall',
    category: 'Research',
    description: 'Capture observations, quotes and insights in one place.',
    thumbnail: 'Microscope',
    sortOrder: 3,
    blueprint: {
      notes: [
        n('Observations', 80, 60, C.sky, 220, 80),
        n('Quotes', 360, 60, C.pink, 220, 80),
        n('Insights', 640, 60, C.amber, 220, 80),
        n('“…”', 360, 200, C.pink),
        n('Note', 80, 200, C.sky),
        n('💡 Insight', 640, 200, C.amber),
      ],
    },
  },
  {
    slug: 'user-journey',
    title: 'User Journey',
    category: 'User Journey',
    description: 'Map stages, actions, and pain points across the experience.',
    thumbnail: 'Footprints',
    sortOrder: 4,
    blueprint: {
      notes: [
        n('Awareness', 60, 80, C.slate, 180, 70),
        n('Consider', 280, 80, C.slate, 180, 70),
        n('Decide', 500, 80, C.slate, 180, 70),
        n('Onboard', 720, 80, C.slate, 180, 70),
        n('Action', 60, 220, C.sky, 180, 120),
        n('Action', 280, 220, C.sky, 180, 120),
        n('Pain point', 500, 220, C.pink, 180, 120),
        n('Action', 720, 220, C.sky, 180, 120),
      ],
    },
  },
  {
    slug: 'retrospective',
    title: 'Retrospective',
    category: 'Retrospectives',
    description: 'What went well, what didn’t, and what to try next.',
    thumbnail: 'RefreshCw',
    sortOrder: 5,
    blueprint: {
      notes: [
        n('😀 Went well', 100, 60, C.green, 240, 80),
        n('😕 Didn’t go well', 420, 60, C.pink, 240, 80),
        n('🚀 Try next', 740, 60, C.amber, 240, 80),
        n('Note', 100, 220, C.green),
        n('Note', 420, 220, C.pink),
        n('Note', 740, 220, C.amber),
      ],
    },
  },
  {
    slug: 'strategy',
    title: 'Strategy Canvas',
    category: 'Strategy',
    description: 'Vision, goals, bets and risks on a single canvas.',
    thumbnail: 'Target',
    sortOrder: 6,
    blueprint: {
      notes: [
        n('🌟 Vision', 360, 50, C.violet, 280, 90),
        n('🎯 Goals', 120, 230, C.amber, 220, 130),
        n('🎲 Bets', 400, 230, C.sky, 220, 130),
        n('⚠️ Risks', 680, 230, C.pink, 220, 130),
      ],
    },
  },
  {
    slug: 'mind-map',
    title: 'Mind Map',
    category: 'Mind Maps',
    description: 'Start from a central idea and branch outward.',
    thumbnail: 'Network',
    sortOrder: 7,
    blueprint: {
      notes: [
        n('Central idea', 400, 240, C.amber, 200, 100),
        n('Branch', 140, 100, C.sky, 180, 110),
        n('Branch', 680, 100, C.green, 180, 110),
        n('Branch', 140, 400, C.pink, 180, 110),
        n('Branch', 680, 400, C.violet, 180, 110),
      ],
    },
  },
];

async function main() {
  // demo credentials — keep these in .env for real apps
  const email = 'demo@thinkspace.dev';
  const plainPassword = 'demo1234';

  // 1) upsert demo user
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hashed = await bcrypt.hash(plainPassword, 10);
    user = await prisma.user.create({
      data: { email, name: 'Demo User', password: hashed },
    });
  }

  // 2) ensure demo-board exists and set ownerId
  await prisma.board.upsert({
    where: { id: 'demo-board' },
    update: { ownerId: user.id },
    create: { id: 'demo-board', title: 'Demo Board', ownerId: user.id },
  });

  // 3) seed templates (idempotent by slug)
  for (const t of TEMPLATES) {
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: {
        title: t.title,
        category: t.category,
        description: t.description,
        thumbnail: t.thumbnail,
        blueprint: t.blueprint,
        sortOrder: t.sortOrder,
      },
      create: t,
    });
  }

  console.log(`Seed complete — demo user ${user.id}, ${TEMPLATES.length} templates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
