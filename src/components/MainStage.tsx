import { Play, SkipBack, SkipForward, Volume2, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAgentStore } from '../store/useAgentStore';

export default function MainStage() {
  const { messages, isGenerating } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  return (
    <main className="flex-1 flex flex-col relative bg-[#020202] overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 pb-32 custom-scrollbar scroll-smooth"
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-12">
          
          {messages.length === 0 && !isGenerating && (
            <div className="text-center text-slate-500 font-mono mt-20 opacity-50">
              [系统休眠：正在等待主控制台注入前置概念标签]
            </div>
          )}

          {messages.map((msg, index) => {
            if (msg.role === 'VISUALIZER') {
              const tag = msg.metadata?.tag || 'SCENE';
              const imgUrl = `https://picsum.photos/seed/${msg.id}/800/400`;
              return (
                <div key={msg.id} className="relative group">
                  <div className="absolute -left-12 top-0 text-xs font-mono text-slate-600 rotate-90 origin-left">场景快照_0{index+1}</div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                    <img src={imgUrl} alt={tag} className="w-full h-64 object-cover opacity-80 group-hover:opacity-100 transition-opacity grayscale hover:grayscale-0 duration-700" referrerPolicy="no-referrer" />
                    <div className="p-4 bg-black/80 backdrop-blur-sm border-t border-slate-800 flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                        <span className="text-xs font-mono text-cyan-500 font-bold">V</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 font-mono mb-1">视觉侧提示词标签: [{tag}]</div>
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
                        <div className="text-xs text-emerald-500 font-mono mb-2">音频流合成同步参数: [{tags}]</div>
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
                      <div className={`text-xs font-mono mb-1 ${isDirector ? 'text-rose-500' : isHuman ? 'text-cyan-500' : isSystem ? 'text-amber-500' : 'text-slate-500'}`}>
                        {msg.role}
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
              <div className="absolute -left-12 top-0 text-xs font-mono text-cyan-800 rotate-90 origin-left animate-pulse">信道握手中</div>
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

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-slate-800 px-6 flex items-center gap-6 z-20">
        <div className="flex items-center gap-4">
          <button className="text-slate-400 hover:text-white transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>
          <button className={`w-12 h-12 rounded-full ${isGenerating ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-700'} text-black flex items-center justify-center transition-all duration-300`}>
            <Play className={`w-5 h-5 ml-1 ${isGenerating ? 'text-black' : 'text-slate-400'}`} />
          </button>
          <button className="text-slate-400 hover:text-white transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>实况直出</span>
            <span className={isGenerating ? "text-cyan-500 animate-pulse" : "text-slate-600"}>全频带广播剧同步进度</span>
            <span>--:--</span>
          </div>
          <div className="h-8 w-full flex items-center gap-[2px]">
            {[...Array(120)].map((_, i) => {
              const baseHeight = Math.sin(i * 0.1) * 30 + 40;
              const height = isGenerating ? baseHeight + (Math.random() * 30 - 15) : 10;
              return (
                <div 
                  key={i} 
                  className={`flex-1 rounded-full transition-all duration-200 ${isGenerating && i % 3 === 0 ? 'bg-cyan-500' : 'bg-slate-700'}`} 
                  style={{ height: `${Math.max(10, height)}%` }}
                ></div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 w-32">
          <Volume2 className="w-4 h-4 text-slate-400" />
          <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-slate-400"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
