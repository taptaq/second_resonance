import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Fingerprint, Map } from 'lucide-react';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [artist, setArtist] = useState('');
  const [role, setRole] = useState('导演');
  const [mbti, setMbti] = useState('INTJ');
  const navigate = useNavigate();

  const handleNext = () => {
    if (!nickname.trim() || !artist.trim()) return alert('请先输入你的特派分身代号以及要追随的主推灵感歌手名称！');
    // Save avatar parameters and proceed to the Song Hub Route smoothly
    navigate('/select-song', { state: { nickname, artist, role, mbti } });
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-cyan-900/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.1)] p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
        
        <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-6">
          <Terminal className="w-8 h-8 text-cyan-500 animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-slate-200">
              <span className="text-cyan-500">第二共振</span> A2A 枢纽
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">SecondMe Auth Pending... Entering Guest Initialization</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2">/ Agent 分身代号</label>
            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="例如: 赛博流浪汉" className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2">/ 主推灵感歌手</label>
            <input type="text" value={artist} onChange={e => setArtist(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleNext() }} placeholder="你想匹配哪位歌手的同好？(例如: 孙燕姿)" className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2 flex items-center justify-between">
              <span>/ 专属职能序列</span>
            </label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              {['导演', '编剧', '视觉', '音频'].map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-3 rounded-lg border font-mono text-xs transition-all ${role === r ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 font-mono italic leading-relaxed flex items-start gap-1">
               <span className="text-cyan-700 font-bold">*</span> 预检提示：仅作初始偏好。正式共创组局时，您随时可跨流派切换职能或跳车更换房间。
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2 flex justify-between">
              <span>/ MBTI 性格矩阵</span>
              <span className="text-slate-600 flex items-center gap-1"><Fingerprint className="w-3 h-3" /> 预留 SecondMe 记忆接口</span>
            </label>
            <select value={mbti} onChange={e => setMbti(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer">
              <optgroup label="分析家">
                <option value="INTJ">INTJ (建筑师)</option>
                <option value="INTP">INTP (逻辑学家)</option>
                <option value="ENTJ">ENTJ (指挥官)</option>
                <option value="ENTP">ENTP (辩论家)</option>
              </optgroup>
              <optgroup label="外交家">
                <option value="INFJ">INFJ (提倡者)</option>
                <option value="INFP">INFP (调停者)</option>
                <option value="ENFJ">ENFJ (主人公)</option>
                <option value="ENFP">ENFP (竞选者)</option>
              </optgroup>
              <optgroup label="守护者">
                <option value="ISTJ">ISTJ (物流师)</option>
                <option value="ISFJ">ISFJ (守卫者)</option>
                <option value="ESTJ">ESTJ (总经理)</option>
                <option value="ESFJ">ESFJ (执政官)</option>
              </optgroup>
              <optgroup label="探险家">
                <option value="ISTP">ISTP (鉴赏家)</option>
                <option value="ISFP">ISFP (探险家)</option>
                <option value="ESTP">ESTP (企业家)</option>
                <option value="ESFP">ESFP (表演者)</option>
              </optgroup>
            </select>
          </div>

          <button
            onClick={handleNext}
            className="w-full mt-4 py-4 rounded-lg bg-indigo-900/30 hover:bg-indigo-800/40 border border-indigo-500/50 text-indigo-400 font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-3 relative overflow-hidden group"
          >
            <Map className="w-5 h-5 group-hover:animate-bounce" />
            <span className="font-mono text-sm">携源参数跃迁至选曲星港</span>
          </button>
        </div>
      </div>
    </div>
  );
}
