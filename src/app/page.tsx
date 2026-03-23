'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { detectLocale, getTranslation, Locale } from '@/lib/i18n';

export default function Home() {
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const [locale, setLocale] = useState<Locale>('ru');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocale(detectLocale());
    setMounted(true);
    loadUser();
  }, []);

  const t = getTranslation(locale);

  const switchLocale = (lang: Locale) => {
    setLocale(lang);
    localStorage.setItem('locale', lang);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-dark-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-950/40 via-dark-900 to-dark-900" />
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-600/[0.07] rounded-full blur-[150px] animate-glow-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-accent-500/[0.04] rounded-full blur-[100px]" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Top bar */}
      <nav className="relative z-20 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="text-2xl font-display font-extrabold">
          <span className="text-white">30</span>
          <span className="text-brand-400">sec</span>
          <span className="text-accent-400">.</span>
        </div>

        <div className="flex items-center gap-2">
          {(['ru', 'de', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => switchLocale(lang)}
              className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-300 ${
                locale === lang
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 scale-105'
                  : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="text-center max-w-2xl mx-auto">
          {/* Logo */}
          <div className="mb-6 animate-fade-in">
            <h1 className="text-[5.5rem] sm:text-[7rem] md:text-[8.5rem] font-display font-black tracking-tighter leading-none">
              <span className="text-white">30</span>
              <span className="bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">sec</span>
              <span className="text-accent-400">.</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-lg sm:text-xl md:text-2xl text-white/50 font-light mb-10 leading-relaxed animate-slide-up"
            style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            {t.home.subtitle}
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
            style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            {user ? (
              <>
                <button onClick={() => router.push('/dashboard')}
                  className="btn-primary text-lg px-10 py-4">
                  {t.home.play} →
                </button>
                {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
                  <button onClick={() => router.push('/admin')}
                    className="btn-secondary text-lg px-10 py-4">
                    {t.nav.admin}
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={() => router.push('/auth/login')}
                  className="btn-primary text-lg px-10 py-4">
                  {t.auth.loginBtn} →
                </button>
                <button onClick={() => router.push('/auth/register')}
                  className="btn-secondary text-lg px-10 py-4">
                  {t.auth.registerBtn}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 flex gap-12 sm:gap-16 justify-center animate-slide-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          {[
            { value: '30', label: locale === 'de' ? 'Sekunden' : locale === 'en' ? 'seconds' : 'секунд' },
            { value: '12', label: locale === 'de' ? 'Punkte' : locale === 'en' ? 'points' : 'очков' },
            { value: '1', label: locale === 'de' ? 'Antwort' : locale === 'en' ? 'answer' : 'ответ' },
          ].map((stat) => (
            <div key={stat.label} className="text-center group">
              <div className="text-3xl sm:text-4xl font-black font-mono text-white/70 group-hover:text-brand-400 transition-colors duration-500">
                {stat.value}
              </div>
              <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/25 mt-1.5 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
    </div>
  );
}
