import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const map: Record<string, string> = {
    'DIRECTOR': '导演',
    'WRITER': '编剧',
    'VISUALIZER': '视觉',
    'AUDIO': '音频'
  };

  const avatars = await prisma.avatar.findMany();
  let updatedCount = 0;

  for (const a of avatars) {
    if (map[a.role]) {
      await prisma.avatar.update({
        where: { id: a.id },
        data: { role: map[a.role] }
      });
      console.log(`Updated Avatar ${a.id}: ${a.role} -> ${map[a.role]}`);
      updatedCount++;
    }
  }
  
  console.log(`Fixed roles for ${updatedCount} avatars.`);
}
run().finally(() => prisma.$disconnect());
