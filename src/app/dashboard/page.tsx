'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { detectLocale, getTranslation } from '@/lib/i18n';

const THEME_ICONS: Record<string, string> = {
  detective: '🔍', history: '📜', science: '🔬', language: '📝',
  logic: '🧩', visual: '🖼️', mixed: '🎲',
};

const THEMES = [
  { value: '', label: 'Все', icon: '🎯' },
  { value: 'detective', label: 'Детектив', icon: '🔍' },
  { value: 'history', label: 'История', icon: '📜' },
  { value: 'science', label: 'Наука', icon: '🔬' },
  { value: 'language', label: 'Язык', icon: '📝' },
  { value: 'logic', label: 'Логика', icon: '🧩' },
  { value: 'visual', label: 'Визуал', icon: '🖼️' },
  { value: 'mixed', label: 'Микс', icon: '🎲' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loadUser, logout } = useAuth();
  const [locale, setLocale] = useState(detectLocale());
  const t = getTranslation(locale);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [themeFilter, setThemeFilter] = useState('');

  useEffect(() => {
    loadUser().then(() => setLoading(false));
    api.getTournaments().then(setTournaments).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) api.getMyStats().then(setStats).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/30 text-sm">{t.common.loading}</span>
        </div>
      </div>
    );
  }

  const liveTournaments = tournaments.filter((x) => x.status === 'LIVE');
  const otherTournaments = tournaments.filter((x) => x.status !== 'LIVE');
  const filteredOther = themeFilter
    ? otherTournaments.filter((x) => x.theme === themeFilter)
    : otherTournaments;
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  const playerStats = stats?.playerStats;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'LIVE': return <span className="badge-live">LIVE</span>;
      case 'FINISHED': return <span className="badge-finished">Finished</span>;
      case 'SCHEDULED': return <span className="badge-accent">Scheduled</span>;
      default: return <span className="badge-draft">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-display font-black tracking-tight cursor-pointer" onClick={() => router.push('/')}>
              <span className="text-white">30</span>
              <span className="text-brand-400">sec</span>
              <span className="text-accent-400">.</span>
            </h1>
            <nav className="hidden sm:flex items-center gap-1">
              <button className="nav-link-active">{t.nav.home}</button>
              <button onClick={() => router.push('/leaderboard')} className="nav-link">{t.nav.leaderboard}</button>
              {isAdmin && (
                <button onClick={() => router.push('/admin')} className="nav-link text-accent-400 hover:text-accent-300">{t.nav.admin}</button>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 mr-2">
              <button onClick={() => router.push('/profile')} className="text-right hover:opacity-80 transition-opacity">
                <div className="text-sm font-semibold text-brand-400">{user.profile?.nickname}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider">{user.role}</div>
              </button>
            </div>
            <button onClick={() => { logout(); router.push('/'); }} className="btn-icon text-xs" title={t.nav.logout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
            <button onClick={() => setMobileNav(!mobileNav)} className="sm:hidden btn-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileNav ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M3 12h18M3 6h18M3 18h18"/>}
              </svg>
            </button>
          </div>
        </div>
        {mobileNav && (
          <div className="sm:hidden border-t border-white/[0.06] px-4 py-3 space-y-1 animate-slide-down">
            <button onClick={() => setMobileNav(false)} className="nav-link-active w-full text-left">{t.nav.home}</button>
            <button onClick={() => { router.push('/leaderboard'); setMobileNav(false); }} className="nav-link w-full text-left">{t.nav.leaderboard}</button>
            <button onClick={() => { router.push('/profile'); setMobileNav(false); }} className="nav-link w-full text-left">{t.nav.profile}</button>
            {isAdmin && (
              <button onClick={() => { router.push('/admin'); setMobileNav(false); }} className="nav-link text-accent-400 w-full text-left">{t.nav.admin}</button>
            )}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Welcome + quick stats */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
              {t.home.welcome}, <span className="text-brand-400">{user.profile?.nickname}</span>
            </h2>
            <p className="text-white/30 mt-1 text-sm">{t.home.subtitle}</p>
          </div>
          {playerStats && playerStats.totalAnswered > 0 && (
            <div className="flex gap-4">
              {[
                { value: playerStats.totalCorrect, label: '✓', color: 'text-green-400' },
                { value: `${playerStats.accuracyPercent}%`, label: 'ACC', color: 'text-brand-400' },
                { value: playerStats.bestStreak, label: '🔥', color: 'text-accent-400' },
              ].map((s, i) => (
                <div key={i} className="text-center px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-white/30">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live tournaments */}
        {liveTournaments.length > 0 && (
          <section className="mb-10 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <h3 className="section-title mb-4">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Live
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {liveTournaments.map((tr) => (
                <div key={tr.id} className="card-glow group cursor-pointer" onClick={() => router.push(`/game/${tr.id}`)}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-white font-bold text-lg group-hover:text-brand-400 transition-colors">{tr.title}</h4>
                      <div className="flex gap-3 text-white/30 text-sm mt-1 flex-wrap">
                        <span>{tr._count?.participants || 0} players</span>
                        <span>{tr.type}</span>
                        {tr.theme && (
                          <span className="badge-accent text-[10px]">{THEME_ICONS[tr.theme] || '🎯'} {tr.theme}</span>
                        )}
                      </div>
                    </div>
                    {statusBadge(tr.status)}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1 text-center"
                      onClick={(e) => { e.stopPropagation(); router.push(`/game/${tr.id}`); }}>
                      {t.home.play} →
                    </button>
                    <button className="btn-secondary text-center"
                      onClick={(e) => { e.stopPropagation(); router.push(`/watch/${tr.id}`); }}>
                      👁 {t.home.watch}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All tournaments */}
        <section className="animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <h3 className="section-title mb-4">{t.nav.tournaments}</h3>

          {/* Theme filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {THEMES.map((th) => (
              <button key={th.value} onClick={() => setThemeFilter(th.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${
                  themeFilter === th.value
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20 font-semibold'
                    : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white hover:bg-white/[0.06]'
                }`}>
                <span>{th.icon}</span> {th.label}
              </button>
            ))}
          </div>

          {tournaments.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-4xl mb-3 opacity-30">🏆</div>
              <p className="text-white/30">{t.tournament.noTournaments}</p>
            </div>
          ) : filteredOther.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-white/30 text-sm">Нет турниров с такой темой</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOther.map((tr) => (
                <div key={tr.id} className="card-hover flex items-center justify-between"
                  onClick={() => router.push(`/game/${tr.id}`)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg shrink-0">
                      {tr.theme ? (THEME_ICONS[tr.theme] || '🎯') : '🏆'}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{tr.title}</h4>
                      <div className="flex gap-2 text-white/30 text-xs mt-0.5 flex-wrap">
                        <span>{tr.type}</span>
                        <span>{tr._count?.participants || 0} players</span>
                        {tr.theme && <span className="text-accent-400">{tr.theme}</span>}
                      </div>
                    </div>
                  </div>
                  {statusBadge(tr.status)}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
