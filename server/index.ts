import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3005;
const prisma = new PrismaClient();

// --- TypeScript Interfaces for Netease API ---
interface NeteaseSong {
  id: number | string;
  name: string;
  artists?: { name: string }[];
  ar?: { name: string }[];
  picUrl?: string;
  al?: { picUrl: string; name: string };
}

interface NeteaseSearchResponse {
  result?: {
    artists?: { id: number; name: string }[];
    songs?: NeteaseSong[];
  };
}

interface NeteaseAlbumResponse {
  album?: {
    songs?: NeteaseSong[];
    picUrl?: string;
    name?: string;
  };
  songs?: NeteaseSong[];
}

// 🚀 【核心网络盾牌】：专治跨境连接 Xata/Postgres 时的间歇性 TCP 握手丢包
async function withPrismaRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      console.warn(`[Prisma Firewall] P1001 Connection Dropped. Auto-retrying interceptor activated. (Attempt ${i + 1}/${maxRetries} in 1.5s)`);
      await new Promise(res => setTimeout(res, 1500));
    }
  }
  throw new Error("Prisma Endpoint Unreachable");
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', online: true }));

// --- 新增：手动离线单曲硬注入接口 ---
app.post('/api/custom-song', async (req, res) => {
  try {
    const { keyword, trackName, artistName, collectionName, artworkUrl100, audioUrl } = req.body;
    if (!trackName) return res.status(400).json({ error: "Missing track name" });

    // Step 1: 解析主唱的官方网易云 ID（以便与原曲库无缝合群）
    const searchRes = (await fetch('http://music.163.com/api/search/get/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `s=${encodeURIComponent(keyword || artistName)}&type=100&limit=1`
    }).then(r => r.json())) as { result?: { artists?: any[] } };
    
    const artist = searchRes.result?.artists?.[0];
    const artistId = artist?.id?.toString() || "0";

    const customTrack = {
      artistId,
      trackId: `CUSTOM_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      trackName,
      artistName: artistName || keyword || "Unknown",
      collectionName: collectionName || "未公开记忆碎片 (Offline)",
      artworkUrl100: artworkUrl100 || `https://picsum.photos/seed/${Date.now()}/500/500`, // 默认生成随机高质量赛博占位图
      audioUrl: audioUrl || null // 接收用户手动传入的音频热链
    };

    await withPrismaRetry(() => 
      prisma.artistSongCache.create({
        data: customTrack
      })
    );

    res.json({ success: true, results: [customTrack] });
  } catch (err: any) {
    console.error('Custom Upload Error:', err);
    res.status(500).json({ error: "Failed to persist custom track to Xata." });
  }
});

app.post('/api/update-song-audio', async (req, res) => {
  try {
    const { trackId, audioUrl } = req.body;
    if (!trackId) return res.status(400).json({ error: "Missing trackId" });

    const updated = await withPrismaRetry(() => 
      prisma.artistSongCache.update({
        where: { trackId: String(trackId) },
        data: { audioUrl }
      })
    );

    res.json({ success: true, track: updated });
  } catch (err: any) {
    console.error('Update Audio Error:', err);
    res.status(500).json({ error: "Failed to update audio URL." });
  }
});

