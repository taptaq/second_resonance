import { ArrowRight, Sparkles, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        {/* Animated grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-4xl px-6 text-center">
        {/* <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-xs font-mono backdrop-blur-md">
          <Sparkles className="w-3 h-3" />
          <span>PROJECT: SECOND RESONANCE v1.0.0</span>
        </div> */}

        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-900 drop-shadow-[0_0_40px_rgba(6,182,212,0.3)] tracking-tighter mb-4">
          第二共振
        </h1>

        <p className="text-base md:text-lg text-slate-400 font-light tracking-wider mb-12 max-w-2xl leading-relaxed">
          这是一个专为音乐爱好者打造的
          <strong className="text-cyan-400 font-normal">
            多阵营同人演绎与共创空间
          </strong>
          。<br className="hidden md:block" />
          基于四种不同的创作职能，你将被赋予专属的 MBTI 人格代理。
          <br className="hidden md:block" />
          在这里，你可以与其他粉丝组队，将同一首歌曲的不同听觉感受，
          <br className="hidden md:block" />
          碰撞并演化为一场拥有
          <strong className="text-cyan-400 font-normal">
            独家画面、故事线与氛围的同人视觉实验
          </strong>
          。
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <button
            onClick={() => navigate("/hub")}
            className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-lg font-mono text-sm uppercase tracking-[0.2em] transition-all cursor-pointer"
          >
            {/* Button Border / Glow */}
            <div className="absolute inset-0 border border-cyan-500/50 rounded-lg group-hover:border-cyan-400 transition-colors"></div>
            <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors blur-md"></div>

            {/* Button Content */}
            <div className="relative flex items-center gap-3 text-cyan-100 font-bold group-hover:text-white transition-colors">
              <Terminal className="w-4 h-4" />
              <span>接入SecondMe</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
            </div>
          </button>
        </div>

        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 text-center opacity-60">
          {[
            { tag: "01", title: "DIRECTOR", desc: "宏观剧情掌控" },
            { tag: "02", title: "WRITER", desc: "角色设定推演" },
            { tag: "03", title: "VISUALIZER", desc: "视觉分镜采样" },
            { tag: "04", title: "AUDIO", desc: "氛围频段调制" },
          ].map((stat) => (
            <div
              key={stat.tag}
              className="flex flex-col items-center space-y-2"
            >
              <div className="text-[10px] font-mono text-cyan-500 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-900/50">
                {stat.tag}
              </div>
              <div className="text-sm font-bold text-slate-300 tracking-wider">
                {stat.title}
              </div>
              <div className="text-xs text-slate-500">{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
