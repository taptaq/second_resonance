import { Play, SkipBack, SkipForward, Volume2, Loader2, Pause } from 'lucide-react';
import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { useAgentStore } from '../store/useAgentStore';

function SimulationImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'LOADING' | 'LOADED' | 'ERROR'>('LOADING');
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setStatus('LOADING');
    setRetryCount(prev => prev + 1);
  };

  // 增加 retry 参数强制刷新缓存
  const finalSrc = retryCount > 0 ? `${src}&retry=${retryCount}` : src;

  return (
    <div className="relative w-full h-64 bg-slate-950/50 overflow-hidden group">
      {status === 'LOADING' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm z-10">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-500/40" />
          <span className="text-[10px] font-mono mt-2 text-cyan-700 tracking-widest animate-pulse">
            正在渲染共振视觉信号 (SYNCING...)
          </span>
        </div>
      )}
      {status === 'ERROR' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/10 z-10 border-b border-rose-900/20">
          <span className="text-rose-500/40 text-[10px] font-mono mb-3 tracking-tighter">
            视觉信道受阻 (VISUAL_BUFFER_ERROR)
          </span>
          <button 
            onClick={handleRetry}
            className="px-4 py-1.5 bg-slate-900/80 border border-slate-700/50 rounded text-[10px] text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all font-mono shadow-xl"
          >
            强制重连 / RE-SYNC
          </button>
        </div>
      )}
      <img 
        src={finalSrc} 
        alt={alt}
        onLoad={() => setStatus('LOADED')}
        onError={() => setStatus('ERROR')}
        className={`w-full h-full object-cover transition-all duration-1000 ease-out ${
          status === 'LOADED' 
            ? 'opacity-70 group-hover:opacity-100 grayscale hover:grayscale-0 scale-100' 
            : 'opacity-0 scale-105'
        }`} 
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function MainStage() {
  const { messages, isGenerating, songInfo, roomInfo, songVibe } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };
  
  const audioSrc = songInfo?.audioUrl || (songInfo?.trackId ? `https://api.injahow.cn/meting/?server=netease&type=url&id=${songInfo.trackId}` : songInfo?.previewUrl);
  // const isFull = roomInfo?.members?.length >= 4;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.log('Autoplay prevented:', err));
    }
  };

  const getAgentInfo = (role: string) => {
    if (!roomInfo?.members) return null;
    const roleMap: Record<string, string> = { 'DIRECTOR': '导演', 'WRITER': '编剧', 'VISUALIZER': '视觉', 'AUDIO': '音频' };
    return roomInfo.members.find((m: any) => m.avatar?.role === role || m.avatar?.role === roleMap[role])?.avatar;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isGenerating]);

  return (
    <main className="flex-1 flex flex-col relative bg-[#020202] overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 custom-scrollbar scroll-smooth"
        style={{ paddingBottom: '450px' }}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-12">
          
          {messages.length === 0 && !isGenerating && (
            <div className="text-center text-slate-500 font-mono mt-20 opacity-50">
              [系统休眠：正在等待主控制台注入前置概念标签]
            </div>
          )}

          {messages.map((msg, index) => {
            const agentInfo = getAgentInfo(msg.role);
            
            if (msg.role === 'VISUALIZER') {
              const tag = msg.metadata?.tag || 'SCENE_IMAGE';
              // Use pollinations.ai with FLUX model for superior quality
              // We blend the song vibe, the agent's specific tag, and the first 100 chars of content for maximum relevance
              const cleanTag = tag.replace(/[\[\]]/g, ''); // Clean any lingering brackets
              const prompt = encodeURIComponent(`${cleanTag}, ${songVibe} aesthetic, cinematic lighting, 8k resolution, ${msg.content.substring(0, 100).replace(/[\[\]]/g, '')}`);
              const imgUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=600&nologo=true&model=flux&seed=${msg.timestamp % 1000}`;
              return (
                <div key={msg.id} className="relative group">
                  <div className="absolute -left-12 top-0 text-xs font-mono text-slate-600 rotate-90 origin-left">场景快照_0{index+1}</div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                    <SimulationImage src={imgUrl} alt={tag} />
                    <div className="p-4 bg-black/80 backdrop-blur-sm border-t border-slate-800 flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <span className="text-xs font-mono text-cyan-500 font-bold">V</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 font-mono mb-1 flex items-center gap-2">
                          <span>视觉侧提示词标签: [{tag}]</span>
                          {agentInfo && (
                            <span className="text-[10px] text-cyan-600 border border-cyan-900/50 bg-cyan-950/30 px-1 py-0.5 rounded">
                              {agentInfo.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            if (msg.role === 'AUDIO') {
              const tags = msg.metadata?.tags || 'BPM:120, Genre:Unknown, Mood:Unknown';
              return (
                <div key={msg.id} className="relative group">
                  <div className="absolute -left-12 top-0 text-xs font-mono text-emerald-600 rotate-90 origin-left">混频总轨_0{index+1}</div>
                  <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl overflow-hidden shadow-2xl p-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center shrink-0 border border-emerald-700">
                        <span className="text-xs font-mono text-emerald-400 font-bold">A</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-emerald-500 font-mono mb-2 flex items-center gap-2">
                          <span>音频流合成同步参数: [{tags}]</span>
                          {agentInfo && (
                            <span className="text-[10px] text-emerald-400 border border-emerald-900/50 bg-emerald-950/30 px-1 py-0.5 rounded">
                              {agentInfo.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 h-6 mb-3">
                          {[...Array(24)].map((_, i) => (
                            <div key={i} className="flex-1 bg-emerald-500/50 rounded-full" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                          ))}
                        </div>
                        <p className="text-sm text-emerald-100/80 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Writer & Director & Human & System
            const isDirector = msg.role === 'DIRECTOR';
            const isHuman = msg.role === 'HUMAN';
            const isSystem = msg.role === 'SYSTEM';
            
            return (
              <div key={msg.id} className="relative group">
                <div className={`absolute -left-12 top-0 text-xs font-mono rotate-90 origin-left ${isDirector ? 'text-rose-600' : isHuman ? 'text-cyan-600' : 'text-slate-600'}`}>思维信道_0{index+1}</div>
                <div className={`p-4 rounded-xl shadow-lg border ${isDirector ? 'bg-rose-950/20 border-rose-900/30' : isHuman ? 'bg-cyan-950/20 border-cyan-900/30' : isSystem ? 'bg-amber-950/20 border-amber-900/30' : 'bg-slate-900/40 border-slate-800'}`}>
                  <div className="flex gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${isDirector ? 'bg-rose-900/50 border-rose-700 text-rose-400' : isHuman ? 'bg-cyan-900/50 border-cyan-700 text-cyan-400' : isSystem ? 'bg-amber-900/50 border-amber-700 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                      <span className="text-xs font-mono font-bold">{msg.role.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-mono mb-1 flex items-center gap-2 ${isDirector ? 'text-rose-500' : isHuman ? 'text-cyan-500' : isSystem ? 'text-amber-500' : 'text-slate-500'}`}>
                        <span className="font-bold">{msg.role}</span>
                        {agentInfo && (
                          <span className={`text-[10px] px-1 py-0.5 rounded border ${isDirector ? 'border-rose-900/50 bg-rose-950/30 text-rose-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                            {agentInfo.name} | {agentInfo.mbti}
                          </span>
                        )}
                        {isHuman && (
                          <span className="text-[10px] px-1 py-0.5 rounded border border-cyan-900/50 bg-cyan-950/30 text-cyan-400">
                            手动指令接入 / INTERVENE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="relative">
              <div className="absolute -left-12 top-0 text-xs font-mono text-cyan-800 rotate-90 origin-left animate-pulse">正在同步</div>
              <div className="bg-slate-900/50 border border-cyan-900/30 rounded-xl overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.05)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_2s_infinite]"></div>
                <div className="w-full h-32 flex items-center justify-center relative z-10">
                  <div className="flex flex-col items-center gap-2 text-cyan-500">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-mono">正在拉取下一序列智能体节推演...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-80 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-b border-slate-800 px-6 flex items-center gap-6 z-20">
        {audioSrc && (
          <audio 
            ref={audioRef} 
            src={audioSrc} 
            loop 
            autoPlay
            referrerPolicy="no-referrer"
            onPlay={() => setIsPlaying(true)} 
            onPause={() => setIsPlaying(false)} 
            onEnded={() => setIsPlaying(false)}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          />
        )}
        <div className="flex items-center gap-4">
          <button 
            disabled={!audioSrc}
            onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }}
            className={`text-slate-600 hover:text-cyan-400 transition-colors ${!audioSrc ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            title="后退 10 秒"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button 
            disabled={!audioSrc}
            onClick={togglePlay}
            className={`w-12 h-12 rounded-full ${!audioSrc ? 'bg-slate-800 border border-slate-700 cursor-not-allowed shadow-none' : isPlaying ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-700 hover:bg-slate-600'} text-black flex items-center justify-center transition-all duration-300`}
            title={audioSrc ? "播放/暂停音轨" : "未检测到物理音轨载体"}
          >
            {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className={`w-5 h-5 ml-1 ${isPlaying ? 'text-black' : 'text-slate-300'}`} />}
          </button>
          <button 
            disabled={!audioSrc}
            onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 10); }}
            className={`text-slate-600 hover:text-cyan-400 transition-colors ${!audioSrc ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            title="前进 10 秒"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              {songInfo ? (
                <>
                  <span className="text-cyan-400 font-bold max-w-[150px] truncate">《{songInfo.trackName}》</span>
                  <span className="text-slate-500 truncate max-w-[100px]">- {songInfo.artistName}</span>
                </>
              ) : (
                <span className="text-slate-500">未知的音频频段</span>
              )}
            </div>
            <span className={isGenerating ? "text-cyan-500 animate-pulse" : "text-slate-600"}>全频带广播剧同步进度</span>
            <span className="w-24 text-right">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <div 
            className="h-8 w-full flex items-center gap-[2px] cursor-pointer group"
            onClick={(e) => {
              if (audioRef.current && duration > 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                audioRef.current.currentTime = (clickX / rect.width) * duration;
              }
            }}
          >
            {[...Array(120)].map((_, i) => {
              const progressRatio = duration > 0 ? currentTime / duration : 0;
              const isActive = (i / 120) <= progressRatio;
              const baseHeight = Math.sin(i * 0.1) * 30 + 40;
              const height = isPlaying && isActive ? baseHeight + (Math.random() * 30 - 15) : (isActive ? baseHeight : 10);
              return (
                <div 
                  key={i} 
                  className={`flex-1 rounded-full transition-all duration-200 ${isActive ? (isPlaying && i % 3 === 0 ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-cyan-600') : 'bg-slate-800'} ${!isActive && 'group-hover:bg-slate-700'}`} 
                  style={{ height: `${Math.max(10, height)}%` }}
                ></div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 w-32 group">
          <Volume2 className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume} 
            onChange={handleVolumeChange}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
          />
        </div>
      </div>
    </main>
  );
}
