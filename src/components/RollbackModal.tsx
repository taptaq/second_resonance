import { motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

export default function RollbackModal({ onClose }: { onClose: () => void }) {
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
            <h3 className="font-mono text-sm font-bold tracking-widest uppercase">核心共识否决协议</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            您正在尝试发起 <strong className="text-rose-400 font-normal">人类共识回滚 (Consensus Rollback)</strong>。
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            此操作将强制终止当前剧组的思维脉冲冲突，丢弃未固化的推演记忆分支，并将系统状态强制回溯至上一个安全锚点。所有智能体节点将强制进入待命休眠状态。
          </p>
          
          <div className="bg-black border border-slate-800 rounded p-3 font-mono text-xs text-slate-500">
            <div className="flex justify-between mb-1"><span>锚点回溯至:</span> <span className="text-slate-300">#892-ALPHA-V2</span></div>
            <div className="flex justify-between mb-1"><span>撤回智能体序列:</span> <span className="text-rose-400">4/4 在线核心</span></div>
            <div className="flex justify-between"><span>预计熵减损耗:</span> <span className="text-amber-400">12.4% 生成周期</span></div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex gap-3 bg-slate-900/20">
          <button 
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-slate-700 text-slate-300 text-xs font-mono uppercase tracking-wider rounded hover:bg-slate-800 transition-colors"
          >
            暂缓 / CANCEL
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-rose-600 text-white text-xs font-mono font-bold uppercase tracking-wider rounded hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-colors"
          >
            强行终止分支 (ROLLBACK)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
