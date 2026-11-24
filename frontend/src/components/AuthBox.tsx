import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface AuthBoxProps {
  onCancel: () => void;
  onAuthSuccess?: (userId: string) => void;
}

export function AuthBox({ onCancel, onAuthSuccess }: AuthBoxProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        const signedInUser = data.session?.user;
        if (!signedInUser) {
          setSuccessMsg('Check your email for confirmation link!');
        } else {
          setSuccessMsg('Account created successfully!');
          setTimeout(() => {
            onAuthSuccess?.(signedInUser.id);
            onCancel();
          }, 800);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => {
          onAuthSuccess?.(data.user.id);
          onCancel();
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm transition-all mx-auto">
      {/* Proper white card, sharp edges (rounded-none), rose-red text, matrix font, NO shadow */}
      <div className="relative flex flex-col rounded-none border border-black bg-white p-5 text-left font-matrix">
        {/* Top Bar: Back button + Mode indicator */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-matrix tracking-wider text-gray-700 hover:text-[#be0638] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#be0638]" />
            <span>← Back</span>
          </button>
          <span className="text-xs font-matrix tracking-wider text-[#be0638] font-bold uppercase">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </span>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-3.5 flex items-center gap-2 rounded-none border border-[#be0638] bg-rose-50 p-2.5 text-xs text-[#be0638]">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#be0638]" />
            <span className="font-mono text-[11px]">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3.5 flex items-center gap-2 rounded-none border border-emerald-600 bg-emerald-50 p-2.5 text-xs text-emerald-800">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span className="font-mono text-[11px]">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-matrix tracking-wider text-[#be0638] mb-1 font-bold">
              Email:
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-4 w-4 text-[#be0638]/70" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-none border-2 border-gray-300 bg-gray-50 pl-9 pr-3 py-1.5 font-matrix text-xs tracking-wide text-black placeholder-gray-400 focus:border-[#be0638] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-matrix tracking-wider text-[#be0638] mb-1 font-bold">
              Password:
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-[#be0638]/70" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-none border-2 border-gray-300 bg-gray-50 pl-9 pr-3 py-1.5 font-matrix text-xs tracking-wide text-black placeholder-gray-400 focus:border-[#be0638] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-none bg-[#be0638] py-2.5 font-matrix text-xs font-bold tracking-widest text-white transition-all hover:bg-[#d41147] disabled:opacity-50 mt-3"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <span>{isSignUp ? 'SIGN UP →' : 'SIGN IN →'}</span>
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-4 pt-2 border-t border-gray-200 text-center text-xs font-matrix">
          {isSignUp ? (
            <span className="text-gray-700">
              Have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-[#be0638] underline font-bold tracking-wider"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span className="text-gray-700">
              No account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-[#be0638] underline font-bold tracking-wider"
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
