import { motion } from 'motion/react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAgentStore } from '../store/useAgentStore';

export default function RollbackModal({ onClose }: { onClose: () => void }) {
  const { roomId, clearAll } = useAgentStore();
  const [isWiping, setIsWiping] = useState(false);

  const handleHardReboot = async () => {
    if (!roomId) return;
    setIsWiping(true);
    try {
      await fetch(`http://localhost:3005/api/rooms/${roomId}/messages`, {
        method: 'DELETE'
      });
      // Flush front-end localized memory immediately
      clearAll();
      onClose();
    } catch (e) {
      console.error("Hard reboot failed:", e);
      setIsWiping(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0a0a0a] border border-rose-900 shadow-[0_0_50px_rgba(225,29,72,0.15)] rounded-xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-rose-950/30 p-4 border-b border-rose-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-500">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-mono text-sm font-bold tracking-widest uppercase">确认重置房间</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            您正在尝试 <strong className="text-rose-400 font-normal">清空所有推演记录</strong>。
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            此操作将永久删除当前房间内的所有聊天记录和 AI 生成内容，操作不可恢复。房间将回到初始状态。
          </p>
          
          <div className="bg-black border border-slate-800 rounded p-3 font-mono text-xs text-slate-500">
            <div className="flex justify-between mb-1"><span>清理范围:</span> <span className="text-rose-400">当前房间所有记录</span></div>
            <div className="flex justify-between mb-1"><span>受影响角色:</span> <span className="text-amber-400">所有成员</span></div>
            <div className="flex justify-between"><span>危险等级:</span> <span className="text-rose-500 font-bold">不可逆操作</span></div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex gap-3 bg-slate-900/20">
          <button 
            onClick={onClose}
            disabled={isWiping}
            className="flex-1 py-2 px-4 border border-slate-700 text-slate-300 text-xs font-mono uppercase tracking-wider rounded hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button 
            onClick={handleHardReboot}
            disabled={isWiping}
            className="flex-1 py-2 px-4 bg-rose-600 flex justify-center items-center text-white text-xs font-mono font-bold uppercase tracking-wider rounded hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWiping ? <Loader2 className="w-4 h-4 animate-spin" /> : "确认清空并重置"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
