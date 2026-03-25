import {
  Sparkles,
  Clapperboard,
  Terminal,
  Send,
  AlertOctagon,
  Loader2,
} from "lucide-react";
import { useState, KeyboardEvent, useEffect, useMemo } from "react";
import { useAgentStore } from "../store/useAgentStore";
import { runAgentTurn, analyzePacingDirective } from "../lib/agentOrchestrator";

export default function Console({ onOpenModal }: { onOpenModal: () => void }) {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const {
    humanOverride,
    addMessage,
    isGenerating,
    messages,
    songVibe,
    roomInfo,
    avatarId,
    playState,
    setPlayState,
    roomId,
  } = useAgentStore();

  const isFull = roomInfo?.members?.length >= 4;
  const myMember = useMemo(
    () => roomInfo?.members?.find((m: any) => m.avatar?.id === avatarId),
    [roomInfo?.members, avatarId],
  );
  const isMyRoleDirector =
    myMember?.avatar?.role === "DIRECTOR" || myMember?.avatar?.role === "导演";
  const isSpectator = !!roomInfo?.members && !myMember;

  // Phase 2: A2A Autonomous Orchestration Loop (Triggered ONLY when playState is PLAYING)
  useEffect(() => {
    if (
      !isFull ||
      isSpectator ||
      isGenerating ||
      !songVibe ||
      playState !== "PLAYING"
    )
      return;

    const autoLoopPhase = setTimeout(() => {
      runAgentTurn(songVibe);
    }, 4000); // 4-second breather between massive LLM output dumps

    return () => clearTimeout(autoLoopPhase);
  }, [isFull, isSpectator, isGenerating, songVibe, messages.length, playState]);

  // Phase 3: Auto-Pilot Checkout Tracker - Initialization
  useEffect(() => {
    if (playState === "CHECKPOINT") {
      setCountdown(30);
    }
  }, [playState]);

  // Phase 3: Auto-Pilot Checkout Tracker - Timer Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (playState === "CHECKPOINT") {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Simulate the user's personality to auto-approve
            const mbti = myMember?.avatar?.mbti || "INTJ";
            const role = myMember?.avatar?.role || "无名指挥官";
            humanOverride(
              `[活体检测超时] 托管进程介入：基于该节点宿主（${role} / ${mbti}）的决策性格模型推演，当前链路收敛方向未触发偏离阈值，已执行自动放行授权。`,
            );
            setPlayState("PLAYING");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [playState, humanOverride, setPlayState, myMember?.avatar?.id]);

  const handleSend = () => {
    if (!inputText.trim() || isGenerating || !isFull) return;

    // Inject human override into the context window securely
    humanOverride(inputText);
    setInputText("");
    runAgentTurn(songVibe);
  };

  const handleInitialStart = () => {
    if (isGenerating || !songVibe || !isFull) return;
    setPlayState("PLAYING");
    runAgentTurn(songVibe);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-80 border-t border-cyan-900/40 bg-black/80 backdrop-blur-xl absolute bottom-0 left-72 right-0 z-30 flex flex-col">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col relative pb-32">
        {messages.length === 0 ? (
          isMyRoleDirector ? (
            <div className="flex flex-col flex-1 h-full pt-2">
              <div className="flex gap-4 items-center mb-3">
                <Terminal className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-mono text-rose-500 font-bold uppercase tracking-widest">
                  阶段 1：权限已移交导演
                </span>
                <span className="text-xs font-mono text-slate-500">
                  请您下达最初的全景剧情基调...
                </span>
                <button
                  disabled={isAnalyzing}
                  onClick={async () => {
                    setIsAnalyzing(true);
                    const directive = await analyzePacingDirective(
                      songVibe,
                      avatarId || "",
                    );
                    setInputText(directive);
                    setIsAnalyzing(false);
                  }}
                  className={`ml-auto flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-all ${
                    isAnalyzing
                      ? "bg-cyan-900/20 border border-cyan-800/30 text-cyan-700 font-mono"
                      : "text-cyan-400 border border-cyan-800/50 bg-cyan-950/30 hover:bg-cyan-900/50"
                  }`}
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {isAnalyzing
                    ? "正在解析人格与波段..."
                    : "AI 一键生成导演开场白"}
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={!isFull || isAnalyzing}
                placeholder={
                  isAnalyzing
                    ? "AI 正在以您的导演身份深度分析曲目调性，请稍候..."
                    : !isFull
                      ? "系统强制安全锁：队伍未满编，主板输入端口已物理切断。"
                      : "作为大导演，请在此输入全局的产物基调与方向要求..."
                }
                className="flex-1 bg-slate-900/50 border border-rose-900/30 rounded p-4 text-slate-200 resize-none font-mono text-sm focus:outline-none focus:border-rose-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                disabled={!isFull || !inputText.trim()}
                onClick={async () => {
                  if (!inputText.trim() || !isFull) return;
                  setPlayState("PLAYING");
                  addMessage({ role: "DIRECTOR", content: inputText }); // Optimistic UI local lock to secure Phase 2 bounds
                  await fetch(
                    `http://localhost:3005/api/rooms/${roomId}/messages`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        agentRole: "DIRECTOR",
                        content: inputText,
                        metadata: null,
                      }),
                    },
                  );
                  setInputText("");
                  setTimeout(() => runAgentTurn(songVibe), 2000);
                }}
                className="mt-3 w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold tracking-widest uppercase rounded flex justify-center items-center shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Clapperboard className="w-5 h-5 mr-2" />
                发布全局基调 & 启动引擎 (启动)
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-[1.5px] border-dashed border-slate-800 rounded-xl bg-slate-900/20">
              <Loader2 className="w-8 h-8 text-slate-600 animate-spin mb-4" />
              <span className="text-cyan-600 font-mono tracking-widest animate-pulse font-bold">
                等待导演发布推演开场协议...
              </span>
              <span className="text-xs text-slate-500 mt-2 font-mono">
                （正在耐心等待最高权限「导演」节点发布全局基调...）
              </span>
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  disabled={!isFull}
                  onClick={() => {
                    setPlayState("PLAYING");
                    runAgentTurn(songVibe);
                  }}
                  className="px-4 py-2 border border-slate-700 text-slate-500 hover:text-rose-400 hover:border-rose-900/80 hover:bg-rose-950/20 rounded text-[10px] font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  [紧急干预] 强制唤醒 AI 替身导演旁路点火
                </button>
              </div>
            </div>
          )
        ) : playState === "CHECKPOINT" ? (
          <div className="flex-1 flex flex-col h-full items-center justify-center p-5 border border-amber-900/30 bg-[#0f0a00] rounded-xl relative overflow-hidden shadow-inner">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-[linear-gradient(90deg,transparent,rgba(245,158,11,0.8),transparent)]"></div>

            <div className="absolute top-4 right-4 px-3 py-1 bg-amber-950/40 border border-amber-900/50 rounded flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-amber-500 font-mono text-[10px] tracking-widest font-bold">
                托管倒计时:{" "}
                <span className="text-amber-400 text-sm ml-1">
                  {countdown}s
                </span>
              </span>
            </div>

            <AlertOctagon className="w-10 h-10 text-amber-500 mb-3 animate-pulse" />
            <h2 className="text-amber-500 font-bold tracking-widest mb-2 font-mono">
              阶段 3：推演暂停 (检查点)
            </h2>
            <p className="text-amber-500/70 text-xs mb-5 text-center max-w-lg">
              本轮推演已阶段性收敛。您可以选择“直接进入下一轮”或在下方框中输入手动干预指令 (手动指令介入)。如果您在{" "}
              <strong className="text-amber-400">{countdown}s</strong>{" "}
              后未响应，系统将自动通过。
            </p>
            <div className="flex w-full gap-3 px-8">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="[可选指令] 请在此输入人工剧本纠偏、细节补充等最高优先级的介入指令..."
                className="flex-1 h-14 bg-black/60 border border-amber-900/40 rounded-lg px-4 text-amber-100/90 text-sm focus:outline-none focus:border-amber-500/60 resize-none pt-4 font-mono transition-all custom-scrollbar"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (inputText.trim()) {
                      humanOverride(inputText);
                      setInputText("");
                    }
                    setPlayState("PLAYING");
                  }
                }}
              />
            </div>
            <div className="flex gap-4 mt-5">
              <button
                onClick={onOpenModal}
                className="px-6 py-2.5 border border-rose-900/50 text-rose-500 hover:bg-rose-950/40 rounded font-mono text-xs font-bold transition-colors uppercase tracking-widest shadow-[0_0_10px_rgba(225,29,72,0.1)]"
              >
                驳回此轮结果并回退 (回滚)
              </button>
              <button
                onClick={() => {
                  if (inputText.trim()) {
                    humanOverride(inputText);
                    setInputText("");
                  }
                  setPlayState("PLAYING");
                }}
                className={`px-8 py-2.5 bg-amber-600 hover:bg-amber-500 text-black font-bold font-mono text-xs rounded transition-all uppercase tracking-widest ${inputText.trim() ? "shadow-[0_0_20px_rgba(245,158,11,0.6)]" : "shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]"}`}
              >
                {inputText.trim()
                  ? "载入指令 & 批准进入下一轮"
                  : "跳过干预，直接推进 (批准)"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-4 items-center">
              {playState === "COMPLETED" ? (
                <AlertOctagon className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertOctagon className="w-4 h-4 text-cyan-500 animate-pulse" />
              )}
              <span
                className={`text-xs font-mono tracking-widest ${playState === "COMPLETED" ? "text-emerald-600" : "text-cyan-600"}`}
              >
                {playState === "COMPLETED"
                  ? "阶段 4：推演同步结束 (已完成)"
                  : "阶段 2：环境自动推演中... (可随时手动干预)"}
              </span>
            </div>

            <div className="relative flex-1 bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden flex shadow-inner">
              <textarea
                value={inputText}
                disabled={
                  !isFull ||
                  isGenerating ||
                  isSpectator ||
                  playState === "COMPLETED"
                }
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isSpectator
                    ? "[ 观察模式 ] 旁观者禁止下达物理干预指令..."
                    : !isFull
                      ? "[ 警告 ] 四核职能代理未集齐，核心输入端口已物理切断..."
                      : playState === "COMPLETED"
                        ? "[ 封印限制 ] 产物已永久落定，时间线被物理锁死不可篡改。"
                        : "强行注入人类意志参数至智能体通讯网络..."
                }
                className={`flex-1 bg-transparent text-slate-200 p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed ${!isFull || isSpectator || playState === "COMPLETED" ? "cursor-not-allowed opacity-50" : ""}`}
              />
              <button
                onClick={handleSend}
                className={`px-6 py-2 ${!isFull || isGenerating || isSpectator || playState === "COMPLETED" ? "bg-cyan-900/40 text-cyan-800 cursor-not-allowed" : "bg-cyan-600 hover:bg-cyan-500 text-black cursor-pointer"} font-medium transition-colors border-l border-cyan-800/50 flex items-center justify-center min-w-[120px]`}
                disabled={
                  !isFull ||
                  isGenerating ||
                  isSpectator ||
                  playState === "COMPLETED"
                }
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="flex justify-between text-xs font-mono text-slate-500 mt-2 px-2">
              <span>
                {playState === "COMPLETED"
                  ? "[时空信道已切断]"
                  : "[实时通信信道已开启]"}
              </span>
              <span>{"// 手动指令介入.SYS"}</span>
            </div>
          </>
        )}

        <div className="mt-4 flex gap-4">
          <button
            className={`flex-1 py-3 px-4 ${!isFull || isSpectator || playState === "COMPLETED" ? "bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed" : "bg-slate-900 border border-slate-800 hover:border-cyan-900/50 hover:bg-slate-800/50 text-slate-400 group"} rounded-lg flex items-center justify-center gap-2 transition-all`}
            onClick={() => {
              if (messages.length === 0) return; // 初始锁死，必须靠上方发稿
              if (playState === "PLAYING") setPlayState("PAUSED");
              else if (playState === "PAUSED" || playState === "IDLE")
                setPlayState("PLAYING");
            }}
            disabled={
              !isFull ||
              isSpectator ||
              playState === "CHECKPOINT" ||
              playState === "COMPLETED" ||
              messages.length === 0
            }
          >
            <div
              className={`w-2 h-2 rounded-full ${!isFull || isSpectator || playState === "COMPLETED" ? "bg-slate-800" : playState === "PAUSED" ? "bg-amber-500" : playState === "CHECKPOINT" ? "bg-amber-500 animate-ping" : "bg-cyan-500 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.5)]"} transition-shadow`}
            ></div>
            <span
              className={
                !isFull || isSpectator || playState === "COMPLETED"
                  ? "text-slate-600"
                  : playState === "PAUSED" || playState === "CHECKPOINT"
                    ? "text-amber-500"
                    : "text-cyan-400 font-bold"
              }
            >
              {isSpectator
                ? "观察模式: 实时静默同步推演中... (观看模式)"
                : !isFull
                  ? `系统强制挂起：网络缺失 ${4 - (roomInfo?.members?.length || 0)} 名成员接入...`
                  : playState === "COMPLETED"
                    ? "推演已成功收敛。内容已锁定不可篡改 (已完成)"
                    : playState === "CHECKPOINT"
                      ? "检查点人工核验中... (正在核验)"
                      : messages.length === 0
                        ? "阶段 1：请导演发布全局引导指令..."
                        : playState === "PAUSED" || playState === "IDLE"
                          ? "引擎系统空载 - 点击重新开启自动推演 (恢复推进) >>"
                          : "AI 自动序列推演中 (正在推演) || 点击强制暂停推演"}
            </span>
          </button>
          <button
            className={`px-6 bg-slate-900 border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/20 rounded-lg flex items-center justify-center gap-2 transition-all text-slate-400 hover:text-rose-400 ${!isFull || isSpectator ? "cursor-not-allowed opacity-50" : ""}`}
            onClick={!isSpectator && isFull ? onOpenModal : undefined}
            disabled={!isFull || isSpectator}
          >
            <span>清空重置 (REBOOT)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