// --- 新增：网易云音乐 Web 原生单曲全量检索 ---
app.get('/api/search', async (req, res) => {
  try {
    const keyword = req.query.q as string;
    const forceRefresh = req.query.forceRefresh === 'true';
    if (!keyword) return res.json({ results: [] });

    // Step 1: 先根据名字拿到真实的歌手 ID (网易云内部 artistId)
    const searchRes = (await fetch('http://music.163.com/api/search/get/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `s=${encodeURIComponent(keyword)}&type=100&limit=1` 
    }).then(r => r.json())) as any;
    
    const artist = (searchRes as any).result?.artists?.[0];
    const artistId = artist?.id?.toString();
    const officialArtistName = artist?.name || keyword;
    
    if (!artistId) return res.json({ results: [] });

    // 定义极其严格的清洗规则引擎：全局拦截旧缓存里的“伴奏”和“蹭车歌手”，将其在最终输出给前端前物理抹杀
    const purifySongs = (songs: any[]) => songs.filter(item => {
      if (!item.trackName) return false;
      const name = item.trackName.toLowerCase();
      const isInst = name.includes('伴奏') || name.includes('inst.');
      const singer = (item.artistName || "").toLowerCase();
      const isMain = singer.includes(officialArtistName.toLowerCase()) || singer.includes(keyword.toLowerCase());
      return !isInst && isMain;
    });

    // 定义按歌曲名严格去重的独立引擎（哪怕 trackId 不同，只要曲名一模一样，就判定为各大精选集的重复收录，强制抹杀）
    const deduplicateByName = (songs: any[]) => {
      return Array.from(new Map(
        songs.map(item => [item.trackName.toLowerCase().trim(), item])
      ).values());
    };

    // 定义真实数据外挂引擎（从 Prisma 统计真实的 Room 大厅匹配队列数量）
    const attachRealNodes = async (songs: any[]) => {
      const typedSongs = songs as any[]; 
      if (typedSongs.length === 0) return [];
      const trackIds = typedSongs.map(s => s.trackId);
      const roomCounts = await prisma.room.groupBy({
        by: ['songId'],
        where: { songId: { in: trackIds } },
        _count: { id: true }
      });
      const cntMap = new Map(roomCounts.map(r => [r.songId, r._count.id]));
      return typedSongs.map(s => ({ ...s, realNodes: cntMap.get(s.trackId) || 0 }));
    };

    // 🚀 【核心优化】：使用正式版 Prisma 云端缓存持久层，并外挂自动重试防摔断装甲
    const cachedSongs = (await withPrismaRetry(() => 
      prisma.artistSongCache.findMany({
        where: { artistId },
        orderBy: { cachedAt: 'desc' }
      })
    )) as any[];

    if (!forceRefresh && cachedSongs.length > 0) {
      const pureCached = deduplicateByName(purifySongs(cachedSongs));
      if (pureCached.length > 0) {
        console.log(`[Cache Hit] Serving ${pureCached.length} absolutely pure songs for artist ${artistId} firmly from Prisma/Xata!`);
        const payload = await attachRealNodes(pureCached);
        return res.json({ results: payload });
      }
      // 如果洗完之后长度变成了 0，说明过去的缓存全是被翻唱或伴奏污染的脏数据，直接无视缓存，强行降级重新拉取全网数据！
    }
    
    console.log(`[${forceRefresh ? 'Force Sync' : 'Cache Miss'}] Digging deep into Netease API for artist ${artistId}...`);

    // Step 2: 获取该歌手名下的所有专辑（按用户要求，最大拉取 100 张专辑）
    // 对应你提到的获取歌手专辑接口需求
    const albumsRes = (await fetch(`http://music.163.com/api/artist/albums/${artistId}?limit=100&offset=0`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(r => r.json())) as any;

    const albums = albumsRes.hotAlbums || [];
    const allSongs: any[] = [];
    
    // Step 3: 平滑分批获取这 100 张专辑下面具体包含的曲目 
    // 【核心修复】：绝对不能直接对 100 个专辑发起 Promise.all 高并发！网易云防刷墙会把 80% 的请求直接掐断，导致返回的数量极少且每次随机。
    // 我们采取 5个一组并发、组间延迟 200ms 的“慢炖”滑动窗口架构。
    const batchSize = 5;
    for (let i = 0; i < albums.length; i += batchSize) {
      const chunk = albums.slice(i, i + batchSize);
      
      await Promise.all(chunk.map(async (album: any) => {
        try {
          const detailRes = await fetch(`http://music.163.com/api/album/${album.id}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: (AbortSignal as any).timeout(8000) 
          });
          const detailData = (await detailRes.json()) as NeteaseAlbumResponse;
          
          if (detailData.album && ((detailData as any).album.songs || detailData.songs)) {
            const songs = (detailData as any).album.songs || detailData.songs || [];
            const coverUrl = detailData.album.picUrl || album.picUrl;
            
            songs.forEach((song: NeteaseSong) => {
              allSongs.push({
                trackId: song.id ? song.id.toString() : `UNKNOWN_${Math.random()}`,
                trackName: song.name || "Unknown Track",
                artistName: song.artists?.[0]?.name || song.ar?.[0]?.name || keyword || "Unknown",
                collectionName: (detailData.album && detailData.album.name) ? detailData.album.name : (album.name || "Single/EP Release"),
                artworkUrl100: coverUrl ? `${coverUrl}?param=500y500` : 'https://picsum.photos/500/500'
              });
            });
          }
        } catch (err) {
          console.error(`Fetch album ${album.id} failed:`, err);
        }
      }));

      // 组间休息 200 毫秒，完美绕过网易云的并发限流拦截器
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 简单去重（按歌曲名极其暴力的物理去重，无视网易云不同专辑里给的重复 trackId）
    // 并且通过调用顶部的双重清洗引擎 purifySongs，确保即将合并到数据库里的源头也是绝对纯净的！
    const uniqueSongs = deduplicateByName(purifySongs(allSongs));
    
    // 🚀 【写入/合并数据库】：利用 Prisma 云端 `createMany` 配合 `skipDuplicates: true` 实现毫秒级最严谨的原生 SQL 引擎合并
    console.log(`[Prisma Sync] Attempting to insert ${uniqueSongs.length} tracks to Xata cloud...`);
    const prismaPayload = uniqueSongs.map(song => ({
      artistId: artistId || "0",
      trackId: song.trackId || "N/A",
      trackName: song.trackName || "Unknown Track",
      artistName: song.artistName || "Unknown Artist",
      collectionName: song.collectionName || "Single/EP Release",
      artworkUrl100: song.artworkUrl100 || 'https://picsum.photos/500/500'
    }));

    if (prismaPayload.length > 0) {
      await withPrismaRetry(() => 
        prisma.artistSongCache.createMany({
          data: prismaPayload,
          skipDuplicates: true // 极其暴力的物理防重入
        })
      );
    }

    // 写入后再从云端把这个大咖的全量单曲完全重新拉取一遍，保证展示给前端的数据绝对一致且结构干净
    const finalStoredSongs = await withPrismaRetry(() =>
      prisma.artistSongCache.findMany({
        where: { artistId },
        orderBy: { cachedAt: 'desc' }
      })
    );
    
    // 离岸安全检查，彻底剔除同名异构曲目，确保喂给前端的绝对是 100% 纯净度的数据，并且挂载真实匹配大厅数量
    const pureFinal = deduplicateByName(purifySongs(finalStoredSongs));
    const payloadOut = await attachRealNodes(pureFinal);
    console.log(`[DB Sync] Action Complete. Total pure tracks securely synced for artist ${artistId}: ${payloadOut.length}`);
    return res.json({ results: payloadOut });
    
  } catch (err: any) {
    console.error('Netease Web API Error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch from Netease Web API', 
      details: err?.message, 
      stack: err?.stack 
    });
  }
});

// ==========================================
// 2. A2A 纯盲盒匹配后端 - Prisma 持久层重写
// ==========================================

app.get('/api/avatars/check', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.json({ found: false });
    const avatar = await prisma.avatar.findFirst({
      where: { name: String(name) },
      orderBy: { createdAt: 'desc' }
    });
    if (avatar) {
      let artist = "";
      if (avatar.coreVibe) {
        const match = avatar.coreVibe.match(/Favorite Artist:\s*([^,]+)/);
        if (match && match[1]) {
          artist = match[1].trim();
        }
      }
      res.json({ found: true, mbti: avatar.mbti || "INTJ", role: avatar.role, artist });
    } else {
      res.json({ found: false });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB lookup failed" });
  }
});

app.get('/api/avatars/:id/recent-songs', async (req, res) => {
  try {
    const { id } = req.params;
    // Get unique song IDs from RoomMembers this avatar joined
    const memberships = await prisma.roomMember.findMany({
      where: { avatarId: id },
      include: { room: true },
      orderBy: { joinedAt: 'desc' },
      take: 15 // Check more to ensure we get unique songs
    });

    const uniqueSongIds = Array.from(new Set(memberships.map(m => m.room.songId))).slice(0, 5);
    
    const songs = await prisma.artistSongCache.findMany({
      where: { trackId: { in: uniqueSongIds } }
    });

    res.json({ songs });
  } catch (e) {
    console.error("Failed to fetch avatar history:", e);
    res.status(500).json({ error: "DB Error" });
  }
});

app.post('/api/avatars', async (req, res) => {
  try {
    const { name, role, coreVibe, mbti } = req.body;
    
    // 建立一个隐式防沉迷主账号（如果你以后想接多用户注册体系，可以换成真实用户 Auth ID）
    let guestUser = await prisma.user.findFirst({ where: { email: 'guest@secondresonance.com' } });
    if (!guestUser) {
      guestUser = await prisma.user.create({ data: { email: 'guest@secondresonance.com', nickname: 'Guest Commander' } });
    }

    let avatar = await prisma.avatar.findFirst({
      where: { name }
    });

    if (avatar) {
      avatar = await prisma.avatar.update({
        where: { id: avatar.id },
        data: {
          role,
          coreVibe,
          systemPrompt: `SYSTEM PROMPT STUB FOR ${role} / VIBE: ${coreVibe}`,
          mbti
        }
      });
      res.json({ avatar, msg: `Avatar identity verified and parameters synced to Xata Cloud!` });
    } else {
      avatar = await prisma.avatar.create({
        data: {
          userId: guestUser.id,
          name,
          role,
          coreVibe,
          systemPrompt: `SYSTEM PROMPT STUB FOR ${role} / VIBE: ${coreVibe}`,
          mbti
        }
      });
      res.json({ avatar, msg: `Avatar securely minted to Xata Cloud!` });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Xata DB Error" });
  }
});

app.get('/api/rooms/:songId', async (req, res) => {
  try {
    const { songId } = req.params;
    
    const rooms = await prisma.room.findMany({
      where: { songId, status: 'MATCHING' },
      include: { 
        members: {
          include: { avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ rooms });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Xata DB Error" });
  }
});

app.get('/api/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`[API] Fetching room state for ${roomId}...`);
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { avatar: true }
        },
        messages: { 
          orderBy: { createdAt: 'asc' } 
        }
      }
    });
    
    if (!room) {
      console.warn(`[API] Room ${roomId} not found.`);
      return res.status(404).json({ error: "Room not found" });
    }

    console.log(`[API] Found room ${room.name}, songId: ${room.songId}. Mapping song details...`);
    const song = await prisma.artistSongCache.findUnique({
      where: { trackId: room.songId }
    });

    res.json({ room, song });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: "DB Error" });
  }
});

app.post('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { agentRole, content, metadata } = req.body;
    console.log(`[API] Ingesting message for room ${roomId} (Role: ${agentRole})`, { metadata });
    
    const message = await prisma.message.create({
      data: {
        roomId,
        agentRole,
        content,
        metadata: metadata || null
      }
    });

    res.json({ message, msg: "Message materialized into Xata Cloud." });
  } catch (e: any) {
    console.error(`[API ERROR] Message persistence failed for room ${req.params.roomId}:`, e);
    res.status(500).json({ error: "Xata DB Error", details: e.message });
  }
});

app.delete('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Hard Reboot: Wipe the entire simulation memory array from the Xata PostgreSQL table
    const result = await prisma.message.deleteMany({
      where: { roomId, agentRole: { not: 'CHAT' } }
    });

    res.json({ success: true, deletedCount: result.count, msg: "Simulation timeline completely erased." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to perform Hard Reboot on DB" });
  }
});

app.post('/api/room/create', async (req, res) => {
  try {
    const { avatarId, songId } = req.body;
    
    const song = await prisma.artistSongCache.findUnique({ where: { trackId: songId }});
    const trackName = song?.trackName || "Unknown Track";
    const existingRoomsCount = await prisma.room.count({ where: { songId } });
    const sequence = (existingRoomsCount + 1).toString().padStart(3, '0');
    const roomName = `${trackName} - ${sequence}`;

    // 创建一场绝对中立的星际共创大厦对局
    const room = await prisma.room.create({
      data: {
        songId,
        status: 'MATCHING',
        name: roomName
      }
    });

    // 把该玩家的分身硬写入大厅席位
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        avatarId
      }
    });

    res.json({ room, msg: "Lobby provisioning complete on Cloud Postgres." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Xata DB Error" });
  }
});

app.post('/api/room/join', async (req, res) => {
  try {
    const { avatarId, roomId } = req.body;
    
    // 检查房间是否处于可匹配状态
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: { include: { avatar: true } } }
    });

    if (!room) return res.status(404).json({ error: "未找到指定的星际对战室频段。" });
    if (room.status !== 'MATCHING') return res.status(400).json({ error: "该对局室已发车或坠毁，无法锚定。" });
    if (room.members.length >= 4) return res.status(400).json({ error: "对战室坑位已满载。" });

    // 严防该职能已被占用（比如已经有一个导演了，就不能再加导演）
    // 或者同一台机器的用户重复点击
    const avatarToJoin = await prisma.avatar.findUnique({ where: { id: avatarId } });
    if (!avatarToJoin) return res.status(404).json({ error: "未找到您的分身投影数据。" });

    if (room.members.some(m => m.avatarId === avatarId)) {
       return res.status(400).json({ error: "您的分身早已存在于该对战室序列中。" });
    }

    if (room.members.some(m => m.avatar.role === avatarToJoin.role)) {
       return res.status(400).json({ error: "对局中已存在相同职能的创作者，请更换职能或寻找其他房间。" });
    }

    // 正式把玩家的分身硬写入大厅席位
    await prisma.roomMember.create({
      data: {
        roomId,
        avatarId
      }
    });

    res.json({ room, msg: "Successfully spliced into the Lobby." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Xata DB Error / Join Conflict" });
  }
});

// ==========================================
// [DEBUG 面板]：云端数据库透明透视接口 
// ==========================================
app.get('/api/debug/db', async (req, res) => {
  try {
    const songsCount = await prisma.artistSongCache.count();
    const roomsCount = await prisma.room.count();
    const avatarsCount = await prisma.avatar.count();
    res.json({
      notice: "您目前已连接至光速运转的 Xata 云端 Serverless Postgres 数据库网络。",
      metrics: {
        totalCachedNeteaseSongs: songsCount,
        totalDeployedRooms: roomsCount,
        totalMintedAvatars: avatarsCount
      }
    });
  } catch (e) {
    res.status(500).json({ error: "Xata Connection Suspended." });
  }
});

app.listen(PORT, () => {
  console.log(`[Matching Server] Online -> http://localhost:${PORT} 🚀 Prisma/Xata Engine Fired Up!`);
});
