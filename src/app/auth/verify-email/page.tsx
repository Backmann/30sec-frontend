'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { detectLocale, getTranslation, Locale } from '@/lib/i18n';

const RESEND_COOLDOWN_SEC = 60;

const V_STR: Record<Locale, {
  emailNotFound: string;
  invalidCode: string;
  codeResent: string;
  resendFailed: string;
  pageTitle: string;
  verified: string;
  redirecting: string;
  enterCode: string;
  sentTo: string;
  checking: string;
  confirm: string;
  resendIn: string;
  resendNow: string;
  back: string;
  resendCooldownSuffix: string;
}> = {
  ru: {
    emailNotFound: 'Email не определён. Попробуй залогиниться заново.',
    invalidCode: 'Неверный код. Попробуйте снова.',
    codeResent: 'Код отправлен повторно. Проверьте почту.',
    resendFailed: 'Не удалось отправить код повторно',
    pageTitle: 'Подтверждение email',
    verified: 'Email подтверждён!',
    redirecting: 'Перенаправляем на дашборд...',
    enterCode: 'Введите 6-значный код',
    sentTo: 'Мы отправили его на ',
    checking: 'Проверка...',
    confirm: 'Подтвердить',
    resendIn: 'Отправить код повторно через ',
    resendCooldownSuffix: 'с',
    resendNow: 'Не пришло письмо? Отправить заново',
    back: '← Вернуться к входу',
  },
  en: {
    emailNotFound: 'Email not found. Try signing in again.',
    invalidCode: 'Invalid code. Please try again.',
    codeResent: 'Code resent. Please check your email.',
    resendFailed: 'Could not resend the code',
    pageTitle: 'Email verification',
    verified: 'Email verified!',
    redirecting: 'Redirecting to dashboard...',
    enterCode: 'Enter 6-digit code',
    sentTo: 'We sent it to ',
    checking: 'Checking...',
    confirm: 'Confirm',
    resendIn: 'Resend code in ',
    resendCooldownSuffix: 's',
    resendNow: 'No email received? Resend',
    back: '← Back to sign in',
  },
  de: {
    emailNotFound: 'E-Mail nicht erkannt. Bitte erneut anmelden.',
    invalidCode: 'Ungültiger Code. Bitte erneut versuchen.',
    codeResent: 'Code erneut gesendet. Bitte E-Mail prüfen.',
    resendFailed: 'Code konnte nicht erneut gesendet werden',
    pageTitle: 'E-Mail-Bestätigung',
    verified: 'E-Mail bestätigt!',
    redirecting: 'Weiterleitung zum Dashboard...',
    enterCode: '6-stelligen Code eingeben',
    sentTo: 'Wir haben ihn an ',
    checking: 'Prüfen...',
    confirm: 'Bestätigen',
    resendIn: 'Code erneut senden in ',
    resendCooldownSuffix: 's',
    resendNow: 'Keine E-Mail erhalten? Erneut senden',
    back: '← Zurück zur Anmeldung',
  },
};

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loadUser } = useAuth();
  const [locale] = useState(detectLocale());
  const t = getTranslation(locale);
  const vt = V_STR[locale];

  // Email priority: query param > logged in user > redirect
  const [email, setEmail] = useState<string>('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendingMsg, setResendingMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const queryEmail = searchParams.get('email');
    if (queryEmail) {
      setEmail(queryEmail);
    } else if (user?.email) {
      setEmail(user.email);
    } else {
      // try loadUser
      loadUser();
    }
  }, []);

  useEffect(() => {
    if (!email && user?.email) setEmail(user.email);
  }, [user]);

  // If already verified — redirect to dashboard
  useEffect(() => {
    if (user?.emailVerifiedAt) {
      router.push('/dashboard');
    }
  }, [user]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleDigitChange = (idx: number, value: string) => {
    // Only digits, max 1 char
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    setError(null);

    // Auto-advance
    if (v && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }

    // Auto-submit when all 6 filled
    if (v && idx === 5 && next.every(d => d)) {
      submitCode(next.join(''));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace on empty: go back
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    if (pasted.length === 6) {
      submitCode(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const submitCode = useCallback(async (code: string) => {
    if (!email) {
      setError(vt.emailNotFound);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.verifyEmail(email, code);
      setSuccess(true);
      // Refresh user
      await loadUser();
      // Wait for visual feedback then redirect
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) {
      setError(err?.message || vt.invalidCode);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }, [email, router, loadUser]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendingMsg(null);
    setError(null);
    try {
      await api.resendVerificationCode();
      setResendingMsg(vt.codeResent);
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err: any) {
      setError(err?.message || vt.resendFailed);
    }
  };

  const isComplete = digits.every(d => d);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-950/30 via-dark-900 to-dark-900" />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="text-center mb-8 animate-fade-in">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl sm:text-6xl font-display font-black tracking-tighter">
              <span className="text-white">30</span>
              <span className="bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">sec</span>
              <span className="text-accent-400">.</span>
            </h1>
          </Link>
          <p className="text-white/30 mt-3 text-sm font-medium">{vt.pageTitle}</p>
        </div>

        <div className="card-glass animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          {success ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="text-5xl mb-3">✓</div>
              <div className="text-xl font-bold text-green-400 mb-2">{vt.verified}</div>
              <div className="text-white/50 text-sm">{vt.redirecting}</div>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <div className="text-white text-base font-semibold mb-1">{vt.enterCode}</div>
                <div className="text-white/50 text-xs leading-relaxed">
                  {vt.sentTo}<span className="text-brand-400 font-mono">{email || '...'}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm animate-shake">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-center mb-4">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    disabled={submitting}
                    className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-black font-mono bg-white/5 border rounded-xl text-white focus:outline-none focus:border-brand-500/60 focus:bg-white/10 transition ${
                      d ? 'border-brand-500/40' : 'border-white/10'
                    } ${submitting ? 'opacity-50' : ''}`}
                  />
                ))}
              </div>

              <button
                onClick={() => submitCode(digits.join(''))}
                disabled={!isComplete || submitting}
                className="btn-primary w-full text-center justify-center text-base mt-2"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {vt.checking}
                  </span>
                ) : vt.confirm}
              </button>

              <div className="mt-5 pt-4 border-t border-white/[0.05] text-center">
                {resendingMsg && (
                  <div className="text-green-400 text-xs mb-2">{resendingMsg}</div>
                )}
                {resendCooldown > 0 ? (
                  <div className="text-white/40 text-xs">
                    {vt.resendIn}<span className="font-mono text-white/60">{resendCooldown}</span>{vt.resendCooldownSuffix}
                  </div>
                ) : (
                  <button onClick={handleResend} className="text-brand-400 hover:text-brand-300 text-xs font-medium">
                    {vt.resendNow}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 text-center text-white/30 text-xs">
          <Link href="/auth/login" className="hover:text-white/60">{vt.back}</Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
