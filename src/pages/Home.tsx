import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, Fingerprint, Map } from "lucide-react";
import { useAgentStore } from "../store/useAgentStore";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [artist, setArtist] = useState("");
  const [role, setRole] = useState("导演");
  const [mbti, setMbti] = useState("INTJ");
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
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
        const res = await fetch(`http://localhost:3005/api/avatars/check?name=${encodeURIComponent(nickname)}`);
        const data = await res.json();
        if (data.found) {
           setNameMessage("✅ 检测到已注册的代号记忆，已自动重载专属职能与 MBTI。");
           if (data.role) setRole(data.role);
           if (data.mbti) setMbti(data.mbti);
           if (data.artist) setArtist(data.artist);
        } else {
           setNameMessage("🌟 全新探测到的精神维度标志，参数将保留默认。");
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

  const handleNext = () => {
    if (isSubmitDisabled)
      return alert("请先输入你的特派分身代号以及要追随的主推灵感歌手名称！");
    // Save avatar parameters and proceed to the Song Hub Route smoothly
    navigate("/select-song", { state: { nickname, artist, role, mbti } });
  };

  const getRoleRecommendation = (mbtiStr: string) => {
    if (["ENTJ", "ESTJ", "ENFJ", "INTJ"].includes(mbtiStr))
      return { role: "导演", desc: "天生的统帅结构，擅长把控作品全局基调" };
    if (["INTP", "INFP", "INFJ", "ENTP"].includes(mbtiStr))
      return { role: "编剧", desc: "极高的脑洞与同理共振，适合执笔剧情编排" };
    if (["ISFP", "ISTP", "ENFP", "ESTP"].includes(mbtiStr))
      return {
        role: "视觉",
        desc: "对画面与色彩极其敏感，适合构建视觉意象",
      };
    if (["ISTJ", "ISFJ", "ESFJ", "ESFP"].includes(mbtiStr))
      return {
        role: "音频",
        desc: "严谨且注重感官律动细节，适合编织听觉频谱",
      };
    return { role: "导演", desc: "全能型稳定人格，适配多维核心" };
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-cyan-900/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.1)] p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

        <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-6">
          <Terminal className="w-8 h-8 text-cyan-500 animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-slate-200">
              <span className="text-cyan-500">第二共振</span> A2A 枢纽
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              SecondMe Auth Pending... Entering Guest Initialization
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2">
              / Agent 分身代号
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例如: 赛博流浪汉"
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {nameMessage && (
              <p className={`text-[10px] font-mono mt-2 flex items-center gap-1 ${nameMessage.includes("✅") ? "text-emerald-400" : "text-cyan-600"}`}>
                {isCheckingName ? <span className="animate-pulse">连线检索中...</span> : nameMessage}
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
              placeholder="你想匹配哪位歌手的同好？(例如: 孙燕姿)"
              className={`w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-cyan-600 mb-2 flex justify-between">
              <span>/ 先天 MBTI 性格矩阵</span>
              <span className="text-slate-600 flex items-center gap-1">
                <Fingerprint className="w-3 h-3" /> 预留 SecondMe 记忆接口
              </span>
            </label>
            <select
              value={mbti}
              onChange={(e) => {
                setMbti(e.target.value);
              }}
              disabled={isFormDisabled}
              className={`w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500 transition-colors appearance-none ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
              <span>/ 专属职能序列</span>
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

          <button
            onClick={handleNext}
            disabled={isSubmitDisabled}
            className={`w-full mt-4 py-4 rounded-lg border border-indigo-500/50 text-indigo-400 font-bold tracking-widest uppercase transition-all flex justify-center items-center gap-3 relative overflow-hidden group ${isSubmitDisabled ? 'bg-indigo-900/10 opacity-50 cursor-not-allowed' : 'bg-indigo-900/30 hover:bg-indigo-800/40'}`}
          >
            <Map className="w-5 h-5 group-hover:animate-bounce" />
            <span className="font-mono text-sm">携源参数跃迁至选曲星港</span>
          </button>
        </div>
      </div>
    </div>
  );
}
