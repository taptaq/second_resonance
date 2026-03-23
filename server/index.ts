import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// --- 本地内存临时数据库（屏蔽因为 5432 端口被拦截导致的连接超时） ---
const db = {
  avatars: [] as any[],
  rooms: [] as any[],
  messages: [] as any[]
};

const generateId = () => Math.random().toString(36).substring(2, 10);

app.get('/api/health', (req, res) => res.json({ status: 'ok', online: true }));

// --- 新增：网易云音乐 Web 原生单曲全量检索 ---
app.get('/api/search', async (req, res) => {
  try {
    const keyword = req.query.q as string;
    if (!keyword) return res.json({ results: [] });

    // 一步到位：使用网易云综合云端搜索接口 (cloudsearch/pc)，直接拉取该歌手的最热、最新 150 首完整单曲！
    // 避免因为并发几十个专辑接口而触发网易云的反爬虫 (403/503) 防火墙，且可以保证歌曲热度降序排列
    const ntRes = await fetch('http://music.163.com/api/cloudsearch/pc', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `s=${encodeURIComponent(keyword)}&type=1&limit=150&offset=0`
    });
    
    const ntData = await ntRes.json();
    
    if (ntData.result && ntData.result.songs) {
      // 映射成前端选曲大厅需要的单曲结构
      const mappedSongs = ntData.result.songs.map((song: any) => ({
        trackId: song.id.toString(),
        trackName: song.name,
        artistName: song.ar?.[0]?.name || keyword,
        collectionName: song.al?.name || '未知专辑',
        artworkUrl100: song.al?.picUrl ? `${song.al.picUrl}?param=500y500` : 'https://picsum.photos/500/500' 
      }));
      return res.json({ results: mappedSongs });
    }
    
    res.json({ results: [] });
  } catch (err) {
    console.error('Netease Web API Error:', err);
    res.status(500).json({ error: 'Failed to fetch from Netease Web API' });
  }
});

app.post('/api/avatars', (req, res) => {
  const { name, role, coreVibe } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Missing core attributes' });
  
  const avatar = { id: generateId(), name, role, coreVibe };
  db.avatars.push(avatar);
  
  res.json({ avatar, userId: 'mock-local-user' });
});

app.post('/api/match', (req, res) => {
  const { avatarId, songId } = req.body;
  const avatar = db.avatars.find(a => a.id === avatarId);
  if (!avatar) return res.status(404).json({ error: 'Avatar not found' });

  // 算法：寻找同首歌曲（同位歌手）、且状态为 MATCHING、且该房间还不包含当前职能的房间
  let targetRoom = db.rooms.find(r => 
    r.songId === songId && 
    r.status === 'MATCHING' && 
    !r.members.some((m: any) => m.avatar.role === avatar.role)
  );

  // 找不到则开一个新房间
  if (!targetRoom) {
    targetRoom = { id: generateId(), songId, status: 'MATCHING', members: [] };
    db.rooms.push(targetRoom);
  }

  // 加入房间
  targetRoom.members.push({ avatarId, avatar });

  // 万一四人凑齐了，发车！但为了让你单人好测试（不用打开4个浏览器），MVP 中我暂时将开局条件改为 >= 1
  // （在真实的生产环境必须改成 >= 4 哦！）
  if (targetRoom.members.length >= 1) {
    targetRoom.status = 'IN_PROGRESS';
  }

  res.json({ room: targetRoom });
});

// 保存生成的剧本流/音频谱信息
app.post('/api/rooms/:id/messages', (req, res) => {
  const room = db.rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const msg = { 
    id: generateId(), 
    roomId: req.params.id, 
    agentRole: req.body.agentRole, 
    content: req.body.content, 
    metadata: req.body.metadata 
  };
  
  db.messages.push(msg);
  res.json({ message: msg });
});

app.listen(PORT, () => {
  console.log(`[Matching Mock Server] Online -> http://localhost:${PORT} \n(Running in In-Memory mode to bypass strict network firewall)`);
});
