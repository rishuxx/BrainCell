import { X } from 'lucide-react';

interface SettingsProps {
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  simulateFailure: string;
  onSimulateFailureChange: (value: string) => void;
  onClose: () => void;
}

export function Settings({
  systemPrompt,
  onSystemPromptChange,
  simulateFailure,
  onSimulateFailureChange,
  onClose,
}: SettingsProps) {
  return (
    <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Settings</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* System Prompt */}
          <div>
            <label htmlFor="system-prompt" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              System Prompt (optional)
            </label>
            <textarea
              id="system-prompt"
              data-testid="system-prompt-input"
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="You are a helpful AI assistant."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs
                         focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                         dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {/* Failover Simulation */}
          <div>
            <label htmlFor="simulate-failure" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Simulate Failure (X-Simulate-Failure header)
            </label>
            <input
              id="simulate-failure"
              type="text"
              value={simulateFailure}
              onChange={(e) => onSimulateFailureChange(e.target.value)}
              placeholder="e.g. key_1=429 or *=503"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs
                         focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                         dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-400">
              Format: key_1=429, key_2=500, or *=503 for all keys
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
