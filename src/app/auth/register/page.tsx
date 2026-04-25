'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/store';
import { detectLocale, getTranslation } from '@/lib/i18n';

const countries = [
  { code: 'DE', flag: '\uD83C\uDDE9\uD83C\uDDEA', name: 'Deutschland' },
  { code: 'AT', flag: '\uD83C\uDDE6\uD83C\uDDF9', name: '\u00D6sterreich' },
  { code: 'CH', flag: '\uD83C\uDDE8\uD83C\uDDED', name: 'Schweiz' },
  { code: 'RU', flag: '\uD83C\uDDF7\uD83C\uDDFA', name: '\u0420\u043E\u0441\u0441\u0438\u044F' },
  { code: 'UA', flag: '\uD83C\uDDFA\uD83C\uDDE6', name: '\u0423\u043A\u0440\u0430\u0457\u043D\u0430' },
  { code: 'US', flag: '\uD83C\uDDFA\uD83C\uDDF8', name: 'USA' },
  { code: 'GB', flag: '\uD83C\uDDEC\uD83C\uDDE7', name: 'UK' },
  { code: 'FR', flag: '\uD83C\uDDEB\uD83C\uDDF7', name: 'France' },
  { code: 'IT', flag: '\uD83C\uDDEE\uD83C\uDDF9', name: 'Italia' },
  { code: 'ES', flag: '\uD83C\uDDEA\uD83C\uDDF8', name: 'Espa\u00F1a' },
  { code: 'PL', flag: '\uD83C\uDDF5\uD83C\uDDF1', name: 'Polska' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error, clearError } = useAuth();
  const [locale, setLocale] = useState(detectLocale());
  const t = getTranslation(locale);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', nickname: '', countryCode: 'DE',
    acceptTerms: false, acceptPrivacy: false, marketingConsent: false,
  });

  useEffect(() => { setMounted(true); }, []);

  const update = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.acceptTerms || !form.acceptPrivacy) return;
    try {
      await register({ ...form, language: locale });
      router.push(`/auth/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch {}
  };

  if (!mounted) return null;

  const canSubmit = form.acceptTerms && form.acceptPrivacy && form.email && form.password.length >= 8 && form.nickname.length >= 3;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-950/30 via-dark-900 to-dark-900" />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="text-center mb-6 animate-fade-in">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl sm:text-6xl font-display font-black tracking-tighter">
              <span className="text-white">30</span>
              <span className="bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">sec</span>
              <span className="text-accent-400">.</span>
            </h1>
          </Link>
          <p className="text-white/30 mt-3 text-sm font-medium">{t.auth.register}</p>
          <p className="text-white/40 text-xs mt-2">Быстрая регистрация · профиль заполните позже</p>
        </div>

        <form onSubmit={handleSubmit}
          className="card-glass space-y-4 animate-slide-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="input-label">{t.auth.email}</label>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
              className="input-field" placeholder="player@example.com" required />
          </div>

          <div>
            <label className="input-label">{t.auth.password}</label>
            <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)}
              className="input-field" placeholder="Минимум 8 символов" required minLength={8} />
          </div>

          <div>
            <label className="input-label">{t.auth.nickname}</label>
            <input type="text" value={form.nickname} onChange={(e) => update('nickname', e.target.value)}
              className="input-field font-mono" placeholder={t.auth.nicknamePlaceholder} required minLength={3} />
            <div className="text-[10px] text-white/30 mt-1 px-1">Как вас увидят в турнирах</div>
          </div>

          <div>
            <label className="input-label">Страна</label>
            <select value={form.countryCode} onChange={(e) => update('countryCode', e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="input-field">
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3 pt-2 border-t border-white/[0.05]">
            <label className="flex items-start gap-2.5 text-xs text-white/70 cursor-pointer">
              <input type="checkbox" checked={form.acceptTerms} onChange={(e) => update('acceptTerms', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-brand-500 cursor-pointer shrink-0" />
              <span>Я принимаю <Link href="/terms" target="_blank" className="text-brand-400 hover:text-brand-300 underline">условия использования</Link> <span className="text-red-400">*</span></span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-white/70 cursor-pointer">
              <input type="checkbox" checked={form.acceptPrivacy} onChange={(e) => update('acceptPrivacy', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-brand-500 cursor-pointer shrink-0" />
              <span>Я принимаю <Link href="/privacy" target="_blank" className="text-brand-400 hover:text-brand-300 underline">политику конфиденциальности</Link> <span className="text-red-400">*</span></span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-white/50 cursor-pointer">
              <input type="checkbox" checked={form.marketingConsent} onChange={(e) => update('marketingConsent', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-brand-500 cursor-pointer shrink-0" />
              <span>Присылать мне новости о турнирах и обновлениях (необязательно)</span>
            </label>
          </div>

          <button type="submit" disabled={loading || !canSubmit}
            className="btn-primary w-full text-center justify-center text-base">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {t.common.loading}
              </span>
            ) : t.auth.registerBtn}
          </button>

          <div className="divider" />

          <p className="text-center text-white/30 text-sm">
            {t.auth.hasAccount}{' '}
            <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              {t.auth.login} →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
