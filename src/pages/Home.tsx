import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Fingerprint, Map, Loader2, Sparkles } from "lucide-react";
import { useAgentStore } from "../store/useAgentStore";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [artist, setArtist] = useState("");
  const [role, setRole] = useState("导演");
  const [mbti, setMbti] = useState("INTJ");
  const [thought, setThought] = useState("");
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [isJumping, setIsJumping] = useState(false);
  const navigate = useNavigate();
  const { secondMeUser } = useAgentStore();

  useEffect(() => {
    if (!nickname.trim()) {
      setNameMessage("");
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingName(true);
      try {
        const res = await fetch(
          `http://localhost:3005/api/avatars/check?name=${encodeURIComponent(nickname)}`,
        );
        const data = await res.json();
        if (data.found) {
          setNameMessage("✅ 检测到已注册的昵称，已自动载入角色与 MBTI。");
          if (data.role) setRole(data.role);
          if (data.mbti) setMbti(data.mbti);
          if (data.artist) setArtist(data.artist);
        } else {
          setNameMessage("🌟 欢迎新成员，请输入你的信息。");
        }
      } catch (e) {
        setNameMessage("");
      } finally {
        setIsCheckingName(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [nickname]);

  useEffect(() => {
    if (secondMeUser) {
      if (secondMeUser.nickname) setNickname(secondMeUser.nickname);
      if (secondMeUser.traits_mbti) setMbti(secondMeUser.traits_mbti);
    }
  }, [secondMeUser]);

  const isFormDisabled = isCheckingName || !nickname.trim();
  const isSubmitDisabled = isFormDisabled || !artist.trim();

  const handleNext = async () => {
    if (isSubmitDisabled) return alert("请先输入你的昵称及喜欢的歌手名称！");

    setIsJumping(true);

    // 模拟系统“位面跃迁”准备时间，增加科技仪式感
    await new Promise((r) => setTimeout(r, 1500));

    navigate("/select-song", {
      state: { nickname, artist, role, mbti, thought },
    });
  };

  const getRoleRecommendation = (mbtiStr: string) => {
    if (["ENTJ", "ESTJ", "ENFJ", "INTJ"].includes(mbtiStr))
      return { role: "导演", desc: "统筹全局，负责作品的方向把控" };
    if (["INTP", "INFP", "INFJ", "ENTP"].includes(mbtiStr))
      return { role: "编剧", desc: "想象力丰富，负责剧情的编排与文字" };
    if (["ISFP", "ISTP", "ENFP", "ESTP"].includes(mbtiStr))
      return {
        role: "视觉",
        desc: "对美感敏锐，负责构建视觉画面与意象",
      };
    if (["ISTJ", "ISFJ", "ESFJ", "ESFP"].includes(mbtiStr))
      return {
        role: "音频",
        desc: "注重感官律动，负责编织音乐与听觉细节",
      };
    return { role: "导演", desc: "全能型角色，适配多种创作场景" };
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-cyan-900/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.1)] p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

        <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-6">
          <Terminal className="w-8 h-8 text-cyan-500 animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-slate-200">
              <span className="text-cyan-500">第二共振</span> · A2A入场设置
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Welcome to Second Resonance. Initialize your role.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2">
              / Agent 分身代号
            </label>
            <div className="relative">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例如: 赛博流浪汉"
                className={`w-full bg-slate-900 border ${isCheckingName ? "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-slate-700"} text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all`}
              />
              {isCheckingName && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                </div>
              )}
            </div>
            {nameMessage && (
              <p
                className={`text-[10px] font-mono mt-2 flex items-center gap-1 ${nameMessage.includes("✅") ? "text-emerald-400" : "text-cyan-600"}`}
              >
                {isCheckingName ? (
                  <span className="animate-pulse">连线检索中...</span>
                ) : (
                  nameMessage
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2">
              / 主推灵感歌手
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isFormDisabled) handleNext();
              }}
              disabled={isFormDisabled}
              placeholder="你想匹配哪位歌手的同好？（例如: 薛之谦）"
              className={`w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2 flex justify-between">
              <span>/ 先天 MBTI 性格矩阵</span>
            </label>
            <select
              value={mbti}
              onChange={(e) => {
                setMbti(e.target.value);
              }}
              disabled={isFormDisabled}
              className={`w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors appearance-none ${isFormDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <optgroup label="分析家">
                <option value="INTJ">INTJ (建筑师)</option>
                <option value="INTP">INTP (逻辑学家)</option>
                <option value="ENTJ">ENTJ (指挥官)</option>
                <option value="ENTP">ENTP (辩论家)</option>
              </optgroup>
              <optgroup label="外交家">
                <option value="INFJ">INFJ (提倡者)</option>
                <option value="INFP">INFP (调停者)</option>
                <option value="ENFJ">ENFJ (主人公)</option>
                <option value="ENFP">ENFP (竞选者)</option>
              </optgroup>
              <optgroup label="守护者">
                <option value="ISTJ">ISTJ (物流师)</option>
                <option value="ISFJ">ISFJ (守卫者)</option>
                <option value="ESTJ">ESTJ (总经理)</option>
                <option value="ESFJ">ESFJ (执政官)</option>
              </optgroup>
              <optgroup label="探险家">
                <option value="ISTP">ISTP (鉴赏家)</option>
                <option value="ISFP">ISFP (探险家)</option>
                <option value="ESTP">ESTP (企业家)</option>
                <option value="ESFP">ESFP (表演者)</option>
              </optgroup>
            </select>
            <p className="text-[10px] text-slate-400 font-mono italic leading-relaxed flex items-start gap-1">
              <span className="text-cyan-500 font-bold">*</span>{" "}
              {getRoleRecommendation(mbti).desc}。
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2 flex items-center justify-between">
              <span>/ 偏好职能序列</span>
              <span className="px-2 py-0.5 bg-cyan-900/30 text-cyan-400 rounded text-[10px] border border-cyan-800/50">
                系统基于 {mbti} 的核心职能推荐:{" "}
                {getRoleRecommendation(mbti).role}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              {[
                { id: "导演", label: "导演" },
                { id: "编剧", label: "编剧" },
                { id: "视觉", label: "视觉" },
                { id: "音频", label: "音频" },
              ].map((r) => (
                <button
                  key={r.id}
                  disabled={isFormDisabled}
                  onClick={() => setRole(r.id)}
                  className={`py-3 rounded-lg border font-mono text-xs transition-all relative ${role === r.id ? "bg-cyan-900/40 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500"} ${getRoleRecommendation(mbti).role === r.id ? "ring-1 ring-cyan-500/50 ring-offset-1 ring-offset-[#0a0a0a]" : ""} ${isFormDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {getRoleRecommendation(mbti).role === r.id && (
                    <div className="absolute top-[2px] right-2 text-[8px] text-cyan-500 animate-pulse">
                      推荐选择
                    </div>
                  )}
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 font-mono italic leading-relaxed flex items-start gap-1 mt-1">
              <span className="text-cyan-700 font-bold">*</span>{" "}
              预检提示：仅作初始偏好。正式组局时允许跳车跨越流派。
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2">
              / 个人共创思路预载 (选填)
            </label>
            <textarea
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              disabled={isFormDisabled}
              placeholder="如果您对后续推演有特定偏好（例如：希望加入赛博朋克元素、希望结局是悲剧），请在此输入..."
              className={`w-full h-24 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors resize-none font-mono text-sm custom-scrollbar ${isFormDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </div>

          <button
            onClick={handleNext}
            disabled={isSubmitDisabled}
            className={`w-full mt-4 py-4 rounded-lg border border-indigo-500/50 text-indigo-400 font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-3 relative overflow-hidden group ${isSubmitDisabled ? "bg-indigo-900/10 opacity-50 cursor-not-allowed" : "bg-indigo-900/30 hover:bg-indigo-800/40"}`}
          >
            <Map className="w-5 h-5 group-hover:animate-bounce" />
            <span className="font-mono text-sm">携源参数跃迁至选曲星港</span>
          </button>
        </div>
      </div>

      {/* ================= 跃迁加载遮罩 ================= */}
      {isJumping && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-24 h-24 border-2 border-cyan-500/20 rounded-full animate-ping absolute -inset-0"></div>
            <div className="w-24 h-24 border-t-2 border-cyan-500 rounded-full animate-spin"></div>
            <Sparkles className="w-8 h-8 text-cyan-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="mt-12 flex flex-col items-center gap-3">
            <h2 className="text-xl font-bold font-mono text-cyan-400 tracking-[0.5em] animate-pulse uppercase">
              正在初始化共振位面
            </h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Syncing Parameters / Portal Opening...
            </p>
          </div>
          <div className="absolute bottom-12 left-0 w-full flex justify-center px-12">
            <div className="w-full max-w-xs h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent w-full animate-[shimmer_1.5s_infinite]"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
