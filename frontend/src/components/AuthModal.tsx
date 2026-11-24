import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { X, Mail, Lock, Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setSuccessMsg('Check your email for confirmation link!');
        } else {
          setSuccessMsg('Account created successfully!');
          setTimeout(() => {
            onClose();
            onAuthSuccess?.();
          }, 800);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => {
          onClose();
          onAuthSuccess?.();
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#18191c]/95 p-6 shadow-2xl backdrop-blur-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-xl p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/Brain.svg" alt="BrainCell Logo" className="h-10 w-10 mb-2 object-contain" />
          <h2 className="text-2xl font-matrix font-bold tracking-wider text-white">
            {isSignUp ? 'Create BrainCell Account' : 'Welcome to BrainCell'}
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            {isSignUp
              ? 'Secure your private chat sessions with Supabase Auth'
              : 'Sign in to access your persistent conversations'}
          </p>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-300">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-300 mb-1.5">Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-white/15 bg-black/40 pl-10 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-pink-500/60 focus:outline-none focus:ring-1 focus:ring-pink-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-300 mb-1.5">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/15 bg-black/40 pl-10 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-pink-500/60 focus:outline-none focus:ring-1 focus:ring-pink-500/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-pink-500 hover:to-rose-500 hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        {/* Switch between Sign In / Sign Up */}
        <div className="mt-5 text-center text-xs text-gray-400">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-pink-400 hover:underline font-medium"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-pink-400 hover:underline font-medium"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
