'use client';
import Footer from '@/components/Footer';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { detectLocale, getTranslation, Locale } from '@/lib/i18n';

const STEPS_BY_LOCALE: Record<Locale, { title: string; desc: string }[]> = {
  ru: [
    { title: 'Подай заявку', desc: 'Запишись на ближайший турнир. Админ одобрит твою заявку до старта.' },
    { title: 'Зайди в зал ожидания', desc: 'За 5 минут до начала откроется кнопка входа. Все игроки заходят вместе.' },
    { title: 'Играй', desc: 'Один вопрос. 30 секунд. Один ответ. Без подсказок.' },
    { title: 'Поднимайся в рейтинге', desc: 'Каждая победа — очки в твой ранг. Прогресс виден, цели понятны.' },
  ],
  en: [
    { title: 'Apply', desc: 'Sign up for the next tournament. The host will approve your entry before kickoff.' },
    { title: 'Enter the lobby', desc: 'A button appears 5 minutes before start. All players go in together.' },
    { title: 'Play', desc: 'One question. 30 seconds. One answer. No hints.' },
    { title: 'Climb the ranks', desc: 'Every win adds points to your rank. Clear progress, clear goals.' },
  ],
  de: [
    { title: 'Bewerben', desc: 'Melde dich für das nächste Turnier an. Der Host genehmigt deine Anmeldung vor dem Start.' },
    { title: 'In die Lobby', desc: '5 Minuten vor Start erscheint der Button. Alle Spieler kommen gemeinsam rein.' },
    { title: 'Spiel', desc: 'Eine Frage. 30 Sekunden. Eine Antwort. Keine Hinweise.' },
    { title: 'Im Ranking aufsteigen', desc: 'Jeder Sieg bringt Punkte für deinen Rang. Klarer Fortschritt, klare Ziele.' },
  ],
};

const HOWITWORKS_TITLE: Record<Locale, string> = {
  ru: 'Как это работает',
  en: 'How it works',
  de: 'So funktioniert es',
};

