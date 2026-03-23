import { useState, useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAgentStore } from "../store/useAgentStore";
import { Loader2, UserCheck, ChevronLeft, Headphones } from "lucide-react";

export default function SongHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    nickname: string;
    artist: string;
    role: string;
    mbti: string;
  };

  const [songs, setSongs] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);

  const { setSongVibe, setAvatarId, setRoomId } = useAgentStore();

  useEffect(() => {
    if (!state?.artist) return;

    const fetchSongs = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        // ==== 网易云音乐原生直连 ====
        // 现在直接请求我们自己在 Node.js 写的代理接口，绝对不会被拦截，且极速返回！
        const res = await fetch(
          `http://localhost:3001/api/search?q=${encodeURIComponent(state.artist)}`,
          { signal: controller.signal },
        );
        clearTimeout(timeoutId);

        const data = await res.json();

        if (data.results && data.results.length > 0) {
          const enhancedSongs = data.results.map((song: any) => ({
            ...song,
            mockPlayers: Math.floor(Math.random() * 450) + 12,
          }));
          setSongs(enhancedSongs);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn(
          "iTunes API Connection Reset by Firewall. Using Simulation Fallback...",
          err,
        );
      }

      // === FALLBACK: 防火墙拦截时的“第二共振”原声虚拟曲库展示 ===
      const mockFallbackSongs = [
        {
          trackId: "m1",
          trackName: "霓虹深渊 (Neon Abyss)",
          artistName: state.artist,
          collectionName: state.artist + " - 赛博纪元 EP",
          artworkUrl100: "https://picsum.photos/seed/neo1/400/400",
          mockPlayers: 342,
        },
        {
          trackId: "m2",
          trackName: "绝对领域 (Absolute Field)",
          artistName: state.artist,
          collectionName: "星际跃迁",
          artworkUrl100: "https://picsum.photos/seed/neo2/400/400",
          mockPlayers: 156,
        },
        {
          trackId: "m3",
          trackName: "意识流上传 (Upload)",
          artistName: state.artist,
          collectionName: "数字废墟",
          artworkUrl100: "https://picsum.photos/seed/neo3/400/400",
          mockPlayers: 89,
        },
        {
          trackId: "m4",
          trackName: "量子泛音 (Quantum Gravity)",
          artistName: state.artist,
          collectionName: "未知频段",
          artworkUrl100: "https://picsum.photos/seed/neo4/400/400",
          mockPlayers: 412,
        },
        {
          trackId: "m5",
          trackName: "末日回响 (Echoes)",
          artistName: state.artist,
          collectionName: "废土行者",
          artworkUrl100: "https://picsum.photos/seed/neo5/400/400",
          mockPlayers: 27,
        },
        {
          trackId: "m6",
          trackName: "第二共振 (Second Resonance)",
          artistName: state.artist,
          collectionName: "系统元音",
          artworkUrl100: "https://picsum.photos/seed/neo6/400/400",
          mockPlayers: 999,
        },
      ];
      setSongs(mockFallbackSongs);
      setIsLoading(false);
    };

    fetchSongs();
  }, [state?.artist]);

  // If no state exists (user refreshed the page directly), banish back to index.
  if (!state) return <Navigate to="/" />;

  const handleMatch = async () => {
    if (!selectedSong) return alert("必须选中您的同频共振曲目后方可发车！");
    setIsMatching(true);

    const generatedVibe = `MBTI: ${state.mbti}, Favorite Artist: ${state.artist}, Track: ${selectedSong.trackName}`;

    try {
      const avRes = await fetch("http://localhost:3001/api/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.nickname,
          role: state.role,
          coreVibe: generatedVibe,
        }),
      }).then((r) => r.json());

      if (avRes.avatar?.id) setAvatarId(avRes.avatar.id);

      const matchRes = await fetch("http://localhost:3001/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarId: avRes.avatar?.id,
          songId: selectedSong.trackId.toString(),
        }),
      }).then((r) => r.json());

      if (matchRes.room?.id) setRoomId(matchRes.room.id);

      // Pass the fully formatted track identity string down as the live Engine logic parameter
      setSongVibe(`《${selectedSong.trackName}》- ${state.artist}`);

      // Successfully matched -> Secure gateway into Dashboard!
      navigate(`/room/${matchRes.room?.id}`);
    } catch (err) {
      console.error(err);
      alert("连接匹配集群失败，尝试运行 npm run dev启动后端服务。");
      setIsMatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-8 flex flex-col font-sans relative">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="w-12 h-12 rounded-full border border-slate-700 bg-slate-900/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-500 hover:bg-slate-800 transition-colors shadow-lg"
            >
              <ChevronLeft className="w-6 h-6 -ml-1" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-widest text-slate-200 uppercase">
                选曲星港{" "}
                <span className="text-cyan-500 font-mono">
                  /[{state.artist}]
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-mono text-slate-500 uppercase">
                <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">
                  代号: {state.nickname}
                </span>
                <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-cyan-500 font-bold border-cyan-900/50 hover:bg-cyan-950/30 transition-colors">
                  职能: {state.role}
                </span>
                <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">
                  MBTI: {state.mbti}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleMatch}
            disabled={isMatching || !selectedSong}
            className="px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 text-black font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] disabled:shadow-none min-w-[300px]"
          >
            {isMatching ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UserCheck className="w-6 h-6" />
            )}
            <span>
              {selectedSong
                ? `锁定星际航标《${selectedSong.trackName}》跃迁`
                : "请等待并锁定一首共频曲目..."}
            </span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-cyan-500 h-96 border border-slate-800/50 rounded-2xl bg-slate-900/10 shadow-inner">
            <Loader2 className="w-16 h-16 animate-spin" />
            <span className="font-mono text-base tracking-widest uppercase">
              / 正在骇入核心流媒体协议搜寻数据碎片 /
            </span>
          </div>
        ) : songs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 font-mono text-base gap-4 border border-slate-800/50 rounded-2xl bg-slate-900/10">
            <span className="text-rose-500/50 text-6xl">∅</span>
            该检索词没有找到匹配的曲库碎片，请返回上一级换个确切的检索词。
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 custom-scrollbar overflow-y-auto pb-12 shrink-0">
            {songs.map((track) => {
              const isSelected = selectedSong?.trackId === track.trackId;
              return (
                <div
                  key={track.trackId}
                  onClick={() => setSelectedSong(track)}
                  className={`relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 transform hover:-translate-y-2 ${isSelected ? "shadow-[0_0_30px_rgba(6,182,212,0.6)] ring-4 ring-cyan-500 bg-cyan-900/20" : "shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-slate-800 bg-slate-900"}`}
                >
                  <div className="overflow-hidden aspect-square border-b border-slate-800">
                    <img
                      src={track.artworkUrl100.replace("100x100", "600x600")}
                      alt={track.trackName}
                      className={`w-full h-full object-cover transition-all duration-700 ${isSelected ? "scale-110 saturate-150" : "opacity-80 group-hover:opacity-100 group-hover:scale-110 saturate-50"}`}
                    />
                  </div>

                  {isSelected && (
                    <div className="absolute top-0 left-0 w-full h-full border-2 border-cyan-400 opacity-50 pointer-events-none rounded-xl"></div>
                  )}

                  <div className="absolute top-3 right-3 shadow-lg z-10 hidden group-hover:block">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-slate-600 flex items-center justify-center text-white hover:text-cyan-400 hover:scale-110 transition-transform">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 ml-1"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="absolute top-3 left-3">
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1.5 bg-black/80 backdrop-blur rounded border ${isSelected ? "border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" : "border-slate-700/50"}`}
                    >
                      <Headphones
                        className={`w-3 h-3 ${isSelected ? "text-cyan-400 animate-pulse" : "text-emerald-400"}`}
                      />
                      <span
                        className={`text-[10px] font-mono font-bold ${isSelected ? "text-cyan-400" : "text-emerald-400"}`}
                      >
                        已集结 {track.mockPlayers} 节点
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-4 ${isSelected ? "bg-gradient-to-t from-cyan-950/80 to-transparent" : ""}`}
                  >
                    <p
                      className={`text-base font-bold truncate tracking-wide ${isSelected ? "text-cyan-300" : "text-slate-200"}`}
                    >
                      {track.trackName}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-1.5 font-mono uppercase tracking-wider">
                      {track.collectionName || track.artistName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
