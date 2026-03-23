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

// --- 新增：网易云音乐 Netease Cloud Music 原生检索代理 ---
// 利用 Node.js 后端发起请求，完美避开浏览器的 CORS 跨域限制，且直连国内速度极快
app.get('/api/search', async (req, res) => {
  try {
    const keyword = req.query.q as string;
    if (!keyword) return res.json({ results: [] });

    // type=10 表示搜索“专辑”（因为单曲 API 直接返回并不带封面图），这样能保证拿到超清封面
    const ntRes = await fetch('http://music.163.com/api/search/get/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: `s=${encodeURIComponent(keyword)}&type=10&limit=18&offset=0`
    });
    
    const ntData = await ntRes.json();
    
    if (ntData.result && ntData.result.albums) {
      // 映射成我们前端需要的数据结构
      const mappedAlbums = ntData.result.albums.map((a: any) => ({
        trackId: a.id.toString(),
        trackName: a.name,
        artistName: a.artist?.name || keyword,
        collectionName: '网易云音乐 (Netease)',
        artworkUrl100: a.picUrl ? `${a.picUrl}?param=500y500` : 'https://picsum.photos/500/500' // 请求网易云500x500高清图
      }));
      return res.json({ results: mappedAlbums });
    }
    
    res.json({ results: [] });
  } catch (err) {
    console.error('Netease API Error:', err);
    res.status(500).json({ error: 'Failed to fetch from Netease' });
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
