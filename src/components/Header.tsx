import { Terminal, ArrowLeft, Check } from "lucide-react";
import { useAgentStore } from "../store/useAgentStore";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const { roomInfo, songInfo, avatarId } = useAgentStore();
  const navigate = useNavigate();

  const handleReturnToLobby = () => {
    if (!songInfo) return;

    // Find who we are in the room to resurrect our React Router Local Auth State
    const me = roomInfo?.members?.find(
      (m: any) => m.avatar?.id === avatarId,
    )?.avatar;

    const fallbackState = {
      avatarId, // Required by Lobby.tsx security routing guard
      nickname: me?.name || "未知特工",
      role: me?.role || "DIRECTOR",
      mbti: me?.mbti || "INTJ",
      artist: songInfo.artistName || "目标歌手",
      selectedSong: songInfo // Required for Lobby UI metadata display
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
