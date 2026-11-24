import { X, Code2, Cpu, Database, Zap } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#16171a] p-6 shadow-2xl text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-xl p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-4">
          <img src="/Brain.svg" alt="BrainCell Logo" className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]" />
          <div>
            <h2 className="text-2xl font-matrix font-bold tracking-wider text-white">
              BrainCell
            </h2>
            <p className="text-xs font-mono text-pink-400">
              Your last brain cell has Backup.
            </p>
          </div>
        </div>

        {/* About BrainCell */}
        <div className="space-y-4 text-xs font-mono text-gray-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <h3 className="text-sm font-matrix text-white mb-1.5 flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-pink-400" />
              What is BrainCell?
            </h3>
            <p className="text-gray-400">
              BrainCell is an intelligent, high-resilience LLM chat engine built to solve statelessness, rate-limit crashes, and redundant API billing in production AI apps.
            </p>
          </div>

          {/* Architecture Highlights */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-1.5 text-pink-400 font-semibold mb-1">
                <Zap className="h-3.5 w-3.5" />
                <span>Key Failover</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Zero-downtime automatic routing across key pools on HTTP 429 or quota limits.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                <Database className="h-3.5 w-3.5" />
                <span>LiteLLM Cache</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Instant ~15ms responses on repeated prompts without hitting API provider limits.
              </p>
            </div>
          </div>

          {/* About Developer (Rishu) */}
          <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-950/20 to-black/40 p-4 mt-3">
            <h3 className="text-sm font-matrix text-white mb-1 flex items-center gap-1.5">
              <Code2 className="h-4 w-4 text-pink-400" />
              About the Developer · Rishu
            </h3>
            <p className="text-gray-300 text-[11px] mb-2.5">
              Built by <span className="text-white font-semibold">Rishu</span> — a full-stack engineer passionate about resilient backend architectures, AI gateways, and sleek cyberpunk/matrix web interfaces.
            </p>
            <div className="flex items-center gap-3 text-[11px] text-pink-400">
              <span className="flex items-center gap-1">FastAPI · Python · LiteLLM</span>
              <span>·</span>
              <span className="flex items-center gap-1">React · TypeScript · Vite</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-xs font-mono text-white hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
