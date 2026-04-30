'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { detectLocale, getTranslation, Locale } from '@/lib/i18n';
import NotificationBell from '@/components/NotificationBell';
import QueueJoinWidget from '@/components/QueueJoinWidget';
import TournamentCardCTA from '@/components/TournamentCardCTA';

const D_STR: Record<Locale, {
  startsNow: string;
  d: string; h: string; m: string; s: string;
  verifyEmailTitle: string;
  beforeStart: string;
  finishedThisWeek: string;
  noFinished: string;
  bestQuestion: string;
  players: string;
  finished: string;
}> = {
  ru: {
    startsNow: 'Готов к старту!',
    d: 'дн', h: 'час', m: 'мин', s: 'сек',
    verifyEmailTitle: 'Подтвердите email',
    beforeStart: 'До начала:',
    finishedThisWeek: 'Завершённые (последняя неделя)',
    noFinished: 'Нет завершённых турниров',
    bestQuestion: '⭐ Лучший вопрос',
    players: 'игроков',
    finished: 'Завершён',
  },
  en: {
    startsNow: 'Ready to start!',
    d: 'd', h: 'h', m: 'min', s: 'sec',
    verifyEmailTitle: 'Verify your email',
    beforeStart: 'Starts in:',
    finishedThisWeek: 'Finished (this week)',
    noFinished: 'No finished tournaments',
    bestQuestion: '⭐ Best question',
    players: 'players',
    finished: 'Finished',
  },
  de: {
    startsNow: 'Bereit zum Start!',
    d: 'T', h: 'Std', m: 'Min', s: 'Sek',
    verifyEmailTitle: 'E-Mail bestätigen',
    beforeStart: 'Beginnt in:',
    finishedThisWeek: 'Beendet (diese Woche)',
    noFinished: 'Keine beendeten Turniere',
    bestQuestion: '⭐ Beste Frage',
    players: 'Spieler',
    finished: 'Beendet',
  },
};

