'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { detectLocale, getTranslation } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const locale = detectLocale();
  const t = getTranslation(locale);

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://30sec.org/api';

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStep('code');
      } else {
        const data = await res.json();
        setError(data.message || 'Error');
      }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Пароль сброшен! Перенаправляем...');
        setTimeout(() => router.push('/auth/login'), 2000);
      } else {
        setError(data.message || 'Error');
      }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-950/30 via-dark-900 to-dark-900" />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="text-center mb-10 animate-fade-in">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl sm:text-6xl font-display font-black tracking-tighter">
              <span className="text-white">30</span>
              <span className="bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">sec</span>
              <span className="text-accent-400">.</span>
            </h1>
          </Link>
          <p className="text-white/30 mt-3 text-sm font-medium">
            {step === 'email' ? 'Сброс пароля' : 'Введите код из письма'}
          </p>
        </div>

        {success ? (
          <div className="card-glass text-center animate-fade-in">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-400 font-semibold">{success}</p>
          </div>
        ) : step === 'email' ? (
          <form onSubmit={requestCode} className="card-glass space-y-5 animate-slide-up">
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm">{error}</div>}
            <div>
              <label className="input-label">{t.auth.email}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="player@example.com" required autoFocus />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-center text-base">
              {loading ? 'Отправка...' : 'Отправить код'}
            </button>
            <p className="text-center text-white/30 text-sm">
              <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">← Назад к входу</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="card-glass space-y-5 animate-slide-up">
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm">{error}</div>}
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl px-4 py-3 text-brand-400 text-sm text-center">
              Код отправлен на {email}
            </div>
            <div>
              <label className="input-label">Код из письма</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                className="input-field text-center text-2xl font-mono tracking-[0.3em]"
                placeholder="000000" maxLength={6} required autoFocus />
            </div>
            <div>
              <label className="input-label">Новый пароль</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="input-field" placeholder="Min. 8 символов" minLength={8} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-center text-base">
              {loading ? 'Сброс...' : 'Сбросить пароль'}
            </button>
            <p className="text-center text-white/30 text-sm">
              <button type="button" onClick={() => setStep('email')} className="text-brand-400 hover:text-brand-300 font-medium">← Другой email</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
