import { useState, useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAgentStore } from "../store/useAgentStore";
import {
  Loader2,
  UserCheck,
  ChevronLeft,
  Headphones,
  RefreshCw,
  Search,
  Plus,
} from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // 新增：手动注入控制台态
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [customForm, setCustomForm] = useState({
    trackName: "",
    collectionName: "",
    artworkUrl100: "",
    audioUrl: "",
  });

  const { setSongVibe, setAvatarId, setRoomId } = useAgentStore();

  useEffect(() => {
    if (!state?.artist) return;

    const controller = new AbortController();

    const fetchSongs = async () => {
      setIsLoading(true); // 确保每次挂载都必定激活科幻骨架屏
      try {
        // 允许等待后端慢慢把几十张专辑安全抓取完，前端超时设为 45 秒
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        // ==== 网易云音乐原生直连 ====
        // 使用 Promise.all 强制要求至少渲染 1.5秒的科幻骨架屏，防止 Xata 50ms命中缓存导致动画闪烁跳过
        const [res] = await Promise.all([
          fetch(
            `http://localhost:3005/api/search?q=${encodeURIComponent(state.artist)}`,
            { signal: controller.signal },
          ),
          new Promise((r) => setTimeout(r, 1500)),
        ]);
        clearTimeout(timeoutId);

        const data = await res.json();

        if (data.error) {
          console.error("Backend Error:", data.error, data.details);
        }

        if (data.results && data.results.length > 0) {
          setSongs(data.results);
        } else {
          setSongs([]); // 没搜到任何数据
        }
        setIsLoading(false); // 安全抵达终点，卸载装甲
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log(
            "Fetch aborted by React Strict Mode. Bypassing state mutation.",
          );
          return; // 【核心修复】：拦截 React 18 严格模式下的二次渲染打断事件，绝不修改当前正在被第二次请求征用的 isLoading 状态！
        }
        console.warn("API Connection Error...", err);
        setSongs([]);
        setIsLoading(false);
      }
    };

    fetchSongs();

    return () => {
      controller.abort();
    };
  }, [state?.artist]);

  // If no state exists (user refreshed the page directly), banish back to index.
  if (!state) return <Navigate to="/" />;

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    setIsLoading(true); // 切换为全局骨架屏 Loading
    try {
      const res = await fetch(
        `http://localhost:3005/api/search?q=${encodeURIComponent(state.artist)}&forceRefresh=true`,
      );
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        setSongs(data.results);
      }
    } catch (err) {
      console.error(err);
      alert("最新协议同步失败，网关未响应。");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false); // 恢复曲库网格展示
    }
  };

  const handleMatch = async () => {
    if (!selectedSong) return alert("必须选中您的同频共振曲目后方可发车！");
    setIsMatching(true);

    const generatedVibe = `MBTI: ${state.mbti}, Favorite Artist: ${state.artist}, Track: ${selectedSong.trackName}`;

    try {
      const avRes = await fetch("http://localhost:3005/api/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.nickname,
          role: state.role,
          coreVibe: generatedVibe,
        }),
      }).then((r) => r.json());

      if (avRes.avatar?.id) setAvatarId(avRes.avatar.id);

      const matchRes = await fetch("http://localhost:3005/api/match", {
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

  const handleUploadSubmit = async () => {
    if (!customForm.trackName.trim()) return;
    setIsUploading(true);
    try {
      const res = await fetch("http://localhost:3005/api/custom-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: state.artist, // 让服务器知道我们要绑定给哪个大厅歌手
          artistName: state.artist,
          trackName: customForm.trackName.trim(),
          collectionName: customForm.collectionName.trim(),
          artworkUrl100: customForm.artworkUrl100.trim(),
          audioUrl: customForm.audioUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.results && data.results[0]) {
        // 直接把新建的数据强行挂载到本地列表的最前排！
        setSongs([{ ...data.results[0], realNodes: 0 }, ...songs]);
        setIsUploadModalOpen(false);
        setCustomForm({
          trackName: "",
          collectionName: "",
          artworkUrl100: "",
          audioUrl: "",
        });
      } else {
        alert("碎片注入失败，请检查机房网关。");
      }
    } catch (err) {
      console.error(err);
      alert("碎片注入遭遇异常断连。");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredSongs = songs.filter((song) =>
    song.trackName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
                  职能:{" "}
                  {state.role === "DIRECTOR"
                    ? "导演"
                    : state.role === "WRITER"
                      ? "编剧"
                      : state.role === "VISUALIZER"
                        ? "视觉"
                        : state.role === "AUDIO"
                          ? "音频"
                          : state.role}
                </span>
                <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">
                  MBTI: {state.mbti}
                </span>

                <button
                  onClick={handleForceRefresh}
                  disabled={isRefreshing || isLoading}
                  className="px-4 py-1.5 ml-4 flex items-center gap-2 bg-cyan-950/30 rounded border border-cyan-800/50 hover:bg-cyan-900/40 hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-cyan-500 text-xs font-bold tracking-wider uppercase group relative overflow-hidden cursor-pointer"
                  title="强制绕过本地数据库缓存，拉取网易云官网最新数据并合并至数据库"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span className="relative z-10">
                    {isRefreshing ? "协议同步中..." : "全网强制同步"}
                  </span>
                  {!isRefreshing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleMatch}
            disabled={isMatching || !selectedSong}
            className="cursor-pointer px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 text-black font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] disabled:shadow-none min-w-[300px]"
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

        {/* ================= 曲库核心工具栏 ================= */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <h2 className="text-slate-400 font-mono text-sm tracking-widest uppercase">
              / 本地投影缓存库{" "}
              <span className="text-slate-600 ml-1">
                ({songs.length} 个记忆碎片)
              </span>
            </h2>
          </div>

          <div className="flex items-center justify-end">
            <div className="flex items-center bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 w-80 lg:w-96 focus-within:border-cyan-500 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all group backdrop-blur">
              <Search className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 mr-3 transition-colors shrink-0" />
              <input
                type="text"
                placeholder="检索记忆碎片指纹 (输入歌曲名称)..."
                className="bg-transparent border-none outline-none text-cyan-50 text-sm w-full font-mono placeholder:text-slate-600 focus:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="cursor-pointer w-12 h-12 rounded-xl border border-dashed border-cyan-800 bg-cyan-950/20 flex items-center justify-center text-cyan-500 hover:text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all ml-3 shrink-0"
              title="手动注入未发售单曲/未收录碎片"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="relative flex-1 min-h-[500px]">
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
              <div className="relative flex flex-col items-center justify-center scale-125 mb-10">
                <Loader2 className="w-16 h-16 text-cyan-500 animate-spin absolute" />
                <div className="w-24 h-24 border-4 border-cyan-500/20 rounded-full animate-ping absolute"></div>
                <div className="w-32 h-32 border border-cyan-500/10 rounded-full animate-pulse absolute"></div>
              </div>
              <span className="text-lg font-mono text-cyan-400 font-bold tracking-[0.4em] drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] mt-12 animate-pulse">
                正在同步本源曲库
              </span>
              <span className="text-xs font-mono text-cyan-600/60 tracking-widest mt-3 uppercase">
                正在建立云端核心数据连接
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 custom-scrollbar overflow-hidden pb-12 shrink-0 opacity-10 blur-sm pointer-events-none transition-all duration-1000">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="relative rounded-xl overflow-hidden border border-slate-800/50 bg-slate-900/40"
                >
                  <div className="aspect-square w-full h-full bg-gradient-to-br from-slate-800/30 to-slate-800/10"></div>
                  <div className="p-4 border-t border-slate-800/30">
                    <div className="h-4 bg-slate-700/50 rounded-md w-3/4 mb-2.5"></div>
                    <div className="h-3 bg-slate-700/30 rounded-md w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 font-mono text-base gap-4 border border-slate-800/50 rounded-2xl bg-slate-900/10 p-8 text-center">
            <span className="text-rose-500/50 text-6xl">∅</span>
            {songs.length === 0
              ? "该歌手的星轨信号极度微弱（或遭受到跨境 GFW 风暴影响导致连接超时断开）。\n请尝试点击上方的 [SYNC LATEST] 强行穿透抓取，或返回大厅换个歌手。"
              : `在本地的 ${songs.length} 首缓存数据中，未能根据指纹 "${searchTerm}" 找到匹配项。`}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 custom-scrollbar overflow-y-auto pb-12 shrink-0">
            {filteredSongs.map((track) => {
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
                      className={`flex items-center gap-1.5 px-2 py-1.5 bg-black/80 backdrop-blur rounded border transition-colors ${isSelected ? "border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" : track.realNodes > 0 ? "border-emerald-700/50" : "border-slate-800/50"}`}
                    >
                      <Headphones
                        className={`w-3 h-3 ${isSelected ? "text-cyan-400 animate-pulse" : track.realNodes > 0 ? "text-emerald-400" : "text-slate-600"}`}
                      />
                      <span
                        className={`text-[10px] font-mono font-bold tracking-wider ${isSelected ? "text-cyan-400" : track.realNodes > 0 ? "text-emerald-400" : "text-slate-500"}`}
                      >
                        已集结 {track.realNodes || 0} 节点
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

      {/* ================= 手动注入模态框 ================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            <h3 className="text-xl font-bold font-mono text-cyan-400 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              注入未知记忆碎片
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  歌曲名称 / TRACK_NAME (必填)
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="例如: 某首未发行的无损 Demo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-cyan-50 focus:outline-none focus:border-cyan-500 font-mono text-sm transition-colors"
                  value={customForm.trackName}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, trackName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  所属专辑或现场名称 (选填)
                </label>
                <input
                  type="text"
                  placeholder="例如: Live 某某音乐节现场版"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-cyan-50 focus:outline-none focus:border-cyan-500 font-mono text-sm transition-colors"
                  value={customForm.collectionName}
                  onChange={(e) =>
                    setCustomForm({
                      ...customForm,
                      collectionName: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  歌曲封面图直链网络地址 (选填)
                </label>
                <input
                  type="text"
                  placeholder="以 http 开头的图片链接，留空则自动生成占位图"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-cyan-50 focus:outline-none focus:border-cyan-500 font-mono text-sm transition-colors"
                  value={customForm.artworkUrl100}
                  onChange={(e) =>
                    setCustomForm({
                      ...customForm,
                      artworkUrl100: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  可播放的 MP3/音频直链网络地址 (强烈建议填)
                </label>
                <input
                  type="text"
                  placeholder="以 http 开头的音频链接，暂不支持直接上传本地文件"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-cyan-50 focus:outline-none focus:border-cyan-500 font-mono text-sm transition-colors"
                  value={customForm.audioUrl}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, audioUrl: e.target.value })
                  }
                />
                <p className="text-[10px] text-slate-500 mt-1 leading-snug tracking-wider">
                  ⚠️
                  注：由于云端带宽与版权合规限制，暂不开放直接拖拽上传本地音频文件。
                  <br />
                  如果只有本地 MP3，建议先传到第三方网盘获取媒体直链后再填入。
                </p>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="flex-1 py-3.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors font-mono font-bold uppercase tracking-widest text-sm cursor-pointer"
                >
                  放弃终端
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={!customForm.trackName.trim() || isUploading}
                  className="flex-1 py-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.8)] font-mono uppercase text-sm cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "硬核注入 (INJECT)"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
