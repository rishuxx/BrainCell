import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthBox } from '../components/AuthBox';
import { ArrowRight } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface QuoteItem {
  prefix: string;
  highlight: string;
  suffix: string;
}

const FUNNY_QUOTES: QuoteItem[] = [
  { prefix: 'Your last brain cell has ', highlight: 'Backup?', suffix: '' },
  { prefix: 'Thinking hard or ', highlight: 'hardly thinking?', suffix: '' },
  { prefix: 'Running on 1% battery and ', highlight: '1 brain cell.', suffix: '' },
  { prefix: 'Cache hit: because memory is ', highlight: 'overrated.', suffix: '' },
  { prefix: 'Error 404: ', highlight: 'Sleep not found.', suffix: '' },
  { prefix: 'Two brain cells walked into a bar... one ', highlight: 'failed over.', suffix: '' },
  { prefix: 'Don’t worry, your keys have ', highlight: 'backups too.', suffix: '' },
];

interface HomePageProps {
  user: User | null;
  authReady: boolean;
}

export function HomePage({ user, authReady }: HomePageProps) {
  const navigate = useNavigate();
  const [showAuthBox, setShowAuthBox] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % FUNNY_QUOTES.length);
        setIsGlitching(false);
      }, 250);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleStartChat = (userId?: string) => {
    navigate(userId ? '/chat' : `/chat/${crypto.randomUUID()}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 w-full h-full pb-8 sm:pb-12 overflow-y-auto">
      <div className="flex flex-col items-center max-w-2xl w-full text-center my-auto pt-10 sm:pt-0">
        {/* Brain Logo & Matrix Title */}
        <img
          src="/Brain.svg"
          alt="BrainCell Brain"
          className="h-12 w-12 sm:h-14 sm:w-14 mb-2 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
        />

        <h1 className="text-2xl sm:text-3xl font-matrix font-bold tracking-normal text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] mb-3">
          BrainCell
        </h1>

        {!showAuthBox ? (
          <div className="flex flex-col items-center animate-in fade-in duration-300 w-full px-2">
            {/* Highlighted Tagline with glitch transition */}
            <div className="bg-white text-black px-4 sm:px-6 py-2 rounded-none border-2 border-black mb-6 sm:mb-8 transition-all duration-200 w-full max-w-md sm:max-w-none">
              <h2
                className={`text-xs xs:text-sm sm:text-base md:text-lg font-matrix font-bold tracking-wider select-none transition-all duration-150 break-words ${
                  isGlitching
                    ? 'opacity-30 blur-[1px] translate-x-1 skew-x-6 text-rose-600'
                    : 'opacity-100 blur-0 translate-x-0 skew-x-0'
                }`}
              >
                <span className="text-black">{FUNNY_QUOTES[quoteIndex].prefix}</span>
                <span className="text-[#be0638] underline decoration-2">{FUNNY_QUOTES[quoteIndex].highlight}</span>
                <span className="text-black">{FUNNY_QUOTES[quoteIndex].suffix}</span>
              </h2>
            </div>

            {/* Action Buttons: Get Started & BrainCell ?? */}
            <div className="flex flex-col xs:flex-row items-center justify-center gap-3 sm:gap-4 w-full xs:w-auto">
              <button
                disabled={!authReady}
                onClick={() => {
                  if (user) {
                    handleStartChat(user.id);
                  } else {
                    setShowAuthBox(true);
                  }
                }}
                className="w-full xs:w-auto flex items-center justify-center gap-2 rounded-none border-2 border-black bg-white px-6 py-2.5 font-matrix text-xs font-bold tracking-wider text-black transition-all hover:bg-gray-100 hover:translate-x-[1px] hover:translate-y-[1px]"
              >
                <span>Get Started</span>
                <span>→</span>
              </button>

              <button
                onClick={() => navigate('/about')}
                className="w-full xs:w-auto rounded-none border-2 border-black bg-[#be0638] px-6 py-2.5 font-matrix text-xs font-bold tracking-wider text-white transition-all hover:bg-[#d41147] hover:translate-x-[1px] hover:translate-y-[1px]"
              >
                BrainCell ??
              </button>
            </div>

            {/* Direct Guest Link */}
            {authReady && !user && (
              <button
                onClick={() => handleStartChat()}
                className="mt-6 flex items-center gap-1.5 text-xs font-mono text-gray-400 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                <span>Or chat as guest</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-200 w-full flex justify-center">
            <AuthBox
              onCancel={() => setShowAuthBox(false)}
              onAuthSuccess={(userId) => {
                setShowAuthBox(false);
                handleStartChat(userId);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
