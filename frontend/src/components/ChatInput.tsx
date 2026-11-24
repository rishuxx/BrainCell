import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ArrowUp, Loader2, ChevronDown, Check } from 'lucide-react';
import type { KeyOption } from '../types/chat';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  keyOptions: KeyOption[];
  selectedKey: string;
  onSelectKey: (keyId: string) => void;
  isHero?: boolean;
}

export function ChatInput({ onSend, isLoading, keyOptions, selectedKey, onSelectKey, isHero = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const options = [{ key_id: '', provider: 'Automatic', model: 'Key pool with failover' }, ...keyOptions];
  const selected = options.find((option) => option.key_id === selectedKey) ?? options[0];
  const singleOption = keyOptions.length === 1 ? keyOptions[0] : undefined;
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Position rule: In hero (center), opens downward. In bottom bar (!isHero), ALWAYS opens upward.
  // Also calculates exact viewport distance if near edges.
  const handleToggleDropdown = () => {
    if (!isModelDropdownOpen) {
      if (!isHero) {
        setOpenUpward(true);
      } else if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpward(spaceBelow < 250);
      }
    }
    setIsModelDropdownOpen(!isModelDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  };

  const hasText = message.trim().length > 0;

  return (
    <div className={`w-full transition-all ${isHero ? 'max-w-2xl' : 'max-w-3xl mx-auto'}`}>
      <div className="relative flex flex-col rounded-3xl border border-white/10 bg-[#1e1f22]/90 shadow-2xl transition-all duration-200 focus-within:border-white/20 focus-within:bg-[#232428]/95">
        {/* Text Input Area */}
        <div className="p-3.5 pb-2">
          <textarea
            ref={textareaRef}
            data-testid="chat-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="How can I help you today?"
            disabled={isLoading}
            rows={2}
            className="w-full resize-none bg-transparent px-2 py-1 font-matrix text-[14px] tracking-wide leading-relaxed text-gray-100 placeholder-gray-400/70 focus:outline-none disabled:opacity-50"
            aria-label="Chat message input"
          />
        </div>

        {/* Bottom Control Toolbar */}
        <div className="flex items-center justify-between px-3.5 pb-3 pt-1">
          {/* Left Controls: Model Switcher dropdown without star icon */}
          <div className="relative" ref={dropdownRef}>
            {singleOption ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-200">
                <span className="font-semibold text-white">{singleOption.provider}</span>
                <span className="text-[11px] text-gray-400">
                  {singleOption.model === 'google/gemini-2.5-flash' ? 'Gemini 2.5 Flash' : singleOption.model}
                </span>
              </span>
            ) : (
            <button
              ref={buttonRef}
              type="button"
              onClick={handleToggleDropdown}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-gray-200 transition-all hover:bg-white/10 hover:border-white/20"
              aria-label="Select provider and key"
              aria-expanded={isModelDropdownOpen}
            >
              <span className="font-semibold text-white">{selected.provider}</span>
              {selected.key_id && <span className="text-[11px] text-gray-400">{selected.key_id}</span>}
              <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            )}

            {/* Model Dropdown Menu - smart positioning: opens downward by default, flips upward when near viewport bottom */}
            {!singleOption && isModelDropdownOpen && (
              <div
                className={`absolute left-0 z-50 w-56 rounded-2xl border border-white/15 bg-[#18191c]/95 p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 ${
                  openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
                }`}
              >
                <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                  Select provider and key
                </div>
                {options.map((option) => (
                  <button
                    key={option.key_id}
                    type="button"
                    onClick={() => {
                      onSelectKey(option.key_id);
                      setIsModelDropdownOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors ${
                      selectedKey === option.key_id
                        ? 'bg-pink-500/20 text-white font-medium'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">{option.provider}{option.key_id ? ` · ${option.key_id}` : ''}</span>
                      <span className="break-all text-[10px] text-gray-400">{option.model}</span>
                    </div>
                    {selectedKey === option.key_id && (
                      <Check className="h-3.5 w-3.5 text-pink-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Controls: Send Button */}
          <div className="flex items-center gap-2">
            <button
              data-testid="send-button"
              onClick={handleSend}
              disabled={isLoading || !hasText}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                hasText
                  ? 'bg-[#c95d3e] text-white shadow-lg hover:bg-[#d96c4d] hover:scale-105 active:scale-95'
                  : 'bg-white/5 text-gray-500 opacity-40 cursor-not-allowed'
              }`}
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <ArrowUp className="h-4 w-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