function Countdown({ target, locale }: { target: string; locale: Locale }) {
  const ds = D_STR[locale];
  const [diff, setDiff] = useState(0);
  useEffect(() => { const calc = () => setDiff(Math.max(0, new Date(target).getTime() - Date.now())); calc(); const iv = setInterval(calc, 1000); return () => clearInterval(iv); }, [target]);
  if (diff <= 0) return <span className="text-green-400 text-sm font-semibold animate-pulse">{ds.startsNow}</span>;
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
  return (<div className="flex gap-2 text-center">
    {d > 0 && <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5"><div className="text-lg font-black font-mono text-brand-400">{d}</div><div className="text-[9px] text-white/25 uppercase">{ds.d}</div></div>}
    <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5"><div className="text-lg font-black font-mono text-brand-400">{String(h).padStart(2,'0')}</div><div className="text-[9px] text-white/25 uppercase">{ds.h}</div></div>
    <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5"><div className="text-lg font-black font-mono text-accent-400">{String(m).padStart(2,'0')}</div><div className="text-[9px] text-white/25 uppercase">{ds.m}</div></div>
    <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5"><div className="text-lg font-black font-mono text-white/50">{String(s).padStart(2,'0')}</div><div className="text-[9px] text-white/25 uppercase">{ds.s}</div></div>
  </div>);
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loadUser, logout } = useAuth();
  const [locale] = useState(detectLocale());
  const t = getTranslation(locale);
  const ds = D_STR[locale];
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mob, setMob] = useState(false);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const refresh = () => api.getTournaments().then(setTournaments).catch(() => {});
  useEffect(() => { loadUser().then(() => setLoading(false)); refresh(); }, []);
  useEffect(() => { if (user) api.getMyStats().then(setStats).catch(() => {}); }, [user]);
  useEffect(() => { if (!loading && !user) router.push('/auth/login'); }, [loading, user]);
  // Poll for updates every 5 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      api.getTournaments().then(setTournaments).catch(() => {});
    }, 15000);
    return () => clearInterval(iv);
  }, [user]);

  // Track which tournaments user has applied to
  useEffect(() => {
    if (user && tournaments.length) {
      const myApps = new Set<string>();
      tournaments.forEach(t => {
        const p = t.participants?.find((p: any) => p.userId === user.id);
        if (p) myApps.add(t.id);
      });
      setApplied(myApps);
    }
  }, [user, tournaments]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /><span className="text-white/30 text-sm ml-3">{t.common.loading}</span></div>;

  const live = tournaments.filter(x => x.status === 'LIVE');
  const upcoming = tournaments.filter(x => (x.status === 'DRAFT' || x.status === 'SCHEDULED') && x.startAt);
  const wk = new Date(Date.now() - 7 * 86400000);
  const recent = tournaments.filter(x => x.status === 'FINISHED' && new Date(x.endAt || x.createdAt) > wk);
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  const ps = stats?.playerStats;

  const doApply = async (tid: string) => {
    try { await api.joinTournament(tid); setApplied(prev => new Set(prev).add(tid)); refresh(); } catch(e:any) { alert(e.message); }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50"><div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"><div className="flex items-center gap-6"><h1 className="text-xl font-display font-black tracking-tight cursor-pointer" onClick={() => router.push('/')}><span className="text-white">30</span><span className="text-brand-400">sec</span><span className="text-accent-400">.</span></h1><nav className="hidden sm:flex items-center gap-1"><button className="nav-link-active">{t.nav.home}</button><button onClick={() => router.push('/leaderboard')} className="nav-link">{t.nav.leaderboard}</button>{isAdmin && <button onClick={() => router.push('/admin')} className="nav-link text-accent-400">{t.nav.admin}</button>}</nav></div><div className="flex items-center gap-3"><button onClick={() => router.push('/profile')} className="hidden sm:block text-right hover:opacity-80"><div className="text-sm font-semibold text-brand-400">{user.profile?.nickname}</div><div className="text-[10px] text-white/30 uppercase">{user.role}</div></button><NotificationBell /><button onClick={() => { logout(); router.push('/'); }} className="btn-icon text-xs"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg></button><button onClick={() => setMob(!mob)} className="sm:hidden btn-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{mob ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M3 12h18M3 6h18M3 18h18"/>}</svg></button></div></div>{mob && <div className="sm:hidden border-t border-white/[0.06] px-4 py-3 space-y-1"><button onClick={() => setMob(false)} className="nav-link-active w-full text-left">{t.nav.home}</button><button onClick={() => { router.push('/leaderboard'); setMob(false); }} className="nav-link w-full text-left">{t.nav.leaderboard}</button><button onClick={() => { router.push('/profile'); setMob(false); }} className="nav-link w-full text-left">{t.nav.profile}</button>{isAdmin && <button onClick={() => { router.push('/admin'); setMob(false); }} className="nav-link text-accent-400 w-full text-left">{t.nav.admin}</button>}</div>}</header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {!user.emailVerifiedAt && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-in">
            <div className="text-2xl shrink-0">📧</div>
            <div className="flex-1">
              <div className="text-amber-400 font-semibold text-sm">{ds.verifyEmailTitle}</div>
              <div className="text-white/60 text-xs mt-0.5">
                Чтобы участвовать в турнирах и создавать вопросы, подтвердите свой email
              </div>
            </div>
            <button onClick={() => router.push('/auth/verify-email')} className="btn-primary text-xs whitespace-nowrap shrink-0">
              Подтвердить →
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-in"><div><h2 className="text-2xl sm:text-3xl font-display font-bold text-white">{t.home.welcome}, <span className="text-brand-400">{user.profile?.nickname}</span></h2><p className="text-white/30 mt-1 text-sm">{t.home.subtitle}</p></div>{!isAdmin && ps && ps.totalAnswered > 0 && <div className="flex gap-4">{[{v:ps.totalCorrect,l:'✓',c:'text-green-400'},{v:`${ps.accuracyPercent}%`,l:'ACC',c:'text-brand-400'},{v:ps.bestStreak,l:'🔥',c:'text-accent-400'}].map((s,i)=><div key={i} className="text-center px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className={`text-lg font-bold font-mono ${s.c}`}>{s.v}</div><div className="text-[10px] text-white/30">{s.l}</div></div>)}</div>}</div>

        {!isAdmin && <QueueJoinWidget />}

        {upcoming.length > 0 && <section className="mb-10 animate-slide-up" style={{animationDelay:'0.05s',animationFillMode:'both'}}><h3 className="section-title mb-4"><span className="text-accent-400">⏳</span> Предстоящие турниры</h3><div className="grid gap-4 sm:grid-cols-2">{upcoming.map(tr => (
          <div key={tr.id} className="card-glow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-white font-bold text-lg">{tr.title}</h4>
                <div className="flex gap-2 text-white/30 text-xs mt-1">
                  <span>{tr.type}</span>
                  <span>{(tr.participants||[]).filter((p:any)=>['APPROVED','PLAYING'].includes(p.matchStatus)).length} участников</span>
                </div>
              </div>
              <span className="badge-draft">DRAFT</span>
            </div>
            <div className="flex items-center justify-between mt-4 mb-4">
              <span className="text-white/20 text-xs">{ds.beforeStart}</span>
              <Countdown target={tr.startAt} locale={locale} />
            </div>
            <TournamentCardCTA tr={tr} user={user} onApply={doApply} />
          </div>
        ))}</div></section>}

        {live.length > 0 && <section className="mb-10 animate-slide-up" style={{animationDelay:'0.1s',animationFillMode:'both'}}><h3 className="section-title mb-4"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live</h3><div className="grid gap-4 sm:grid-cols-2">{live.map(tr => (
          <div key={tr.id} className="card-glow group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-white font-bold text-lg">{tr.title}</h4>
                <div className="flex gap-3 text-white/30 text-sm mt-1">
                  <span>{tr._count?.participants || 0} {ds.players}</span>
                  <span>{tr.type}</span>
                </div>
              </div>
              <span className="badge-live">LIVE</span>
            </div>
            <TournamentCardCTA tr={tr} user={user} />
          </div>
        ))}</div></section>}

        <section className="animate-slide-up" style={{animationDelay:'0.2s',animationFillMode:'both'}}><h3 className="section-title mb-4">{ds.finishedThisWeek}</h3>{recent.length === 0 ? <div className="card text-center py-12"><div className="text-4xl mb-3 opacity-20">🏆</div><p className="text-white/30 text-sm">{ds.noFinished}</p></div> : <div className="space-y-2">{recent.map(tr => <div key={tr.id} className="card-hover flex items-center justify-between"><div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => router.push(`/watch/${tr.id}`)}><div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg shrink-0">🏆</div><div><h4 className="text-white font-medium">{tr.title}</h4><div className="flex gap-2 text-white/30 text-xs mt-0.5"><span>{tr.type}</span><span>{tr._count?.participants||0} {ds.players}</span></div></div></div><div className="flex items-center gap-2"><button onClick={e => { e.stopPropagation(); router.push(`/vote/${tr.id}`); }} className="px-3 py-1.5 rounded-xl bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 text-xs font-semibold transition">{ds.bestQuestion}</button><span className="badge-finished">{ds.finished}</span></div></div>)}</div>}</section>
      </main>
    </div>
  );
}
