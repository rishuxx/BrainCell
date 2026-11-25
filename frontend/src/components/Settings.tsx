import { X } from 'lucide-react';

interface SettingsProps {
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  simulateFailure: string;
  onSimulateFailureChange: (value: string) => void;
  onClose: () => void;
}

const fieldClassName = 'pixel-corners block w-full border border-[#be0638] bg-[#100006] px-3 py-2 text-xs leading-relaxed text-white placeholder:text-rose-200/70';

export function Settings({
  systemPrompt,
  onSystemPromptChange,
  simulateFailure,
  onSimulateFailureChange,
  onClose,
}: SettingsProps) {
  return (
    <div className="font-matrix border-b border-[#be0638] bg-black p-3 text-white sm:p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="text-sm text-rose-400">Settings & Failover Test</h3>
          <button
            type="button"
            onClick={onClose}
            className="pixel-corners bg-[#be0638] p-2 text-white transition-colors hover:bg-[#d80b45]"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* System Prompt */}
          <div>
            <label htmlFor="system-prompt" className="mb-1.5 block text-xs">
              System Prompt (optional)
            </label>
            <textarea
              id="system-prompt"
              data-testid="system-prompt-input"
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="You are a helpful AI assistant."
              rows={2}
              className={fieldClassName}
            />
          </div>

          {/* Failover Simulation */}
          <div>
            <label htmlFor="simulate-failure" className="mb-1.5 block text-xs">
              Simulate Failure (X-Simulate-Failure header)
            </label>
            <input
              id="simulate-failure"
              type="text"
              value={simulateFailure}
              onChange={(e) => onSimulateFailureChange(e.target.value)}
              placeholder="e.g. key_1=429 or *=503"
              aria-describedby="simulate-failure-format"
              className={fieldClassName}
            />
            <p id="simulate-failure-format" className="mt-1.5 text-[11px] text-rose-300 sm:text-xs">
              Format: key_1=429, key_2=500, or *=503 for all keys
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