export default function Home() {
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const [locale, setLocale] = useState<Locale>('ru');
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  // Refs to background glow layers — direct DOM update on mousemove avoids
  // a React re-render of the whole homepage 60+ times per second, which
  // was causing scroll jank in production (page would scroll down, jump
  // back up, then freeze). We never read these refs in JSX so no re-render.
  const glow1Ref = useRef<HTMLDivElement>(null);
  const glow2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocale(detectLocale());
    setMounted(true);
    loadUser();
  }, []);

  // Subtle mouse-follow parallax for the background glow.
  // Throttled via requestAnimationFrame and applied directly to DOM —
  // does NOT trigger React re-renders. Range is intentionally tiny (max
  // ±20px) — premium feel, no scroll-coupling jank.
  useEffect(() => {
    let frame = 0;
    let nextX = 0;
    let nextY = 0;
    const apply = () => {
      frame = 0;
      if (glow1Ref.current) {
        glow1Ref.current.style.transform =
          `translate(calc(-50% + ${nextX}px), ${nextY}px)`;
      }
      if (glow2Ref.current) {
        glow2Ref.current.style.transform =
          `translate(${-nextX * 0.5}px, ${-nextY * 0.5}px)`;
      }
    };
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      nextX = ((e.clientX - cx) / cx) * 20;
      nextY = ((e.clientY - cy) / cy) * 20;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const t = getTranslation(locale);
  const steps = STEPS_BY_LOCALE[locale];

  const switchLocale = (lang: Locale) => {
    setLocale(lang);
    localStorage.setItem('locale', lang);
  };

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background layers */}
      <div className="absolute inset-0 bg-dark-900 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-950/40 via-dark-900 to-dark-900 pointer-events-none" />
      <div
        ref={glow1Ref}
        className="absolute top-[-20%] left-1/2 w-[800px] h-[800px] bg-brand-600/[0.07] rounded-full blur-[150px] animate-glow-pulse pointer-events-none"
        style={{ transform: 'translate(-50%, 0)', transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform' }}
      />
      <div
        ref={glow2Ref}
        className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-accent-500/[0.04] rounded-full blur-[100px] pointer-events-none"
        style={{ transition: 'transform 800ms cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform' }}
      />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Top bar */}
      <nav className="relative z-20 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="text-2xl font-display font-extrabold">
          <span className="text-white">30</span>
          <span className="text-brand-400">sec</span>
          <span className="text-accent-400">.</span>
        </div>

        <div className="flex items-center gap-2">
          {(['en', 'de', 'ru'] as const).map((lang) => (
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
      <main ref={heroRef} className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="text-center max-w-2xl mx-auto">
          {/* Logo with subtle breathing */}
          <div className="mb-6 animate-fade-in">
            <h1 className="text-[5.5rem] sm:text-[7rem] md:text-[8.5rem] font-display font-black tracking-tighter leading-none animate-breathe">
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
              (user.role === 'ADMIN' || user.role === 'SUPERADMIN') ? (
                <button onClick={() => router.push('/admin')}
                  className="btn-primary text-lg px-10 py-4 hover:scale-[1.02] transition-transform">
                  ⚙️ {t.nav.admin} →
                </button>
              ) : (
                <button onClick={() => router.push('/dashboard')}
                  className="btn-primary text-lg px-10 py-4 hover:scale-[1.02] transition-transform">
                  {t.home.play} →
                </button>
              )
            ) : (
              <>
                <button onClick={() => router.push('/auth/login')}
                  className="btn-primary text-lg px-10 py-4 hover:scale-[1.02] transition-transform">
                  {t.auth.loginBtn} →
                </button>
                <button onClick={() => router.push('/auth/register')}
                  className="btn-secondary text-lg px-10 py-4 hover:scale-[1.02] transition-transform">
                  {t.auth.registerBtn}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Value pillars — words instead of numbers. Numbers (12, 23, etc.)
            were technically misleading on the hero; words capture the
            essence of the format without forcing the visitor to do math. */}
        <div className="mt-20 flex gap-10 sm:gap-16 justify-center animate-slide-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          {[
            {
              top: locale === 'de' ? 'Schnell' : locale === 'en' ? 'Fast' : 'Быстро',
              sub: locale === 'de' ? '30 Sekunden' : locale === 'en' ? '30 seconds' : '30 секунд',
            },
            {
              top: locale === 'de' ? 'Fair' : locale === 'en' ? 'Fair' : 'Честно',
              sub: locale === 'de' ? 'Ohne Hinweise' : locale === 'en' ? 'No hints' : 'Без подсказок',
            },
            {
              top: locale === 'de' ? 'Gemeinsam' : locale === 'en' ? 'Together' : 'Вместе',
              sub: locale === 'de' ? 'Live-Turnier' : locale === 'en' ? 'Live tournament' : 'Live-турнир',
            },
          ].map((pillar) => (
            <div key={pillar.top} className="text-center group">
              <div className="text-xl sm:text-2xl font-bold text-white/70 group-hover:text-brand-400 transition-colors duration-500 tracking-wide">
                {pillar.top}
              </div>
              <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/25 mt-1.5 font-medium">
                {pillar.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <button
          onClick={scrollToHowItWorks}
          aria-label={HOWITWORKS_TITLE[locale]}
          className="mt-16 flex flex-col items-center gap-2 text-white/25 hover:text-white/60 transition-colors animate-fade-in"
          style={{ animationDelay: '0.6s', animationFillMode: 'both' }}
        >
          <span className="text-[11px] uppercase tracking-[0.25em]">{HOWITWORKS_TITLE[locale]}</span>
          <span className="w-5 h-8 rounded-full border border-current flex items-start justify-center pt-1.5">
            <span className="w-0.5 h-1.5 rounded-full bg-current animate-bounce-soft" />
          </span>
        </button>
      </main>

      {/* How it works — second screen */}
      <section id="how-it-works" className="relative z-10 px-6 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-center mb-3 text-white">
            {HOWITWORKS_TITLE[locale]}
          </h2>
          <p className="text-center text-white/40 text-sm sm:text-base mb-14 max-w-xl mx-auto">
            {locale === 'ru' && '4 шага от регистрации до первой победы'}
            {locale === 'en' && '4 steps from sign-up to your first win'}
            {locale === 'de' && '4 Schritte von der Anmeldung bis zum ersten Sieg'}
          </p>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="relative group rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 hover:border-brand-500/30 hover:bg-white/[0.04] transition-all duration-500 hover:-translate-y-1"
              >
                {/* Step number — large, faint */}
                <div className="absolute top-3 right-4 text-5xl font-black font-mono text-white/[0.04] group-hover:text-brand-400/20 transition-colors duration-500 leading-none select-none">
                  {idx + 1}
                </div>
                <div className="relative">
                  <div className="text-xs uppercase tracking-[0.2em] text-brand-400 font-semibold mb-3">
                    {locale === 'ru' && `Шаг ${idx + 1}`}
                    {locale === 'en' && `Step ${idx + 1}`}
                    {locale === 'de' && `Schritt ${idx + 1}`}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA in this section */}
          {!user && (
            <div className="mt-14 text-center">
              <button onClick={() => router.push('/auth/register')}
                className="btn-primary text-base px-8 py-3 hover:scale-[1.02] transition-transform">
                {locale === 'ru' && 'Создать аккаунт →'}
                {locale === 'en' && 'Create account →'}
                {locale === 'de' && 'Konto erstellen →'}
              </button>
            </div>
          )}
        </div>

        <Footer />
      </section>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
    </div>
  );
}
