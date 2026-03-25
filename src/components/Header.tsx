import { Terminal, ArrowLeft, Check, MessageSquare } from "lucide-react";
import { useAgentStore } from "../store/useAgentStore";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const {
    roomInfo,
    songInfo,
    avatarId,
    isChatOpen,
    setChatOpen,
    chatMessages,
    lastReadChatCount,
  } = useAgentStore();
  const unreadCount = isChatOpen
    ? 0
    : Math.max(0, chatMessages.length - lastReadChatCount);
  const hasUnread = unreadCount > 0;
  const navigate = useNavigate();

  const handleReturnToLobby = () => {
    if (!songInfo) return;

    // Find who we are in the room to resurrect our React Router Local Auth State
    const me = roomInfo?.members?.find(
      (m: any) => m.avatar?.id === avatarId,
    )?.avatar;

    const fallbackState = {
      avatarId, // Required by Lobby.tsx security routing guard
      nickname: me?.name || "未知角色",
      role: me?.role || "DIRECTOR",
      mbti: me?.mbti || "INTJ",
      artist: songInfo.artistName || "目标歌手",
      selectedSong: songInfo, // Required for Lobby UI metadata display
    };

    navigate(`/lobby/${songInfo.trackId}`, {
      state: fallbackState,
      replace: true,
    });
  };

  return (
    <header className="h-14 border-b border-cyan-900/40 bg-black/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20">
      <div className="flex items-center gap-3">
        {songInfo && (
          <button
            onClick={handleReturnToLobby}
            className="flex items-center justify-center w-8 h-8 rounded border border-slate-700 bg-slate-900/50 text-cyan-500 hover:text-cyan-400 hover:border-cyan-500 hover:bg-slate-800 transition-colors mr-2 cursor-pointer"
            title="撤出对战室，返回曲目大厅"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <Terminal className="w-5 h-5 text-cyan-500" />
        <h1 className="flex items-center gap-2 text-sm font-medium tracking-widest text-slate-200">
          <span className="text-cyan-500 font-bold">第二共振</span>
          {roomInfo && (
            <div className="flex items-center gap-2 ml-1 text-slate-400">
              <span>[</span>
              <span
                className="font-mono text-cyan-100 max-w-[150px] truncate"
                title={roomInfo.name || `ROOM:${roomInfo.id.substring(0, 8)}`}
              >
                {roomInfo.name || `ROOM:${roomInfo.id.substring(0, 8)}`}
              </span>
              <span>]</span>
            </div>
          )}
        </h1>
        <div className="h-4 w-[1px] bg-slate-800 mx-2"></div>
        {songInfo ? (
          <div className="flex items-center gap-2">
            <img
              src={songInfo.artworkUrl100}
              className="w-6 h-6 rounded-full border border-cyan-700/50 object-cover"
            />
            <span className="text-xs text-slate-400 font-mono tracking-wider truncate max-w-[200px]">
              共频目标:{" "}
              <span className="text-cyan-400 font-bold ml-1">
                {songInfo.trackName}
              </span>
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-mono tracking-wider">
            A2A 剧情视听推演引擎
          </span>
        )}
      </div>

      <div className="flex items-center gap-6 text-xs font-mono">
        <button
          onClick={() => setChatOpen(!isChatOpen)}
          className={`relative flex items-center gap-2.5 px-4 py-2 rounded-sm border transition-all duration-300 overflow-hidden group ${
            isChatOpen
              ? "bg-cyan-900/60 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
              : hasUnread
                ? "bg-gradient-to-r from-rose-950/60 to-purple-900/40 border-rose-500/60 text-rose-100 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.5)]"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-700 hover:bg-slate-800"
          }`}
        >
          {/* Subtle background glow for unread messages */}
          {!isChatOpen && hasUnread && (
            <div className="absolute inset-0 bg-rose-500/10 animate-[pulse_2s_ease-in-out_infinite]"></div>
          )}

          <div className="relative z-10 flex">
            <MessageSquare
              className={`w-4 h-4 ${!isChatOpen && hasUnread ? "text-rose-400" : ""}`}
            />
            {!isChatOpen && hasUnread && (
              <>
                <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-rose-400 rounded-full"></span>
              </>
            )}
          </div>

          <span className="hidden md:inline font-bold tracking-widest text-xs z-10 font-sans">
            房间连线频道
          </span>

          {hasUnread && (
            <span className="z-10 ml-1 text-[10px] font-black px-2 py-0.5 rounded-full border font-mono tracking-widest bg-rose-600 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]">
              {unreadCount} 条新消息
            </span>
          )}
        </button>

        {/* Current Agent Identity Badge */}
        <div className="flex flex-col items-end pr-4 border-r border-slate-800 h-10 justify-center">
          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter mb-0.5">
            当前身份 / IDENTITY
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-cyan-400 tracking-wider">
              {roomInfo?.members?.find((m: any) => m.avatar?.id === avatarId)
                ?.avatar?.name || "未知角色"}
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-700">
              {roomInfo?.members?.find((m: any) => m.avatar?.id === avatarId)
                ?.avatar?.mbti || "INTJ"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
          <span className="text-cyan-600 font-sans text-[10px]">网络状态: 已接入主干</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-emerald-600 font-sans text-[10px]">协同算力: 4 核心全开</span>
        </div>
        <div className="px-2 py-1 bg-rose-950/30 border border-rose-900/50 rounded text-rose-500 text-[10px] font-sans">
          控制协议: 人工意志授权
        </div>
      </div>
    </header>
  );
}
