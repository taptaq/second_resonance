import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BrainCircuit,
  Eye,
  Mic2,
  Clapperboard,
  AlertTriangle,
  History,
  Zap,
} from "lucide-react";
import { useAgentStore } from "../store/useAgentStore";

const AGENTS = [
  {
    id: "director",
    name: "导演",
    icon: Clapperboard,
    mbti: "ENTJ",
    avatar: "https://picsum.photos/seed/director/100/100",
    role: "DIRECTOR",
  },
  {
    id: "writer",
    name: "编剧",
    icon: BrainCircuit,
    mbti: "INTP",
    avatar: "https://picsum.photos/seed/writer/100/100",
    role: "WRITER",
  },
  {
    id: "visual",
    name: "视觉",
    icon: Eye,
    mbti: "ISFP",
    avatar: "https://picsum.photos/seed/visual/100/100",
    role: "VISUALIZER",
  },
  {
    id: "audio",
    name: "音频",
    icon: Mic2,
    mbti: "ISTP",
    avatar: "https://picsum.photos/seed/audio/100/100",
    role: "AUDIO",
  },
];

export default function Sidebar() {
  const { messages, isGenerating, roomInfo } = useAgentStore();
  const asideRef = useRef<HTMLElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<any | null>(null);
  const [hoveredTop, setHoveredTop] = useState(0);

  const lastMsg = messages[messages.length - 1];

  const handleHover = (agent: any, e: React.MouseEvent) => {
    if (!asideRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const asideRect = asideRef.current.getBoundingClientRect();
    setHoveredTop(rect.top - asideRect.top);
    setHoveredAgent(agent);
  };

  const handleLeave = () => {
    setHoveredAgent(null);
  };

  // Map real members from the database room state
  const getAgentData = (baseAgent: any) => {
    const roleMap: Record<string, string> = {
      DIRECTOR: "导演",
      WRITER: "编剧",
      VISUALIZER: "视觉",
      AUDIO: "音频",
    };
    const member = roomInfo?.members?.find(
      (m: any) =>
        m.avatar?.role === baseAgent.role ||
        m.avatar?.role === roleMap[baseAgent.role],
    );
    const isHost =
      member && roomInfo?.members?.[0]?.avatar?.id === member.avatar.id;
    if (!member)
      return {
        ...baseAgent,
        status: "空缺未连接",
        isConnected: false,
        overrideName: "等待投影接入...",
        isHost: false,
        realAvatarId: null,
      };
    return {
      ...baseAgent,
      status: getStatus(baseAgent.role),
      isConnected: true,
      overrideName: member.avatar.name,
      isHost,
      realAvatarId: member.avatar.id,
      mbti: member.avatar.mbti,
    };
  };

  const getStatus = (role: string) => {
    if (isGenerating) {
      if (!lastMsg && role === "DIRECTOR") return "推演筹备中";
      if (lastMsg?.role === "DIRECTOR" && role === "WRITER")
        return "撰写剧本中";
      if (lastMsg?.role === "HUMAN" && role === "WRITER")
        return "接收干预指令中";
      if (lastMsg?.role === "WRITER" && role === "VISUALIZER")
        return "解析视觉标签中";
      if (lastMsg?.role === "VISUALIZER" && role === "AUDIO")
        return "生成音频频谱中";
      if (lastMsg?.role === "AUDIO" && role === "DIRECTOR")
        return "评估剧情局势中";
    }
    return lastMsg?.role === role ? "就绪" : "休眠待命";
  };

  return (
    <aside
      ref={asideRef}
      className="w-72 border-r border-cyan-900/30 bg-[#0a0a0a] p-4 flex flex-col gap-4 overflow-visible shrink-0 relative z-60"
    >
      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-2">
        联合演播智能体网络状态
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
        {AGENTS.map((agent) => {
          const enrichedAgent = getAgentData(agent);
          return (
            <AgentCard
              key={agent.id}
              agent={enrichedAgent}
              status={enrichedAgent.status}
              isConnected={enrichedAgent.isConnected}
              onHover={(e) => handleHover(enrichedAgent, e)}
              onLeave={handleLeave}
              isHovered={hoveredAgent?.id === agent.id}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {hoveredAgent && (
          <CharacterProfileTooltip
            avatarId={hoveredAgent.realAvatarId}
            avatar={hoveredAgent}
            isConnected={hoveredAgent.isConnected}
            style={{ top: hoveredTop }}
          />
        )}
      </AnimatePresence>
    </aside>
  );
}

const CharacterProfileTooltip: React.FC<{
  avatarId: string;
  avatar: any;
  isConnected: boolean;
  style?: React.CSSProperties;
}> = ({ avatarId, avatar, isConnected, style }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !avatarId) return;
    fetch(`http://localhost:3005/api/avatars/${avatarId}/recent-songs`)
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.songs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("History fetch failed:", err);
        setLoading(false);
      });
  }, [avatarId, isConnected]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 10, scale: 0.95 }}
      style={style}
      className="absolute left-[105%] w-64 z-[100] pointer-events-none"
    >
      <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden relative">
        {/* Background Scanline effect */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(6,182,212,0.05)_50%)] bg-[length:100%_4px] opacity-20"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4 border-b border-cyan-900/40 pb-3">
            <div className="w-12 h-12 rounded-lg border border-cyan-500/50 overflow-hidden shrink-0">
              <img
                src={avatar.avatar}
                alt={avatar.overrideName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono text-cyan-500 font-bold uppercase tracking-tighter mb-0.5">
                个人档案 / FILE
              </div>
              <h4 className="text-sm font-bold text-slate-100 truncate">
                {avatar.overrideName}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-900/60 rounded border border-slate-800 p-2">
              <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">
                职责分工 / ROLE
              </div>
              <div className="text-[10px] text-cyan-400 font-bold">
                {avatar.name?.split(" ")[0] || avatar.role}
              </div>
            </div>
            <div className="bg-slate-900/60 rounded border border-slate-800 p-2">
              <div className="text-[9px] font-mono text-slate-500 uppercase mb-1">
                人格类型 / MBTI
              </div>
              <div className="text-[10px] text-rose-400 font-bold">
                {avatar.mbti}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest border-l-2 border-cyan-500 pl-2">
              <History className="w-3 h-3 text-cyan-500" />
              历史参与记录 / HISTORY
            </div>

            <div className="space-y-2 min-h-[60px]">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : history.length > 0 ? (
                history.map((song, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-slate-900/40 p-1.5 rounded border border-slate-800/50 hover:border-cyan-500/30 transition-colors group/item"
                  >
                    <img
                      src={song.artworkUrl100}
                      className="w-6 h-6 rounded ring-1 ring-slate-800 group-hover/item:ring-cyan-500/50 transition-all"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-slate-300 truncate font-medium">
                        {song.trackName}
                      </p>
                      <p className="text-[8px] text-slate-500 truncate">
                        {song.artistName}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[9px] text-slate-600 font-mono italic p-2 text-center border border-slate-800/30 border-dashed rounded">
                  {isConnected
                    ? "新加入角色，暂无历史记录。"
                    : "系统离线，记录无法获取。"}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-cyan-900/30 flex justify-between items-center text-[8px] font-mono text-slate-600">
            <span>安全连接：已建立 (SECURE)</span>
            <Zap className="w-2 h-2 text-cyan-500" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AgentCard: React.FC<{
  agent: any;
  status: string;
  isConnected: boolean;
  onHover: (e: React.MouseEvent) => void;
  onLeave: () => void;
  isHovered: boolean;
}> = ({ agent, status, isConnected, onHover, onLeave, isHovered }) => {
  const isConflict = status === "冲突投票决议中";
  const isGenerating = status.includes("中");

  return (
    <div className="relative" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <motion.div
        className={`relative p-3 rounded-lg border ${isConflict ? "border-rose-500/50 bg-rose-950/10" : "border-slate-800 bg-slate-900/50 hover:border-cyan-500/30 transition-colors cursor-help"} overflow-hidden shadow-lg`}
        animate={
          isConflict
            ? {
                boxShadow: [
                  "0 0 0px rgba(244,63,94,0)",
                  "0 0 15px rgba(244,63,94,0.3)",
                  "0 0 0px rgba(244,63,94,0)",
                ],
              }
            : {}
        }
        transition={isConflict ? { repeat: Infinity, duration: 2 } : {}}
      >
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>

        <div className="flex items-start gap-3 relative z-10">
          <div className="relative shrink-0">
            <img
              src={agent.avatar}
              alt={agent.overrideName}
              className={`w-10 h-10 rounded-md object-cover border border-slate-700 transition-all duration-500 ${isConnected ? "grayscale-0 contrast-125" : "grayscale opacity-30"} ${isHovered ? "ring-2 ring-cyan-500/50 scale-110" : ""}`}
              referrerPolicy="no-referrer"
            />
            <div
              className={`absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 border border-slate-800 transition-colors ${isHovered ? "border-cyan-500" : ""}`}
            >
              <agent.icon
                className={`w-3 h-3 ${isConnected ? "text-cyan-500" : "text-slate-600"}`}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1 gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${isConnected ? "bg-cyan-950/50 text-cyan-400 border border-cyan-800/50" : "bg-slate-800 text-slate-500 border border-slate-700"}`}
                >
                  {agent.name.split(" ")[0]}
                </span>
                <h3
                  className={`text-sm font-medium truncate transition-colors ${isConnected ? (isHovered ? "text-cyan-300" : "text-slate-200") : "text-slate-600"}`}
                >
                  {agent.overrideName}
                </h3>
                {agent.isHost && (
                  <span className="text-[9px] font-bold font-mono px-1 py-0.5 bg-amber-900/40 text-amber-500 border border-amber-700/50 rounded shrink-0">
                    房主
                  </span>
                )}
              </div>
              {isConnected && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded shrink-0">
                  {agent.mbti}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              {isConflict && (
                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
              )}
              {isGenerating && isConnected && (
                <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
              )}
              {!isConflict && !isGenerating && (
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${status === "空缺未连接" ? "bg-slate-800 border border-slate-700" : status === "就绪" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-600"}`}
                ></div>
              )}
              <span
                className={`text-xs font-mono truncate ${isConflict ? "text-rose-400" : isGenerating ? "text-cyan-400" : "text-slate-500"}`}
              >
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
    </div>
  );
};
