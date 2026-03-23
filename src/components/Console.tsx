import { Terminal, Send, AlertOctagon } from 'lucide-react';
import { useState, KeyboardEvent } from 'react';
import { useAgentStore } from '../store/useAgentStore';
import { runAgentTurn } from '../lib/agentOrchestrator';

export default function Console({ onOpenModal }: { onOpenModal: () => void }) {
  const [inputText, setInputText] = useState('');
  const { humanOverride, isGenerating, messages, songVibe } = useAgentStore();

  const handleSend = () => {
    if (!inputText.trim() || isGenerating) return;
    
    // Inject human override into the context window securely
    humanOverride(inputText);
    setInputText('');
    runAgentTurn(songVibe);
  };

  const handleInitialStart = () => {
    if (isGenerating || !songVibe) return;
    runAgentTurn(songVibe);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-80 border-t border-cyan-900/40 bg-black/80 backdrop-blur-xl absolute bottom-0 left-72 right-0 z-30 flex flex-col">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col relative pb-32">
        {messages.length === 0 ? (
          <div className="flex gap-4 mb-4 items-center">
            <Terminal className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-mono text-cyan-600">匹配成功！A2A 通讯管线准备就绪。</span>
          </div>
        ) : (
          <div className="flex gap-4 mb-4 items-center">
            <AlertOctagon className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-xs font-mono text-amber-600">警告：可随时发起最高权限覆盖机制变更剧情走向</span>
          </div>
        )}

        <div className="relative flex-1 bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden flex shadow-inner">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="强行注入人类意志参数至智能体通讯网络..."
            className="flex-1 bg-transparent text-slate-200 p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed"
          />
          <button 
            onClick={handleSend} 
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-medium transition-colors border-l border-cyan-700/50 flex items-center justify-center min-w-[120px]"
            disabled={isGenerating}
          >
            {isGenerating ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <Send className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex justify-between text-xs font-mono text-slate-500 mt-2 px-2">
          <span>{messages.length === 0 ? '[等待推演首节点激活]' : '[通信信道已开启]'}</span>
          <span>{'// OVERRIDE.SYS'}</span>
        </div>

        <div className="mt-4 flex gap-4">
          <button 
            className="flex-1 py-3 px-4 bg-slate-900 border border-slate-800 hover:border-cyan-900/50 hover:bg-slate-800/50 rounded-lg flex items-center justify-center gap-2 transition-all group"
            onClick={messages.length === 0 ? handleInitialStart : () => {
              if (!isGenerating && messages.length > 0) runAgentTurn(songVibe);
            }}
          >
            <div className="w-2 h-2 rounded-full bg-cyan-500 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-shadow"></div>
            <span className="text-slate-400">
              {messages.length === 0 ? "点火：唤醒首个智能体进行开场推演 >>" : "持续触发序列推演 >>"}
            </span>
          </button>
          <button 
            className="px-6 bg-slate-900 border border-slate-800 hover:border-rose-900/50 hover:bg-rose-950/20 rounded-lg flex items-center justify-center gap-2 transition-all text-slate-400 hover:text-rose-400"
            onClick={onOpenModal}
          >
            <span>时光回溯 (ROLLBACK)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
