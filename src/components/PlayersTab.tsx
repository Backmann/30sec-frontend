'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function agoText(d: string | Date | null | undefined) {
  if (!d) return 'никогда';
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} дн. назад`;
  const months = Math.floor(days / 30);
  return `${months} мес. назад`;
}

export default function PlayersTab() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'cold' | 'inactive'>('all');
  const [sort, setSort] = useState<'recent' | 'registered' | 'accuracy' | 'wins' | 'tournaments'>('recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.getPlayers({ search, status, sort });
      setList(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [search, status, sort]);

  useEffect(() => {
    if (!selectedId) { setDetails(null); return; }
    setLoadingDetails(true);
    api.getPlayerDetails(selectedId).then(d => setDetails(d)).catch(() => {}).finally(() => setLoadingDetails(false));
  }, [selectedId]);

  const statusChip = (u: any) => {
    if (!u.isActive) return <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">Заблокирован</span>;
    if (u.activity.isOnline) return <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">● онлайн</span>;
    if (u.activity.isCold) return <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/10">Не заходил {u.activity.daysSinceActive}д</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20">Активен</span>;
  };

  const deviceIcon = (t: string | null) => {
    if (t === 'mobile') return '📱';
    if (t === 'tablet') return '📲';
    return '💻';
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-white mb-5">Игроки {list.length > 0 && <span className="text-white/30 text-sm font-normal">· {list.length}</span>}</h2>

      {/* Toolbar */}
      <div className="card mb-4 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Поиск по email или нику..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 h-10 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/60"
        />
        <select value={status} onChange={e => setStatus(e.target.value as any)} style={{colorScheme:'dark'}} className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          <option value="all">Все</option>
          <option value="active">Активные (7 дн.)</option>
          <option value="cold">Холодеют (7+ дн.)</option>
          <option value="inactive">Заблокированные</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as any)} style={{colorScheme:'dark'}} className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          <option value="recent">Недавно заходили</option>
          <option value="registered">Недавно зарегистрировались</option>
          <option value="accuracy">Лучшая точность</option>
          <option value="wins">Больше побед</option>
          <option value="tournaments">Больше турниров</option>
        </select>
      </div>

      {loading ? (
        <div className="card text-center py-10 text-white/40">Загрузка...</div>
      ) : list.length === 0 ? (
        <div className="card text-center py-10 text-white/40">Игроков не найдено</div>
      ) : (
        <div className="space-y-2">
          {list.map(u => (
            <div key={u.id} onClick={() => setSelectedId(u.id)} className="card hover:border-brand-500/30 cursor-pointer transition">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-lg">
                  {u.profile?.avatarUrl ? (
                    <img src={u.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (u.profile?.nickname || u.email[0]).charAt(0).toUpperCase()
                  )}
                </div>
                {/* Main */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{u.profile?.nickname || u.email}</span>
                    {u.profile?.flagCode && <span className="text-[10px] text-white/40 font-mono">{u.profile.flagCode.toUpperCase()}</span>}
                    {statusChip(u)}
                  </div>
                  <div className="text-white/40 text-xs mt-0.5 truncate">{u.email}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
                    <span className="text-white/40">🏆 <span className="text-white/70 font-medium">{u.stats.wins}</span>W / <span className="text-white/70 font-medium">{u.stats.losses}</span>L</span>
                    <span className="text-white/40">🎯 <span className="text-white/70 font-medium">{u.stats.accuracy}%</span></span>
                    <span className="text-white/40">🎮 <span className="text-white/70 font-medium">{u.stats.tournaments}</span> турниров</span>
                    {u.activity.lastSession && (
                      <span className="text-white/40 whitespace-nowrap">
                        {deviceIcon(u.activity.lastSession.deviceType)} {u.activity.lastSession.city || u.activity.lastSession.country || '?'}
                      </span>
                    )}
                    <span className="text-white/30">· {agoText(u.activity.lastSeenAt)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-white/20">→</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={() => setSelectedId(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-dark-800 border border-white/10 rounded-2xl max-w-4xl w-full my-8 animate-slide-up">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-dark-800 z-10">
              <h3 className="text-lg font-bold text-white">Карточка игрока</h3>
              <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center">✕</button>
            </div>
            <div className="p-5">
              {loadingDetails || !details ? (
                <div className="text-center py-10 text-white/40">Загрузка...</div>
              ) : (
                <div className="space-y-6">
                  {/* Profile block */}
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-2xl">
                      {details.profile?.avatarUrl ? (
                        <img src={details.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (details.profile?.nickname || details.user.email[0]).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xl font-bold text-white">{details.profile?.nickname || '—'}</div>
                      <div className="text-white/60 text-sm">{details.user.email}</div>
                      <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                        {details.user.emailVerified && <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-400">✓ Email подтверждён</span>}
                        {details.user.googleLinked && <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400">G Google</span>}
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/50">{details.user.role}</span>
                        {!details.user.isActive && <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400">Заблокирован</span>}
                      </div>
                    </div>
                  </div>

                  {/* Profile fields grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <KV label="Имя" value={details.profile?.firstName} />
                    <KV label="Фамилия" value={details.profile?.lastName} />
                    <KV label="Дата рождения" value={details.profile?.dateOfBirth ? formatDate(details.profile.dateOfBirth) : null} />
                    <KV label="Пол" value={details.profile?.gender} />
                    <KV label="Страна" value={details.profile?.countryCode} />
                    <KV label="Язык" value={details.profile?.language} />
                    <KV label="Флаг" value={details.profile?.flagCode} />
                    <KV label="Регистрация" value={formatDate(details.user.createdAt)} />
                    <KV label="Уведомлений" value={`${details.notifications.total} (${details.notifications.unread} непроч.)`} />
                  </div>

                  {/* Game stats */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Статистика игры</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Stat label="Побед" value={details.stats.wins} color="text-accent-400" />
                      <Stat label="Поражений" value={details.stats.losses} color="text-red-400" />
                      <Stat label="Winrate" value={`${details.stats.winRate}%`} />
                      <Stat label="Точность" value={`${details.stats.accuracy}%`} color="text-brand-400" />
                      <Stat label="Турниров" value={details.stats.tournamentsTotal} />
                      <Stat label="Заявок ✓" value={details.stats.applicationsApproved} />
                      <Stat label="Заявок ✗" value={details.stats.applicationsRejected} color="text-red-400" />
                      <Stat label="Ответов" value={`${details.stats.answersCorrect}/${details.stats.answersTotal}`} />
                    </div>
                  </div>

                  {/* Activity stats */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Активность</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <Stat label="Всего сессий" value={details.activity.sessionsTotal} />
                      <Stat label="Всего минут" value={details.activity.totalMinutes} />
                      <Stat label="В среднем / сессия" value={`${details.activity.avgSessionMinutes} мин`} />
                    </div>
                    {details.activity.countries.length > 0 && (
                      <div className="mt-3 text-xs text-white/40">
                        Заходил из: {details.activity.countries.slice(0, 5).map((c: any, i: number) => (
                          <span key={i} className="text-white/70 ml-1">{c.city || '?'}{c.country ? ` (${c.country})` : ''}{i < Math.min(details.activity.countries.length, 5) - 1 ? ',' : ''}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent sessions */}
                  {details.recentSessions.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Последние сессии</div>
                      <div className="space-y-1.5">
                        {details.recentSessions.slice(0, 8).map((s: any) => (
                          <div key={s.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-white/[0.02]">
                            <span className="shrink-0">{deviceIcon(s.deviceType)}</span>
                            <span className="text-white/70 shrink-0">{s.browserName || '?'}</span>
                            <span className="text-white/30 shrink-0">/</span>
                            <span className="text-white/50 shrink-0">{s.osName || '?'}</span>
                            <span className="text-white/30">·</span>
                            <span className="text-white/60 flex-1 truncate">
                              {s.city || '?'}{s.countryCode ? `, ${s.countryCode}` : ''}
                              {s.ipAddress && <span className="text-white/20 ml-1 font-mono text-[10px]">({s.ipAddress})</span>}
                            </span>
                            <span className="text-white/30 shrink-0">{s.durationMinutes}мин</span>
                            <span className="text-white/30 shrink-0 whitespace-nowrap">{agoText(s.lastSeenAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent tournaments */}
                  {details.recentTournaments.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Последние турниры</div>
                      <div className="space-y-1.5">
                        {details.recentTournaments.map((p: any) => (
                          <div key={p.tournamentId} className="flex items-center gap-2 text-xs py-2 px-3 rounded-lg bg-white/[0.02]">
                            <span className="text-white/60 flex-1 truncate">{p.title}</span>
                            <span className="font-mono text-white/70">{p.scoreUser}:{p.scoreSystem}</span>
                            <span className="shrink-0 text-[10px]">
                              {p.matchStatus === 'WON' ? '🏆' : p.matchStatus === 'LOST' ? '✗' : p.matchStatus === 'REJECTED' ? '🚫' : '·'}
                            </span>
                            <span className="text-white/30 shrink-0 whitespace-nowrap">{formatDate(p.startAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white/[0.02] rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">{label}</div>
      <div className="text-sm text-white">{value || <span className="text-white/30">—</span>}</div>
    </div>
  );
}
function Stat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-white/[0.02] rounded-xl p-3 text-center">
      <div className={`text-xl font-black ${color || 'text-white'}`}>{value}</div>
      <div className="text-[10px] uppercase text-white/40 mt-0.5">{label}</div>
    </div>
  );
}
