'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

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

const HEALTH: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  green: { dot: 'bg-green-400', text: 'text-green-300', bg: 'bg-green-500/[0.06]', border: 'border-green-500/20' },
  amber: { dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/20' },
  red:   { dot: 'bg-red-400',   text: 'text-red-300',   bg: 'bg-red-500/[0.06]',   border: 'border-red-500/20' },
  idle:  { dot: 'bg-white/30',  text: 'text-white/40',  bg: 'bg-white/[0.02]',     border: 'border-white/[0.08]' },
};

function shortText(s: string, max = 90) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max).trim() + '…' : s;
}

export default function QuestionLibraryTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [referenceLang, setReferenceLang] = useState<string>('ru');
  const [openMissingFor, setOpenMissingFor] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await api.getQuestionLibraryOverview(referenceLang);
      setData(r);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [referenceLang]);

  if (loading && !data) return <div className="card text-center py-10 text-white/40">Загрузка...</div>;
  if (!data) return <div className="card text-center py-10 text-red-400">Ошибка загрузки</div>;

  const meta = data.meta;
  const tot = data.totals;
  const Q_PER_T = meta.questionsPerTournament;

  // Sort languages: red → amber → green → idle, then by demand
  const order = { red: 0, amber: 1, green: 2, idle: 3 } as Record<string, number>;
  const sortedLangs = [...data.byLanguage].sort((a: any, b: any) => {
    if (order[a.health] !== order[b.health]) return order[a.health] - order[b.health];
    return b.demand - a.demand;
  });

  const missingForOpen = openMissingFor ? data.missingTranslations[openMissingFor] || [] : [];

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-xl font-bold text-white">Библиотека вопросов</h2>
        <div className="text-sm text-white/40">
          ACTIVE: <span className="text-white font-bold">{tot.active}</span>
          <span className="ml-3">Свободных: <span className="text-green-400 font-bold">{tot.free}</span></span>
          <span className="ml-3">В турнирах: <span className="text-white/60 font-bold">{tot.used}</span></span>
        </div>
      </div>

      {/* Summary banner */}
      <div className="card mb-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl shrink-0">📚</div>
          <div className="flex-1 text-sm text-white/70">
            На один турнир нужно <b className="text-white">{Q_PER_T}</b> вопросов в выбранном языке.
            Цвет рядом с языком — индикатор готовности: <span className="text-green-400">зелёный</span> = хватит на 2+ турнира,
            <span className="text-amber-400"> жёлтый</span> = хватит на 1, <span className="text-red-400"> красный</span> = не хватает.
          </div>
        </div>
      </div>

      {/* Reference language selector */}
      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-white/60">Язык-источник для переводов:</span>
        <div className="flex gap-1.5">
          {meta.languages.map((l: string) => {
            const li = LANG_LABELS[l] || { label: l, flag: '🌐' };
            return (
              <button key={l} onClick={() => setReferenceLang(l)}
                className={`px-3 py-1.5 rounded-xl border text-xs transition ${
                  referenceLang === l
                    ? 'bg-brand-500/20 border-brand-500/60 text-white'
                    : 'bg-white/[0.05] border-white/15 text-white/60 hover:bg-white/10'
                }`}>
                <span className="mr-1">{li.flag}</span>{li.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto text-[11px] text-white/30">
          «Не переведено» считается относительно этого языка
        </div>
      </div>

      {/* Per-language gap analysis */}
      <div className="space-y-2 mb-4">
        {sortedLangs.map((row: any) => {
          const li = LANG_LABELS[row.language] || { label: row.language, flag: '🌐' };
          const h = HEALTH[row.health];
          const missingCount = (data.missingTranslations[row.language] || []).length;
          const isReference = row.language === referenceLang;
          // Progress bar towards 1 tournament
          const pct = Math.min(100, (row.free / Q_PER_T) * 100);
          return (
            <div key={row.language} className={`card border ${h.border} ${h.bg}`}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex items-center gap-2 shrink-0 min-w-[140px]">
                  <span className={`w-2 h-2 rounded-full ${h.dot}`} />
                  <span className="text-2xl">{li.flag}</span>
                  <span className="text-white font-semibold text-sm">{li.label}</span>
                </div>

                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-baseline gap-3 flex-wrap text-sm">
                    <span><span className="text-white font-bold text-lg">{row.inLibrary}</span> <span className="text-white/40 text-xs">в библиотеке</span></span>
                    <span><span className="text-green-400 font-bold">{row.free}</span> <span className="text-white/40 text-xs">свободно</span></span>
                    <span><span className={row.demand > 0 ? 'text-accent-400 font-bold' : 'text-white/30'}>{row.demand}</span> <span className="text-white/40 text-xs">в очереди</span></span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${h.dot}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[11px] text-white/50 font-mono whitespace-nowrap">
                      {row.tournamentsPossible > 0
                        ? <>≈ {row.tournamentsPossible} {pluralRu(row.tournamentsPossible, ['турнир','турнира','турниров'])}</>
                        : row.needForOneTournament > 0
                            ? <>+{row.needForOneTournament} {pluralRu(row.needForOneTournament, ['вопрос','вопроса','вопросов'])} до турнира</>
                            : '0 / 23'
                      }
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isReference ? (
                    <span className="text-[11px] text-brand-300 px-2.5 py-1 rounded-md bg-brand-500/10 border border-brand-500/20">
                      источник
                    </span>
                  ) : missingCount > 0 ? (
                    <button
                      onClick={() => setOpenMissingFor(openMissingFor === row.language ? null : row.language)}
                      className="text-[11px] text-white/70 hover:text-white px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 whitespace-nowrap">
                      {missingCount} без перевода {openMissingFor === row.language ? '▴' : '▾'}
                    </button>
                  ) : (
                    <span className="text-[11px] text-green-300/70 px-2.5 py-1">
                      ✓ всё переведено
                    </span>
                  )}
                </div>
              </div>

              {/* Inline missing-translation list */}
              {openMissingFor === row.language && missingForOpen.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                  <div className="text-[11px] text-white/40 mb-1">
                    Не переведено с {LANG_LABELS[referenceLang]?.flag} {LANG_LABELS[referenceLang]?.label} → {li.flag} {li.label}:
                  </div>
                  {missingForOpen.slice(0, 20).map((m: any) => (
                    <a key={m.questionId} href={`/admin/questions/${m.questionId}`}
                       className="block text-xs text-white/60 hover:text-white py-1.5 px-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition">
                      <span className="font-mono text-[10px] text-white/30 mr-2">#{m.questionId.slice(-6)}</span>
                      {shortText(m.referenceText, 120)}
                    </a>
                  ))}
                  {missingForOpen.length > 20 && (
                    <div className="text-[11px] text-white/30 text-center pt-1">
                      … и ещё {missingForOpen.length - 20}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status totals */}
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-3">Все вопросы по статусам</h3>
        <div className="flex flex-wrap gap-2">
          {(['ACTIVE','DRAFT','ARCHIVED'] as const).map(s => (
            <div key={s} className="flex-1 min-w-[100px] bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white font-mono">{tot.byStatus[s] || 0}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}
