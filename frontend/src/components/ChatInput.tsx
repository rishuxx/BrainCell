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
    <div className={`w-full transition-all ${isHero ? 'max-w-2xl px-2 sm:px-0' : 'max-w-3xl mx-auto'}`}>
      <div className="group relative isolate flex flex-col">
        <div
          aria-hidden="true"
          className="pixel-corners pointer-events-none absolute inset-0 -z-10 border border-white/10 bg-[#1e1f22]/90 transition-colors duration-200 group-focus-within:border-white/20 group-focus-within:bg-[#232428]/95"
        />
        {/* Text Input Area */}
        <div className="p-2.5 sm:p-3.5 pb-1 sm:pb-2">
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
            className="w-full resize-none bg-transparent px-1.5 sm:px-2 py-1 font-matrix text-[13px] sm:text-[14px] tracking-wide leading-relaxed text-gray-100 placeholder-gray-400/70 focus:outline-none disabled:opacity-50"
            aria-label="Chat message input"
          />
        </div>

        {/* Bottom Control Toolbar */}
        <div className="flex items-center justify-between px-2.5 sm:px-3.5 pb-2.5 sm:pb-3 pt-1">
          {/* Left Controls: Model Switcher dropdown without star icon */}
          <div className="relative" ref={dropdownRef}>
            <button
              ref={buttonRef}
              type="button"
              onClick={handleToggleDropdown}
              className="flex items-center gap-1 sm:gap-1.5 pixel-corners bg-[#be0638] px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs text-white transition-colors hover:bg-[#a80632]"
              aria-label="Select provider and key"
              aria-expanded={isModelDropdownOpen}
            >
              <span className="font-semibold text-white truncate max-w-[80px] sm:max-w-none">{selected.provider}</span>
              {selected.key_id && <span className="text-[10px] sm:text-[11px] text-white/85">{selected.key_id}</span>}
              <ChevronDown className={`h-3 w-3 text-white transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Model Dropdown Menu - smart positioning: opens downward by default, flips upward when near viewport bottom */}
            {isModelDropdownOpen && (
              <div
                className={`absolute left-0 z-50 w-56 max-w-[80vw] pixel-corners bg-[#1e0c14] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 ${
                  openUpward ? 'bottom-full mb-2' : 'top-full mt-2'
                }`}
              >
                <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-white/80">
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
                    className={`flex w-full items-center justify-between pixel-corners px-2.5 py-2 text-xs transition-colors ${
                      selectedKey === option.key_id
                        ? 'bg-[#be0638] text-white font-medium'
                        : 'text-white hover:bg-[#731b34]'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">{option.provider}{option.key_id ? ` · ${option.key_id}` : ''}</span>
                      <span className="break-all text-[10px] text-white/85">{option.model}</span>
                    </div>
                    {selectedKey === option.key_id && (
                      <Check className="h-3.5 w-3.5 text-white flex-shrink-0" />
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
              className={`pixel-corners flex h-8 w-8 items-center justify-center transition-all duration-200 ${
                hasText
                  ? 'bg-[#be0638] text-white shadow-lg hover:bg-[#d80b45] hover:scale-105 active:scale-95'
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
