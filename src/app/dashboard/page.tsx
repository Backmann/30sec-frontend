'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { detectLocale, getTranslation } from '@/lib/i18n';
import NotificationBell from '@/components/NotificationBell';

function Countdown({ target }: { target: string }) {
  const [diff, setDiff] = useState(0);
  useEffect(() => { const calc = () => setDiff(Math.max(0, new Date(target).getTime() - Date.now())); calc(); const iv = setInterval(calc, 1000); return () => clearInterval(iv); }, [target]);
  if (diff <= 0) return <span className="text-green-400 text-sm font-semibold animate-pulse">Готов к старту!</span>;
  const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
  return (<div className="flex gap-2 text-center">
    {d > 0 && <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5"><div className="text-lg font-black font-mono text-brand-400">{d}</div><div className="text-[9px] text-white/25 uppercase">дн</div></div>}
    <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5"><div className="text-lg font-black font-mono text-brand-400">{String(h).padStart(2,'0')}</div><div className="text-[9px] text-white/25 uppercase">час</div></div>
    <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5"><div className="text-lg font-black font-mono text-accent-400">{String(m).padStart(2,'0')}</div><div className="text-[9px] text-white/25 uppercase">мин</div></div>
    <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5"><div className="text-lg font-black font-mono text-white/50">{String(s).padStart(2,'0')}</div><div className="text-[9px] text-white/25 uppercase">сек</div></div>
  </div>);
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loadUser, logout } = useAuth();
  const [locale] = useState(detectLocale());
  const t = getTranslation(locale);
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

  const getMyStatus = (tr: any) => {
    const p = tr.participants?.find((p: any) => p.userId === user.id);
    if (!p) return null;
    return p.matchStatus;
  };

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
              <div className="text-amber-400 font-semibold text-sm">Подтвердите email</div>
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

        {upcoming.length > 0 && <section className="mb-10 animate-slide-up" style={{animationDelay:'0.05s',animationFillMode:'both'}}><h3 className="section-title mb-4"><span className="text-accent-400">⏳</span> Предстоящие турниры</h3><div className="grid gap-4 sm:grid-cols-2">{upcoming.map(tr => {
          const st = getMyStatus(tr);
          return <div key={tr.id} className="card-glow"><div className="flex items-start justify-between mb-3"><div><h4 className="text-white font-bold text-lg">{tr.title}</h4><div className="flex gap-2 text-white/30 text-xs mt-1"><span>{tr.type}</span><span>{(tr.participants||[]).filter((p:any)=>['APPROVED','PLAYING'].includes(p.matchStatus)).length} участников</span></div></div><span className="badge-draft">DRAFT</span></div><div className="flex items-center justify-between mt-4"><span className="text-white/20 text-xs">До начала:</span><Countdown target={tr.startAt} /></div>
          {isAdmin ? <button onClick={() => router.push('/admin')} className="btn-secondary w-full mt-4 text-center text-sm">⚙️ Управлять турниром</button>
          : st === null ? <button onClick={() => doApply(tr.id)} className="btn-primary w-full mt-4 text-center text-sm">Подать заявку</button>
          : st === 'PENDING' ? <div className="w-full mt-4 text-center text-sm bg-amber-500/10 border border-amber-500/20 rounded-2xl py-3 text-amber-400">⏳ Заявка отправлена</div>
          : st === 'APPROVED' ? <div className="mt-4 space-y-2">
              <div className="w-full text-center text-sm bg-green-500/10 border border-green-500/20 rounded-2xl py-3 text-green-400">✅ Заявка одобрена</div>
              <button onClick={(e) => { e.stopPropagation(); router.push(`/game/${tr.id}`); }} className="btn-primary w-full text-center text-sm">🚪 Войти в зал ожидания</button>
              <div className="text-center text-xs text-white/40">Уже можно заходить — админ запустит игру, когда все будут готовы</div>
            </div>
          : st === 'REJECTED' ? <div className="w-full mt-4 text-center text-sm bg-red-500/10 border border-red-500/20 rounded-2xl py-3 text-red-400">✗ Заявка отклонена</div>
          : null}
          </div>;
        })}</div></section>}

        {live.length > 0 && <section className="mb-10 animate-slide-up" style={{animationDelay:'0.1s',animationFillMode:'both'}}><h3 className="section-title mb-4"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live</h3><div className="grid gap-4 sm:grid-cols-2">{live.map(tr => <div key={tr.id} className="card-glow group cursor-pointer" onClick={() => router.push(`/game/${tr.id}`)}><div className="flex items-start justify-between mb-4"><div><h4 className="text-white font-bold text-lg group-hover:text-brand-400 transition-colors">{tr.title}</h4><div className="flex gap-3 text-white/30 text-sm mt-1"><span>{tr._count?.participants || 0} players</span><span>{tr.type}</span></div></div><span className="badge-live">LIVE</span></div>{(() => { const myP = user ? tr.participants?.find((p: any) => p.userId === user.id) : null; const ms = myP?.matchStatus; return ms === 'WON' ? <div><div className="w-full text-center text-sm bg-green-500/10 border border-green-500/20 rounded-2xl py-3 text-green-400 mb-2">{String.fromCodePoint(0x1F3C6)} Победа! ({myP.currentScoreUser}:{myP.currentScoreSystem})</div><button className="btn-secondary w-full text-center text-sm" onClick={e => { e.stopPropagation(); router.push('/watch/'+tr.id); }}>Смотреть турнир</button></div> : ms === 'LOST' ? <div><div className="w-full text-center text-sm bg-red-500/10 border border-red-500/20 rounded-2xl py-3 text-red-400 mb-2">Поражение ({myP.currentScoreUser}:{myP.currentScoreSystem})</div><button className="btn-secondary w-full text-center text-sm" onClick={e => { e.stopPropagation(); router.push('/watch/'+tr.id); }}>Смотреть турнир</button></div> : ms === 'FINISHED' ? <div><div className="w-full text-center text-sm bg-white/5 border border-white/10 rounded-2xl py-3 text-white/50 mb-2">Завершено ({myP.currentScoreUser}:{myP.currentScoreSystem})</div><button className="btn-secondary w-full text-center text-sm" onClick={e => { e.stopPropagation(); router.push('/watch/'+tr.id); }}>Смотреть турнир</button></div> : isAdmin ? <div className="flex gap-2"><button className="btn-primary flex-1 text-center" onClick={e => { e.stopPropagation(); router.push('/admin'); }}>⚙️ Судить</button><button className="btn-secondary text-center" onClick={e => { e.stopPropagation(); router.push('/watch/'+tr.id); }}>Наблюдать</button></div> : <div className="flex gap-2"><button className="btn-primary flex-1 text-center" onClick={e => { e.stopPropagation(); router.push('/game/'+tr.id); }}>{t.home.play} →</button><button className="btn-secondary text-center" onClick={e => { e.stopPropagation(); router.push('/watch/'+tr.id); }}>Смотреть</button></div>; })()}</div>)}</div></section>}

        <section className="animate-slide-up" style={{animationDelay:'0.2s',animationFillMode:'both'}}><h3 className="section-title mb-4">Завершённые (последняя неделя)</h3>{recent.length === 0 ? <div className="card text-center py-12"><div className="text-4xl mb-3 opacity-20">🏆</div><p className="text-white/30 text-sm">Нет завершённых турниров</p></div> : <div className="space-y-2">{recent.map(tr => <div key={tr.id} className="card-hover flex items-center justify-between"><div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => router.push(`/watch/${tr.id}`)}><div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg shrink-0">🏆</div><div><h4 className="text-white font-medium">{tr.title}</h4><div className="flex gap-2 text-white/30 text-xs mt-0.5"><span>{tr.type}</span><span>{tr._count?.participants||0} players</span></div></div></div><div className="flex items-center gap-2"><button onClick={e => { e.stopPropagation(); router.push(`/vote/${tr.id}`); }} className="px-3 py-1.5 rounded-xl bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 text-xs font-semibold transition">⭐ Лучший вопрос</button><span className="badge-finished">Finished</span></div></div>)}</div>}</section>
      </main>
    </div>
  );
}
