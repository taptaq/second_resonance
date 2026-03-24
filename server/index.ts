import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3005;
const prisma = new PrismaClient();

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
    const searchRes = await fetch('http://music.163.com/api/search/get/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `s=${encodeURIComponent(keyword || artistName)}&type=100&limit=1`
    }).then(r => r.json());
    
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

// --- 新增：网易云音乐 Web 原生单曲全量检索 ---
app.get('/api/search', async (req, res) => {
  try {
    const keyword = req.query.q as string;
    const forceRefresh = req.query.forceRefresh === 'true';
    if (!keyword) return res.json({ results: [] });

    // Step 1: 先根据名字拿到真实的歌手 ID (网易云内部 artistId)
    const searchRes = await fetch('http://music.163.com/api/search/get/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `s=${encodeURIComponent(keyword)}&type=100&limit=1` 
    }).then(r => r.json());
    
    const artist = searchRes.result?.artists?.[0];
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
      if (songs.length === 0) return [];
      const trackIds = songs.map(s => s.trackId);
      const roomCounts = await prisma.room.groupBy({
        by: ['songId'],
        where: { songId: { in: trackIds } },
        _count: { id: true }
      });
      const cntMap = new Map(roomCounts.map(r => [r.songId, r._count.id]));
      return songs.map(s => ({ ...s, realNodes: cntMap.get(s.trackId) || 0 }));
    };

    // 🚀 【核心优化】：使用正式版 Prisma 云端缓存持久层，并外挂自动重试防摔断装甲
    const cachedSongs = await withPrismaRetry(() => 
      prisma.artistSongCache.findMany({
        where: { artistId },
        orderBy: { cachedAt: 'desc' }
      })
    );

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
    const albumsRes = await fetch(`http://music.163.com/api/artist/albums/${artistId}?limit=100&offset=0`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(r => r.json());

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
            signal: AbortSignal.timeout(8000) 
          });
          const detailData = await detailRes.json();
          
          if (detailData.album && (detailData.album.songs || detailData.songs)) {
            const songs = detailData.album.songs || detailData.songs;
            const coverUrl = detailData.album.picUrl || album.picUrl;
            
            songs.forEach((song: any) => {
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

app.post('/api/avatars', async (req, res) => {
  try {
    const { name, role, coreVibe } = req.body;
    
    // 建立一个隐式防沉迷主账号（如果你以后想接多用户注册体系，可以换成真实用户 Auth ID）
    let guestUser = await prisma.user.findFirst({ where: { email: 'guest@secondresonance.com' } });
    if (!guestUser) {
      guestUser = await prisma.user.create({ data: { email: 'guest@secondresonance.com', nickname: 'Guest Commander' } });
    }

    const avatar = await prisma.avatar.create({
      data: {
        userId: guestUser.id,
        name,
        role,
        coreVibe,
        systemPrompt: `SYSTEM PROMPT STUB FOR ${role} / VIBE: ${coreVibe}`
      }
    });

    res.json({ avatar, msg: `Avatar securely minted to Xata Cloud!` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Xata DB Error" });
  }
});

app.post('/api/match', async (req, res) => {
  try {
    const { avatarId, songId } = req.body;
    
    // 创建一场绝对中立的星际共创大厦对局
    const room = await prisma.room.create({
      data: {
        songId,
        status: 'MATCHING'
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
