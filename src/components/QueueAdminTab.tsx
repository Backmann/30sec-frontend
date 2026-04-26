'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const LANG_LABELS: Record<string, { label: string; flag: string }> = {
  ru: { label: 'Русский', flag: '🇷🇺' },
  en: { label: 'English', flag: '🇬🇧' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
  uk: { label: 'Українська', flag: '🇺🇦' },
  fr: { label: 'Français', flag: '🇫🇷' },
  es: { label: 'Español', flag: '🇪🇸' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  pl: { label: 'Polski', flag: '🇵🇱' },
};

const DAY_LABELS: Record<string, string> = {
  mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const TIME_LABELS: Record<string, string> = {
  morning: '🌅 Утро', afternoon: '☀️ День', evening: '🌙 Вечер',
};

const THEME_LABELS: Record<string, string> = {
  history: 'История', science: 'Наука', geography: 'География', culture: 'Культура',
  sports: 'Спорт', literature: 'Литература', art: 'Искусство', music: 'Музыка',
  technology: 'Технологии', daily: 'На каждый день',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Активна',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  fulfilled: { label: 'Выполнена', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  withdrawn: { label: 'Снята',     cls: 'bg-white/5 text-white/40 border-white/10' },
  expired:   { label: 'Истекла',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function QueueAdminTab() {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const refresh = async () => {
    setLoading(true);
    try {
      const [ov, l] = await Promise.all([
        api.getAdminQueueOverview(),
        api.getAdminQueueList({ language: langFilter || undefined, status: statusFilter || undefined, limit: 100 }),
      ]);
      setOverview(ov);
      setList(l.items || []);
      setTotal(l.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [langFilter, statusFilter]);

  if (loading && !overview) return <div className="card text-center py-10 text-white/40">Загрузка...</div>;
  if (!overview) return <div className="card text-center py-10 text-red-400">Ошибка загрузки</div>;

  const byLang: Record<string, number> = overview.byLanguage || {};
  const byDay: Record<string, Record<string, number>> = overview.byDayLanguage || {};
  const byTime: Record<string, Record<string, number>> = overview.byTimeSlotLanguage || {};
  const byTheme: Record<string, Record<string, number>> = overview.byThemeLanguage || {};
  const byStatus: Record<string, number> = overview.byStatus || {};

  // Sorted by language descending
  const langs = Object.entries(byLang).sort((a, b) => b[1] - a[1]).map(([code]) => code);
  const totalActive: number = overview.total || 0;

  // Heatmap intensity helper
  const maxDayValue = Math.max(1, ...langs.flatMap(l => DAY_ORDER.map(d => byDay[l]?.[d] || 0)));

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-xl font-bold text-white">Очередь на турниры</h2>
        <div className="text-sm text-white/40">
          Активных: <span className="text-white font-bold">{totalActive}</span>
          {byStatus.fulfilled && <span className="ml-3">Выполненных: <span className="text-green-400 font-bold">{byStatus.fulfilled}</span></span>}
          {byStatus.expired && <span className="ml-3">Истёкших: <span className="text-amber-400 font-bold">{byStatus.expired}</span></span>}
        </div>
      </div>

      {totalActive === 0 ? (
        <div className="card text-center py-10">
          <div className="text-4xl mb-3 opacity-20">📅</div>
          <p className="text-white/40 text-sm">Никто пока не в очереди</p>
          <p className="text-white/30 text-xs mt-2">Когда игроки начнут записываться, здесь появятся данные по языкам, дням и темам.</p>
        </div>
      ) : (
        <>
          {/* Language overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {langs.map(code => {
              const li = LANG_LABELS[code] || { label: code.toUpperCase(), flag: '🌐' };
              return (
                <button key={code} onClick={() => setLangFilter(langFilter === code ? '' : code)}
                  className={`card text-center py-3 px-2 cursor-pointer transition ${
                    langFilter === code ? 'border-brand-500/40 bg-brand-500/5' : 'hover:border-white/15'
                  }`}>
                  <div className="text-xl">{li.flag}</div>
                  <div className="text-2xl font-black text-white mt-1">{byLang[code]}</div>
                  <div className="text-[10px] uppercase text-white/40 mt-0.5">{li.label}</div>
                </button>
              );
            })}
          </div>

          {/* Heatmap: language × day */}
          <div className="card mb-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span>🗓️</span> Когда удобно играть
            </h3>
            <div className="overflow-x-auto -mx-3 px-3">
              <table className="w-full text-xs min-w-[420px]">
                <thead>
                  <tr>
                    <th className="text-left text-white/40 font-normal p-2">Язык</th>
                    {DAY_ORDER.map(d => (
                      <th key={d} className="text-white/40 font-normal p-2 w-10">{DAY_LABELS[d]}</th>
                    ))}
                    <th className="text-white/40 font-normal p-2">Время</th>
                  </tr>
                </thead>
                <tbody>
                  {langs.map(code => {
                    const li = LANG_LABELS[code] || { label: code.toUpperCase(), flag: '🌐' };
                    const tdata = byTime[code] || {};
                    return (
                      <tr key={code} className="border-t border-white/[0.04]">
                        <td className="p-2"><span className="mr-1.5">{li.flag}</span><span className="text-white/80">{li.label}</span></td>
                        {DAY_ORDER.map(d => {
                          const n = byDay[code]?.[d] || 0;
                          const intensity = n / maxDayValue;
                          return (
                            <td key={d} className="p-1 text-center">
                              {n > 0 ? (
                                <div
                                  className="rounded-md py-1 font-mono text-xs font-bold text-white"
                                  style={{
                                    background: `rgba(99,102,241,${0.15 + intensity * 0.55})`,
                                    border: '1px solid rgba(99,102,241,0.25)',
                                  }}
                                  title={`${n} игроков предпочитают ${DAY_LABELS[d]}`}
                                >
                                  {n}
                                </div>
                              ) : (
                                <span className="text-white/15">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 text-white/60 whitespace-nowrap">
                          {Object.entries(tdata).map(([slot, n]) => (
                            <span key={slot} className="mr-2 text-[10px]">{TIME_LABELS[slot] || slot}: <b>{n as number}</b></span>
                          ))}
                          {Object.keys(tdata).length === 0 && <span className="text-white/20 text-[10px]">не указано</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-white/30 mt-2">
              Чем темнее ячейка — тем больше игроков ждут турнир в этот день.
            </p>
          </div>

          {/* Top themes per language */}
          <div className="card mb-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span>🎯</span> Что писать в первую очередь
            </h3>
            <div className="space-y-3">
              {langs.map(code => {
                const li = LANG_LABELS[code] || { label: code.toUpperCase(), flag: '🌐' };
                const themesObj = byTheme[code] || {};
                const sortedThemes = Object.entries(themesObj).sort((a, b) => (b[1] as number) - (a[1] as number));
                const langTotal = byLang[code];
                if (sortedThemes.length === 0) {
                  return (
                    <div key={code} className="text-sm">
                      <span className="mr-2">{li.flag}</span>
                      <span className="text-white/60">{li.label}</span>
                      <span className="ml-3 text-white/30 text-xs">темы не указаны</span>
                    </div>
                  );
                }
                return (
                  <div key={code}>
                    <div className="text-sm mb-1.5">
                      <span className="mr-2">{li.flag}</span>
                      <span className="text-white/80 font-medium">{li.label}</span>
                    </div>
                    <div className="space-y-1">
                      {sortedThemes.slice(0, 5).map(([theme, count]) => {
                        const pct = Math.round(((count as number) / langTotal) * 100);
                        return (
                          <div key={theme} className="flex items-center gap-2 text-xs">
                            <div className="w-32 shrink-0 text-white/60">{THEME_LABELS[theme] || theme}</div>
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-accent-400/60" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="w-12 text-right text-white/50 font-mono">{count as number} · {pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-2 items-center">
        <select value={langFilter} onChange={e => setLangFilter(e.target.value)} style={{ colorScheme: 'dark' }}
          className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          <option value="">Все языки</option>
          {Object.entries(LANG_LABELS).map(([code, li]) => (
            <option key={code} value={code}>{li.flag} {li.label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ colorScheme: 'dark' }}
          className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          <option value="">Все статусы</option>
          <option value="active">Активные</option>
          <option value="fulfilled">Выполненные</option>
          <option value="withdrawn">Снятые</option>
          <option value="expired">Истёкшие</option>
        </select>
        <div className="text-xs text-white/40 ml-auto">Показано {list.length} из {total}</div>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="card text-center py-10 text-white/40">Записей нет</div>
      ) : (
        <div className="space-y-2">
          {list.map(r => {
            const li = LANG_LABELS[r.language] || { label: r.language.toUpperCase(), flag: '🌐' };
            const s = STATUS_LABELS[r.status] || { label: r.status, cls: '' };
            return (
              <div key={r.id} className="card">
                <div className="flex items-start gap-3">
                  <div className="text-xl shrink-0">{li.flag}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white/80 font-medium text-sm">{li.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border ${s.cls}`}>{s.label}</span>
                      {r.user?.profile?.nickname && (
                        <button onClick={() => router.push(`/player/${r.user.profile.nickname}`)}
                          className="text-[11px] text-white/50 hover:text-brand-400 hover:underline">
                          @{r.user.profile.nickname}
                        </button>
                      )}
                      {r.user?.profile?.timezone && (
                        <span className="text-[10px] text-white/30 font-mono">{r.user.profile.timezone}</span>
                      )}
                    </div>
                    <div className="text-white/50 text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      {r.preferredDays?.length > 0 && (
                        <span>📅 {r.preferredDays.map((d: string) => DAY_LABELS[d] || d).join(', ')}</span>
                      )}
                      {r.preferredTimeSlot && <span>{TIME_LABELS[r.preferredTimeSlot]}</span>}
                      {r.themes?.length > 0 && (
                        <span>🎯 {r.themes.map((t: string) => THEME_LABELS[t] || t).join(', ')}</span>
                      )}
                    </div>
                    {r.comment && (
                      <div className="text-white/60 text-xs mt-2 italic bg-white/[0.02] rounded-lg px-2.5 py-1.5">
                        «{r.comment}»
                      </div>
                    )}
                    {r.fulfilledByTournament && (
                      <div className="text-[11px] text-green-400/80 mt-1.5">
                        ↳ Выполнена турниром: <span className="font-medium">{r.fulfilledByTournament.title}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-white/30 text-[10px] whitespace-nowrap shrink-0">
                    {formatDateTime(r.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
