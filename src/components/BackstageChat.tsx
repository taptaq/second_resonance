import { X, Send, RadioTower, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAgentStore } from "../store/useAgentStore";
import { motion, AnimatePresence } from "motion/react";

export default function BackstageChat() {
  const { isChatOpen, setChatOpen, chatMessages, roomId, avatarId, roomInfo } = useAgentStore();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages]);

  const myMember = roomInfo?.members?.find((m: any) => m.avatar?.id === avatarId);
  const myRole = myMember?.role || "GUEST";
  const myName = myMember?.avatar?.name || "匿名用户";

  const sendChat = async () => {
    if (!text.trim() || isSending) return;
    
    setIsSending(true);
    try {
      const response = await fetch(`http://localhost:3005/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentRole: myRole,
          content: `[${myName}] ${text}`,
          metadata: {
            userId: avatarId,
            type: 'human_chat'
          }
        }),
      });

      if (response.ok) {
        setText('');
      }
    } catch (error) {
      console.error("Failed to send chat:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div 
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="absolute right-0 top-0 bottom-0 w-80 bg-black/90 backdrop-blur-3xl border-l border-cyan-900/40 shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col z-50 overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent"></div>

          <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 bg-slate-950/80 relative">
             <div className="flex items-center gap-3">
               <div className="relative">
                 <RadioTower className="w-4 h-4 text-cyan-400" />
                 <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
               </div>
               <span className="font-mono text-xs font-bold text-cyan-500 uppercase tracking-widest">房间讨论频道</span>
             </div>
             <button onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-rose-400 transition-colors w-6 h-6 flex justify-center items-center rounded hover:bg-rose-950/30">
               <X className="w-4 h-4" />
             </button>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-4 custom-scrollbar"
          >
            <div className="min-h-full flex flex-col justify-end gap-4">
              {chatMessages.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-12 text-slate-500/50 gap-3">
                    <RadioTower className="w-12 h-12 opacity-20" />
                    <span className="text-xs font-mono text-center px-4 leading-relaxed">频道静默中。<br/>这里是纯人类视角的讨论区，<br/>无论是谁，<br/>在这里畅所欲言吧。</span>
                 </div>
              ) : (
                 chatMessages.map(msg => {
                   const isMe = msg.metadata?.userId === avatarId;
                   const headerMatch = msg.content.match(/^\[(.*?)\]/);
                   const senderInfo = headerMatch ? headerMatch[1] : '匿名观察员';
                   const actualMsg = msg.content.replace(/^\[.*?\]\s*/, '');
                   
                   return (
                     <motion.div 
                       initial={{ opacity: 0, y: 5, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       key={msg.id} 
                       className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} shrink-0`}
                     >
                       <span className={`text-[10px] font-mono mb-1.5 opacity-60 ${isMe ? 'text-emerald-400 mr-1' : 'text-cyan-400 ml-1'}`}>
                         &lt;{senderInfo}&gt;
                       </span>
                       <div className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed shadow-sm form-sizing ${isMe ? 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-100 rounded-tr-sm' : 'bg-slate-800/60 border border-slate-700/50 rounded-tl-sm text-slate-300'} max-w-[90%] break-words whitespace-pre-wrap`}>
                         {actualMsg}
                       </div>
                     </motion.div>
                   );
                 })
              )}
            </div>
          </div>
          
          <div className="p-3 border-t border-slate-800 bg-[#050505] flex gap-2 shrink-0">
             <textarea
               value={text}
               onChange={e => setText(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
               placeholder={isSending ? "正在发送..." : "在这里输入聊天内容..."}
               disabled={isSending}
               className={`flex-1 bg-slate-900/60 border ${isSending ? 'border-cyan-900/30' : 'border-slate-700/80'} rounded-lg px-4 py-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono resize-none h-12 custom-scrollbar shadow-inner ${isSending ? 'opacity-50' : ''}`}
             />
             <button disabled={!text.trim() || isSending} onClick={sendChat} className={`w-12 rounded-lg flex items-center justify-center transition-all shadow ${text.trim() && !isSending ? 'bg-cyan-600 hover:bg-cyan-500 text-black cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
               {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
