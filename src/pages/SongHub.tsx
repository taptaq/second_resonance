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
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react";

export default function SongHub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Custom CSS for premium animations
  const customStyles = `
    @keyframes scan {
      0% { top: -100%; }
      100% { top: 200%; }
    }
    @keyframes neon-pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.4), 0 0 40px rgba(6, 182, 212, 0.2); }
      50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.7), 0 0 60px rgba(6, 182, 212, 0.4); }
    }
    .selection-scan::after {
      content: "";
      position: absolute;
      left: 0;
      width: 100%;
      height: 40px;
      background: linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.8), transparent);
      opacity: 0.5;
      animation: scan 3s linear infinite;
      pointer-events: none;
      z-index: 20;
    }
    .premium-card-shadow {
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.7);
    }
    .selected-glow {
      animation: neon-pulse 2s ease-in-out infinite;
    }
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .stagger-entry {
      animation: fade-in-up 0.6s ease-out forwards;
      opacity: 0;
    }
  `;

  const state = location.state as {
    nickname: string;
    artist: string;
    role: string;
    mbti: string;
    thought?: string;
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
  // 新增：编辑已有音频链接态
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [editLink, setEditLink] = useState("");
  const [isUpdatingLink, setIsUpdatingLink] = useState(false);

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
      alert("同步失败，请重试。");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false); // 恢复曲库网格展示
    }
  };

  const handleMatch = async () => {
    if (!selectedSong) return alert("请先选择一首曲目再继续！");
    setIsMatching(true);

    const generatedVibe = `MBTI: ${state.mbti}, Favorite Artist: ${state.artist}, Track: ${selectedSong.trackName}${state.thought ? `, 附加人类潜意识指导: ${state.thought}` : ""}`;

    try {
      // 1. 提前在极点注册分身参数（进入大厅时必须携带物理认证身份）
      const avRes = await fetch("http://localhost:3005/api/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.nickname,
          role: state.role,
          coreVibe: generatedVibe,
          mbti: state.mbti,
        }),
      }).then((r) => r.json());

      if (avRes.avatar?.id) setAvatarId(avRes.avatar.id);

      // Pass the fully formatted track identity string down as the live Engine logic parameter
      setSongVibe(`《${selectedSong.trackName}》- ${state.artist}`);

      // 2. 取代直接硬建房间：安全重定向至该单曲专属的星际匹配大厅 (Lobby)
      navigate(`/lobby/${selectedSong.trackId}`, {
        state: { ...state, selectedSong, avatarId: avRes.avatar?.id },
      });
    } catch (err) {
      console.error(err);
      alert("进入失败，请检查网络或后端状态。");
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
        alert("添加失败，请重试。");
      }
    } catch (err) {
      console.error(err);
      alert("添加过程遇到异常。");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingTrack) return;
    setIsUpdatingLink(true);
    try {
      const res = await fetch("http://localhost:3005/api/update-song-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: editingTrack.trackId,
          audioUrl: editLink.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        // 更新本地列表状态
        setSongs(
          songs.map((s) =>
            s.trackId === editingTrack.trackId
              ? { ...s, audioUrl: editLink.trim() }
              : s,
          ),
        );
        setIsEditModalOpen(false);
        setEditingTrack(null);
        setEditLink("");
      } else {
        alert("更新失败，请重试。");
      }
    } catch (err) {
      console.error(err);
      alert("更新过程由异常中断。");
    } finally {
      setIsUpdatingLink(false);
    }
  };

  const filteredSongs = songs.filter((song) =>
    song.trackName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#050505] p-8 flex flex-col font-sans relative">
      <style>{customStyles}</style>
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
                选择推演曲目{" "}
                <span className="text-cyan-500 font-mono">/[TRACKS]</span>
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
                    {isRefreshing ? "同步中..." : "全网同步曲目"}
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

        {/* ================= 版权与 VIP 风险警示 ================= */}
        <div className="mb-8 p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl flex items-start gap-4 animate-pulse-subtle shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <div className="w-10 h-10 rounded-lg bg-amber-900/40 flex items-center justify-center shrink-0 border border-amber-800/50">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1 text-sm text-amber-200/80 leading-relaxed py-1">
            部分{" "}
            <span className="text-amber-400 font-bold">VIP 或版权受限</span>{" "}
            歌曲在公共解析环境下仅能试听 30 秒。
            如果进入推演房间后音频意外中断，请返回此处点击歌曲卡片右上角的{" "}
            <span className="text-cyan-400 font-bold font-mono text-[11px] bg-cyan-950/30 px-1 border border-cyan-800/50 rounded">
              AUTO_LINK
            </span>{" "}
            按钮，手动注入该曲目的全长 MP3 直链。
          </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-10 custom-scrollbar overflow-hidden px-8 py-10 pb-20 shrink-0 opacity-10 blur-sm pointer-events-none transition-all duration-1000">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-10 custom-scrollbar overflow-y-auto px-8 py-10 pb-20 shrink-0">
            {filteredSongs.map((track, index) => {
              const isSelected = selectedSong?.trackId === track.trackId;
              return (
                <div
                  key={track.trackId}
                  onClick={() => setSelectedSong(track)}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`stagger-entry relative rounded-xl overflow-hidden cursor-pointer group transition-all duration-500 transform hover:-translate-y-3 ${
                    isSelected
                      ? "selected-glow ring-2 ring-cyan-500 bg-cyan-950/40 selection-scan z-20 scale-[1.05]"
                      : "premium-card-shadow border border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/80 hover:border-slate-600"
                  }`}
                >
                  <div className="overflow-hidden aspect-square relative">
                    {/* Desaturation to Vibrance Layer */}
                    <img
                      src={track.artworkUrl100.replace("100x100", "600x600")}
                      alt={track.trackName}
                      className={`w-full h-full object-cover transition-all duration-700 ease-out ${
                        isSelected
                          ? "scale-110 saturate-[1.6] contrast-[1.1]"
                          : "opacity-60 saturate-[0.15] contrast-[0.9] group-hover:opacity-100 group-hover:saturate-[1.1] group-hover:scale-110 group-hover:contrast-[1.05]"
                      }`}
                    />

                    {/* Interior Vignette for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover:opacity-40 transition-opacity"></div>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between pointer-events-none">
                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 backdrop-blur-md rounded border transition-all duration-300 pointer-events-auto ${
                        isSelected
                          ? "bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                          : "bg-black/40 border-slate-700/50 group-hover:border-slate-500 group-hover:bg-black/60"
                      }`}
                    >
                      <Headphones
                        className={`w-3 h-3 ${
                          isSelected
                            ? "text-cyan-400 animate-pulse"
                            : "text-slate-400 group-hover:text-cyan-400"
                        }`}
                      />
                      <span
                        className={`text-[9px] font-mono font-bold tracking-tighter ${
                          isSelected
                            ? "text-cyan-300"
                            : "text-slate-500 group-hover:text-slate-300"
                        }`}
                      >
                        房间数: {track.realNodes || 0}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTrack(track);
                        setEditLink(track.audioUrl || "");
                        setIsEditModalOpen(true);
                      }}
                      className={`cursor-pointer w-7 h-7 rounded flex items-center justify-center border transition-all duration-300 pointer-events-auto ${
                        track.audioUrl
                          ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-400"
                          : "bg-black/40 border-slate-700/50 text-slate-400 hover:border-cyan-500 hover:text-cyan-400 hover:bg-black/80"
                      }`}
                      title="校准/更新音频直链"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Play Indicator Overlay (on hover) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/50 flex items-center justify-center text-cyan-400 transform scale-75 group-hover:scale-100 transition-transform duration-500">
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-6 h-6 ml-1"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  <div
                    className={`p-4 relative z-10 transition-colors duration-300 ${
                      isSelected
                        ? "bg-cyan-950/20"
                        : "bg-slate-900/40 backdrop-blur-sm"
                    }`}
                  >
                    <p
                      className={`text-sm font-bold truncate tracking-tight transition-colors ${
                        isSelected
                          ? "text-cyan-300"
                          : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {track.trackName}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-1 font-mono uppercase tracking-[0.1em] opacity-70 group-hover:opacity-100 transition-opacity">
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
                  placeholder="以 http / https 开头的音频链接，暂不支持直接上传本地文件"
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

      {/* ================= 编辑音频链接模态框 ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-[0_0_60px_rgba(16,185,129,0.1)] p-8 relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

            <h3 className="text-xl font-bold font-mono text-emerald-400 mb-2 flex items-center gap-3">
              <LinkIcon className="w-6 h-6" />
              校准音频信道
            </h3>
            <p className="text-xs text-slate-500 font-mono mb-8 uppercase tracking-widest">
              Track_ID: {editingTrack?.trackId || "N/A"}
            </p>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-tighter">
                    音频直链地址 / AUDIO_SOURCE_URI
                  </label>
                  {editLink && (
                    <span className="text-[10px] text-emerald-500 font-mono bg-emerald-950/30 px-1 border border-emerald-900/50 rounded">
                      VALID_FORMAT
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder="请输入以 http / https 开头的有效音频直链..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-emerald-50 focus:outline-none focus:border-emerald-500 font-mono text-sm transition-all shadow-inner"
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                />
                <div className="mt-4 p-3 bg-amber-950/10 border border-amber-900/20 rounded-lg">
                  <p className="text-[10px] text-amber-500/80 leading-relaxed font-sans">
                    💡 小贴士：
                    <br />
                    如果该歌曲是 VIP，您可以去 B 站或第三方歌曲站找到该曲目的
                    MP3 直链并填入。
                    <br />
                    输入后，系统将在全局推演中强制优先使用您提供的地址，绕过官网
                    30s 限制。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-10">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTrack(null);
                  }}
                  className="flex-1 py-4 rounded-xl border border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all font-mono font-bold uppercase tracking-[0.2em] text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={!editLink.trim() || isUpdatingLink}
                  className="flex-[1.5] py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold tracking-[0.2em] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] font-mono uppercase text-xs cursor-pointer"
                >
                  {isUpdatingLink ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "重写信道 (OVERWRITE)"
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
