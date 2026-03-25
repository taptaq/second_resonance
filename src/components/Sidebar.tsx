import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, Eye, Mic2, Clapperboard, AlertTriangle } from 'lucide-react';
import { useAgentStore } from '../store/useAgentStore';

const AGENTS = [
  { id: 'director', name: '导演 (Director)', icon: Clapperboard, mbti: 'ENTJ', avatar: 'https://picsum.photos/seed/director/100/100', role: 'DIRECTOR' },
  { id: 'writer', name: '编剧 (Writer)', icon: BrainCircuit, mbti: 'INTP', avatar: 'https://picsum.photos/seed/writer/100/100', role: 'WRITER' },
  { id: 'visual', name: '视觉 (Visual)', icon: Eye, mbti: 'ISFP', avatar: 'https://picsum.photos/seed/visual/100/100', role: 'VISUALIZER' },
  { id: 'audio', name: '音频 (Audio)', icon: Mic2, mbti: 'ISTP', avatar: 'https://picsum.photos/seed/audio/100/100', role: 'AUDIO' },
];

export default function Sidebar() {
  const { messages, isGenerating, roomInfo } = useAgentStore();
  
  const lastMsg = messages[messages.length - 1];

  // Map real members from the database room state
  const getAgentData = (baseAgent: any) => {
    const roleMap: Record<string, string> = { 'DIRECTOR': '导演', 'WRITER': '编剧', 'VISUALIZER': '视觉', 'AUDIO': '音频' };
    const member = roomInfo?.members?.find((m: any) => m.avatar?.role === baseAgent.role || m.avatar?.role === roleMap[baseAgent.role]);
    const isHost = member && roomInfo?.members?.[0]?.avatar?.id === member.avatar.id;
    if (!member) return { ...baseAgent, status: '空缺未连接', isConnected: false, overrideName: '等待投影接入...', isHost: false };
    return { ...baseAgent, status: getStatus(baseAgent.role), isConnected: true, overrideName: member.avatar.name, isHost };
  };

  const getStatus = (role: string) => {
    if (isGenerating) {
      if (!lastMsg && role === 'DIRECTOR') return '推演筹备中';
      if (lastMsg?.role === 'DIRECTOR' && role === 'WRITER') return '撰写剧本中';
      if (lastMsg?.role === 'HUMAN' && role === 'WRITER') return '接收干预指令中';
      if (lastMsg?.role === 'WRITER' && role === 'VISUALIZER') return '解析视觉标签中';
      if (lastMsg?.role === 'VISUALIZER' && role === 'AUDIO') return '生成音频频谱中';
      if (lastMsg?.role === 'AUDIO' && role === 'DIRECTOR') return '评估剧情局势中';
    }
    return lastMsg?.role === role ? '就绪' : '休眠待命';
  };

  return (
    <aside className="w-72 border-r border-cyan-900/30 bg-[#0a0a0a] p-4 flex flex-col gap-4 overflow-y-auto shrink-0 custom-scrollbar">
      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-2">
        联合演播智能体网络状态
      </div>
      
      {AGENTS.map((agent) => {
        const enrichedAgent = getAgentData(agent);
        return <AgentCard key={agent.id} agent={enrichedAgent} status={enrichedAgent.status} isConnected={enrichedAgent.isConnected} />
      })}
    </aside>
  );
}

const AgentCard: React.FC<{ agent: any, status: string, isConnected: boolean }> = ({ agent, status, isConnected }) => {
  const isConflict = status === '冲突投票决议中';
  const isGenerating = status.includes('中');

  return (
    <motion.div 
      className={`relative p-3 rounded-lg border ${isConflict ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800 bg-slate-900/50'} overflow-hidden`}
      animate={isConflict ? { boxShadow: ['0 0 0px rgba(244,63,94,0)', '0 0 15px rgba(244,63,94,0.3)', '0 0 0px rgba(244,63,94,0)'] } : {}}
      transition={isConflict ? { repeat: Infinity, duration: 2 } : {}}
    >
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>

      <div className="flex items-start gap-3 relative z-10">
        <div className="relative shrink-0">
          <img src={agent.avatar} alt={agent.overrideName} className={`w-10 h-10 rounded-md object-cover border border-slate-700 transition-all ${isConnected ? 'grayscale-0 contrast-125' : 'grayscale opacity-30'}`} referrerPolicy="no-referrer" />
          <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 border border-slate-800">
            <agent.icon className={`w-3 h-3 ${isConnected ? 'text-cyan-500' : 'text-slate-600'}`} />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1 gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${isConnected ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-800/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                {agent.name.split(' ')[0]}
              </span>
              <h3 className={`text-sm font-medium truncate ${isConnected ? 'text-slate-200' : 'text-slate-600'}`}>
                {agent.overrideName}
              </h3>
              {agent.isHost && <span className="text-[9px] font-bold font-mono px-1 py-0.5 bg-amber-900/40 text-amber-500 border border-amber-700/50 rounded shrink-0">房主</span>}
            </div>
            {isConnected && <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded shrink-0">{agent.mbti}</span>}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            {isConflict && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
            {isGenerating && isConnected && <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shrink-0"></div>}
            {!isConflict && !isGenerating && <div className={`w-2 h-2 rounded-full shrink-0 ${status === '空缺未连接' ? 'bg-slate-800 border border-slate-700' : status === '就绪' ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>}
            <span className={`text-xs font-mono truncate ${isConflict ? 'text-rose-400' : isGenerating ? 'text-cyan-400' : 'text-slate-500'}`}>
              {status}
            </span>
          </div>
        </div>
      </div>
      
      {isGenerating && (
        <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-cyan-500"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      )}
    </motion.div>
  );
}
