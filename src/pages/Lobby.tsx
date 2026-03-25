import { useState, useEffect } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import { useAgentStore } from "../store/useAgentStore";
import {
  Loader2,
  Users,
  UserPlus,
  PlusCircle,
  ChevronLeft,
  ShieldAlert,
} from "lucide-react";

export default function Lobby() {
  const { songId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const { setRoomId, avatarId } = useAgentStore();
  
  // Safe resolver preferring local state, falling back to persisted store
  const safeAvatarId = state?.avatarId || avatarId;

  const fetchRooms = async () => {
    try {
      const res = await fetch(`http://localhost:3005/api/rooms/${songId}`);
      const data = await res.json();
      if (data.rooms) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!safeAvatarId) return;
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [songId, safeAvatarId]);

  if (!safeAvatarId) return <Navigate to="/hub" />;

  const handleCreateRoom = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch("http://localhost:3005/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId: safeAvatarId, songId }),
      }).then((r) => r.json());

      if (res.room?.id) {
        setRoomId(res.room.id);
        navigate(`/room/${res.room.id}`);
      } else {
        alert("房间开辟失败。");
      }
    } catch (err) {
      console.error(err);
      alert("连接集群失败。");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch("http://localhost:3005/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId: safeAvatarId, roomId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "无法加入此房间。");
      } else if (data.room?.id) {
        setRoomId(data.room.id);
        navigate(`/room/${data.room.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("加入房间失败。");
    } finally {
      setIsActionLoading(false);
    }
  };

  const allRoles = ["导演", "编剧", "视觉", "音频"];

  return (
    <div className="min-h-screen bg-[#050505] p-8 text-cyan-50 font-sans relative">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

      <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-12 h-12 rounded-full border border-slate-700 bg-slate-900/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-500 hover:bg-slate-800 transition-colors shadow-lg"
            >
              <ChevronLeft className="w-6 h-6 -ml-1" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-widest text-slate-200 uppercase">
                节点大厅{" "}
                <span className="text-cyan-500 font-mono">/[LOBBY]</span>
              </h1>
              <div className="flex items-center gap-3 mt-3 text-xs font-mono text-slate-500">
                <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">
                  当前锚定曲目:
                  <span className="text-cyan-400 font-bold ml-1">
                    《{state.selectedSong?.trackName}》
                  </span>
                </span>
                <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-cyan-500 font-bold">
                  你的职能: {state.role}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={isActionLoading}
            className="cursor-pointer px-6 py-3 rounded-xl bg-cyan-950/40 border border-cyan-700 hover:bg-cyan-900/60 hover:border-cyan-400 text-cyan-400 font-bold tracking-widest uppercase transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50"
          >
            {isActionLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <PlusCircle className="w-5 h-5" />
            )}
            开辟新次元 (CREATE)
          </button>
        </div>

        {/* Room Grid */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-cyan-500/50 mt-20">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <span className="font-mono tracking-widest uppercase">
              扫描活跃节点中...
            </span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono border border-slate-800/50 rounded-2xl bg-slate-900/10 p-12 text-center mt-10">
            <ShieldAlert className="w-16 h-16 text-rose-500/30 mb-4" />
            <p className="text-lg text-slate-400 mb-2">
              未探测到该曲目的活跃对局
            </p>
            <p className="text-xs">
              你可以点击右上角的【开辟新次元】成为这首歌的第一个拓荒者。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const normalizedRoles = room.members.map(
                (m: any) => m.avatar.role,
              );
              const hasMyRole = normalizedRoles.includes(state?.role);
              const isFull = room.members.length >= 4;
              const amIInRoom = room.members.some(
                (m: any) => m.avatar.id === safeAvatarId,
              );

              return (
                <div
                  key={room.id}
                  className="border border-slate-800 bg-slate-900/40 rounded-xl p-5 relative overflow-hidden group hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col"
                >
                  {isFull && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-bold font-mono border-b border-l border-rose-500/30 rounded-bl-lg">
                      FULL
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-cyan-500/70" />
                    <span
                      className="font-mono text-sm text-cyan-200 truncate pr-8"
                      title={
                        room.name ? `[${room.name}] (${room.id})` : room.id
                      }
                    >
                      {room.name
                        ? `【${room.name}】`
                        : `ROOM_ID: ${room.id.substring(0, 8)}...`}
                    </span>
                  </div>

                  <div className="flex-1 mb-6">
                    <p className="text-xs text-slate-500 font-mono mb-2 uppercase">
                      已入驻职能 ({room.members.length}/4) :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allRoles.map((roleLabel) => {
                        const isOccupied = normalizedRoles.includes(roleLabel);
                        const isMe = state.role === roleLabel;
                        return (
                          <span
                            key={roleLabel}
                            className={`px-2 py-1 text-[11px] font-mono rounded border ${isOccupied ? "bg-slate-800 border-slate-600 text-slate-300" : "bg-transparent border-dashed border-slate-700/50 text-slate-600"} ${isOccupied && isMe ? "ring-2 ring-rose-500/50" : ""}`}
                          >
                            {roleLabel} {isOccupied ? "✓" : "等待"}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (isFull || amIInRoom) {
                        setRoomId(room.id);
                        navigate(`/room/${room.id}`);
                      } else {
                        handleJoinRoom(room.id);
                      }
                    }}
                    disabled={
                      (!isFull && hasMyRole && !amIInRoom) || isActionLoading
                    }
                    className={`w-full py-3 rounded text-sm font-bold font-mono tracking-widest uppercase flex justify-center items-center gap-2 outline-none transition-all ${
                      amIInRoom
                        ? "bg-cyan-600 hover:bg-cyan-500 text-black border shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
                        : !isFull && hasMyRole
                          ? "bg-rose-950/30 text-rose-400 border border-rose-900/50 opacity-70 cursor-not-allowed"
                          : isFull
                            ? "bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-700/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
                            : "bg-cyan-600 hover:bg-cyan-500 text-black border shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    {amIInRoom
                      ? "返回对战室 (RETURN)"
                      : isFull
                        ? "旁观推演 (SPECTATE)"
                        : hasMyRole
                          ? "该职能冲突"
                          : "请求骇入 (JOIN)"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
