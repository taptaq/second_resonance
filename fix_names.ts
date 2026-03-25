import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const rooms = await prisma.room.findMany({
    include: {
       members: true
    }
  });
  
  // Need to group them by songId to get correct sequences
  const songMap = new Map();
  
  for (const r of rooms) {
     if (!songMap.has(r.songId)) songMap.set(r.songId, []);
     songMap.get(r.songId).push(r);
  }
  
  for (const [songId, subRooms] of songMap.entries()) {
     // Fetch song name
     const song = await prisma.artistSongCache.findUnique({ where: { trackId: songId } });
     const trackName = song?.trackName || "Unknown Track";
     
     // Sort rooms by creation to preserve sequence (oldest = 001)
     subRooms.sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime());
     
     for (let i = 0; i < subRooms.length; i++) {
        const sequence = (i + 1).toString().padStart(3, '0');
        const expectedName = `${trackName} - ${sequence}`;
        
        if (subRooms[i].name !== expectedName) {
           await prisma.room.update({
              where: { id: subRooms[i].id },
              data: { name: expectedName }
           });
           console.log(`Updated room ${subRooms[i].id} -> ${expectedName}`);
        }
     }
  }
  
  console.log("Database Backfill Complete!");
}
run().finally(() => prisma.$disconnect());
