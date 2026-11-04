import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle, ArrowLeft, Atom } from 'lucide-react';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Direct token from backend (email login or Google OAuth complete)
      loginWithToken(token)
        .then(() => navigate('/dashboard', { replace: true }))
        .catch(() => setError('Unable to authenticate your session. Please try signing in again.'));
      return;
    }

    setError('Missing authentication token. Please try signing in again.');
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030712] px-6 overflow-hidden">
      <div className="pointer-events-none fixed -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-[140px]" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-[140px]" />

      <div className="relative z-10 w-full max-w-md">
        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-[#0E0715]/90 p-8 text-center shadow-2xl backdrop-blur-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-sm mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Authentication Error</h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="glass-button-primary mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-glow-indigo cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Login
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[#070D1E]/90 p-8 text-center shadow-2xl backdrop-blur-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 shadow-glow-indigo mb-4">
              <Atom className="h-7 w-7 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <h2 className="font-display text-lg font-bold text-white">Authenticating Session</h2>
            <p className="mt-1 text-xs text-slate-400">Verifying secure credentials & synchronizing workspace…</p>
            <div className="mt-5 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
