import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, Database, Zap, Code2 } from 'lucide-react';

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-3 sm:px-4 w-full h-full pb-8 sm:pb-12 overflow-y-auto">
      <div className="w-full max-w-lg rounded-none border-2 border-black bg-white p-4 sm:p-6 shadow-2xl text-left font-matrix my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <img src="/Brain.svg" alt="BrainCell Logo" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
            <div>
              <h1 className="text-lg sm:text-xl font-matrix font-bold tracking-wider text-black">
                BrainCell
              </h1>
              <p className="text-[9px] sm:text-[10px] text-[#be0638]">
                Your last brain cell has Backup.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 border border-black bg-gray-100 px-2.5 sm:px-3 py-1 text-xs hover:bg-[#be0638] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Home</span>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs font-mono text-gray-800 leading-relaxed max-h-[60vh] sm:max-h-[55vh] overflow-y-auto pr-1">
          <div>
            <h2 className="text-xs font-matrix text-black mb-1 flex items-center gap-1.5 font-bold">
              <Cpu className="h-4 w-4 text-[#be0638]" />
              What is BrainCell?
            </h2>
            <p className="text-gray-700 text-[11px]">
              BrainCell is an intelligent, high-resilience LLM chat engine built to solve statelessness, rate-limit crashes, and redundant API billing in production AI applications.
            </p>
          </div>

          {/* Architecture Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-1">
            <div className="border border-black bg-gray-50 p-2.5">
              <div className="flex items-center gap-1.5 text-[#be0638] font-bold mb-1 font-matrix text-[11px]">
                <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Key Failover</span>
              </div>
              <p className="text-[10px] text-gray-600 font-mono">
                Zero-downtime automatic routing across key pools on HTTP 429 or quota exhaustion.
              </p>
            </div>

            <div className="border border-black bg-gray-50 p-2.5">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-1 font-matrix text-[11px]">
                <Database className="h-3.5 w-3.5 flex-shrink-0" />
                <span>LiteLLM Cache</span>
              </div>
              <p className="text-[10px] text-gray-600 font-mono">
                Instant ~15ms responses on repeated prompts without hitting AI provider limits.
              </p>
            </div>
          </div>

          {/* About Developer · Rishu */}
          <div className="border-2 border-black bg-rose-50 p-3 mt-3">
            <h2 className="text-xs font-matrix text-[#be0638] mb-1 flex items-center gap-1.5 font-bold">
              <Code2 className="h-4 w-4 text-[#be0638]" />
              About the Developer · Rishu
            </h2>
            <p className="text-gray-800 text-[11px] mb-2 font-mono">
              Built by <span className="text-black font-bold font-matrix">Rishu</span> — a full-stack engineer passionate about resilient backend architectures, AI gateways, SQLite context memory, and sleek cyberpunk/matrix web interfaces.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#be0638] font-matrix">
              <span>FastAPI</span>
              <span>·</span>
              <span>Python</span>
              <span>·</span>
              <span>LiteLLM</span>
              <span>·</span>
              <span>React</span>
              <span>·</span>
              <span>TypeScript</span>
              <span>·</span>
              <span>SQLite</span>
            </div>
          </div>
        </div>

        {/* Start Chat CTA */}
        <div className="mt-4 pt-3 border-t border-black flex justify-between items-center">
          <span className="text-[10px] text-gray-500 font-mono">Ready to test?</span>
          <button
            onClick={() => {
              const newSessionId = crypto.randomUUID();
              navigate(`/chat/${newSessionId}`);
            }}
            className="rounded-none bg-[#be0638] px-4 py-1.5 font-matrix text-xs font-bold text-white hover:bg-[#d41147] transition-all"
          >
            Start Chatting →
          </button>
        </div>
      </div>
    </div>
  );
}
