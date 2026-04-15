'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/store';
import { detectLocale, getTranslation } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuth();
  const [locale, setLocale] = useState(detectLocale());
  const t = getTranslation(locale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {}
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-950/30 via-dark-900 to-dark-900" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-600/[0.06] rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl sm:text-6xl font-display font-black tracking-tighter">
              <span className="text-white">30</span>
              <span className="bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">sec</span>
              <span className="text-accent-400">.</span>
            </h1>
          </Link>
          <p className="text-white/30 mt-3 text-sm font-medium">{t.auth.login}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}
          className="card-glass space-y-5 animate-slide-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="input-label">{t.auth.email}</label>
            <input
              type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); clearError(); }}
              className="input-field" placeholder="player@example.com" required autoFocus
            />
          </div>

          <div>
            <label className="input-label">{t.auth.password}</label>
            <input
              type="password" value={password}
              onChange={(e) => { setPassword(e.target.value); clearError(); }}
              className="input-field" placeholder="••••••••" required
            />
            <Link href="/auth/forgot-password" className="text-brand-400/60 hover:text-brand-400 text-xs mt-1 inline-block transition-colors">
              Забыли пароль?
            </Link>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full text-center justify-center text-base">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {t.common.loading}
              </span>
            ) : t.auth.loginBtn}
          </button>

          <div className="divider" />

          <p className="text-center text-white/30 text-sm">
            {t.auth.noAccount}{' '}
            <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              {t.auth.register} →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
