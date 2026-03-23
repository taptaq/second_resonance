import { Terminal } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-14 border-b border-cyan-900/40 bg-black/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center gap-3">
        <Terminal className="w-5 h-5 text-cyan-500" />
        <h1 className="text-sm font-medium tracking-widest text-slate-200">
          <span className="text-cyan-500 font-bold">第二共振</span> (SECOND RESONANCE)
        </h1>
        <div className="h-4 w-[1px] bg-slate-800 mx-2"></div>
        <span className="text-xs text-slate-500 font-mono tracking-wider">A2A 剧情视听推演引擎</span>
      </div>
      
      <div className="flex items-center gap-6 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
          <span className="text-cyan-600">网络状态: 已接入主干脉络</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-emerald-600">协同算力: 4 核心全开并网</span>
        </div>
        <div className="px-2 py-1 bg-rose-950/30 border border-rose-900/50 rounded text-rose-500">
          控制协议: 顶级人工意志代理
        </div>
      </div>
    </header>
  );
}
