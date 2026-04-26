'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

const LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
];

const DAYS: { code: string; label: string }[] = [
  { code: 'mon', label: 'Пн' }, { code: 'tue', label: 'Вт' }, { code: 'wed', label: 'Ср' },
  { code: 'thu', label: 'Чт' }, { code: 'fri', label: 'Пт' }, { code: 'sat', label: 'Сб' },
  { code: 'sun', label: 'Вс' },
];

const TIME_SLOTS = [
  { code: 'morning', label: 'Утро', hint: '8–12' },
  { code: 'afternoon', label: 'День', hint: '12–18' },
  { code: 'evening', label: 'Вечер', hint: '18–23' },
];

const THEMES = [
  { code: 'history', label: 'История', emoji: '📜' },
  { code: 'science', label: 'Наука', emoji: '🔬' },
  { code: 'geography', label: 'География', emoji: '🌍' },
  { code: 'culture', label: 'Культура', emoji: '🎭' },
  { code: 'sports', label: 'Спорт', emoji: '⚽' },
  { code: 'literature', label: 'Литература', emoji: '📚' },
  { code: 'art', label: 'Искусство', emoji: '🎨' },
  { code: 'music', label: 'Музыка', emoji: '🎵' },
  { code: 'technology', label: 'Технологии', emoji: '💻' },
  { code: 'daily', label: 'На каждый день', emoji: '🌟' },
];

function langInfo(code: string) {
  return LANGUAGES.find(l => l.code === code) || { code, label: code.toUpperCase(), flag: '🌐' };
}

export default function QueueJoinWidget() {
  const { user } = useAuth();
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [language, setLanguage] = useState('ru');
  const [days, setDays] = useState<Set<string>>(new Set());
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [themes, setThemes] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await api.getMyTournamentRequests();
      setMine(list || []);
    } catch (e) { /* silent — widget is optional */ }
    setLoading(false);
  };

  useEffect(() => { if (user) refresh(); }, [user]);

  // Lock body scroll while modal is open (matches FeedbackButton pattern)
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showForm]);

  const resetForm = () => {
    setLanguage(user?.profile?.language || 'ru');
    setDays(new Set());
    setTimeSlot('');
    setThemes(new Set());
    setComment('');
    setError(null);
  };

  const openForm = () => {
    resetForm();
    setShowForm(true);
  };

  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.createTournamentRequest({
        language,
        preferredDays: Array.from(days),
        preferredTimeSlot: timeSlot || undefined,
        themes: Array.from(themes),
        comment: comment.trim() || undefined,
      });
      setShowForm(false);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Не удалось записаться');
    }
    setSubmitting(false);
  };

  const withdraw = async (id: string) => {
    if (!confirm('Снять запись из очереди?')) return;
    try {
      await api.withdrawTournamentRequest(id);
      await refresh();
    } catch (e: any) { alert('Ошибка: ' + e.message); }
  };

  if (loading || !user) return null;

  // Languages user already in (to prevent duplicate)
  const usedLangs = new Set(mine.map(r => r.language));
  const availableLangs = LANGUAGES.filter(l => !usedLangs.has(l.code));

  // If form is open and selected language is no longer available (e.g. user just joined),
  // pick the first available one.
  const selectedLanguage = availableLangs.some(l => l.code === language)
    ? language
    : (availableLangs[0]?.code || language);

  // Modal must be rendered OUTSIDE the animated section so that fixed
  // positioning is relative to viewport, not the section's transform context.
  return (
    <>
      <section className="mb-8 animate-slide-up" style={{ animationDelay: '0.03s', animationFillMode: 'both' }}>
        <h3 className="section-title mb-4">
          <span className="text-brand-400">📅</span> Хочешь следующий турнир?
        </h3>

        {mine.length === 0 ? (
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0">🎯</div>
              <div className="flex-1">
                <div className="text-white font-semibold">Запишись в очередь</div>
                <div className="text-white/50 text-xs mt-1">
                  Так мы поймём, на каком языке собирать следующий турнир и какие вопросы готовить.
                </div>
              </div>
              <button onClick={openForm} className="btn-primary text-sm whitespace-nowrap shrink-0">
                Записаться
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {mine.map((r) => {
              const li = langInfo(r.language);
              const others = Math.max(0, (r.queueSize ?? 1) - 1);
              return (
                <div key={r.id} className="card flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-2xl shrink-0">{li.flag}</div>
                    <div className="min-w-0">
                      <div className="text-white font-semibold text-sm">{li.label}</div>
                      <div className="text-white/40 text-xs mt-0.5">
                        {others > 0
                          ? <>Вы и ещё {others} {pluralRu(others, ['игрок', 'игрока', 'игроков'])} в очереди</>
                          : 'Пока в очереди только вы'}
                        {r.themes?.length > 0 && (
                          <span className="ml-2 hidden sm:inline">
                            · темы: {r.themes.slice(0, 3).map((t: string) => themeLabel(t)).join(', ')}
                            {r.themes.length > 3 && ' …'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => withdraw(r.id)} className="btn-ghost text-xs whitespace-nowrap text-white/50 hover:text-red-400">
                    Снять запись
                  </button>
                </div>
              );
            })}
            {availableLangs.length > 0 && (
              <button onClick={openForm} className="btn-secondary w-full text-sm">
                + Записаться на другом языке
              </button>
            )}
          </div>
        )}
      </section>

      {/* Modal — rendered outside the animated section */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up"
          >
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-dark-800 z-10">
              <h3 className="text-lg font-bold text-white">Запись в очередь</h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Language — required */}
              <div>
                <label className="input-label">
                  Язык турнира <span className="text-red-400">*</span>
                </label>
                {availableLangs.length === 0 ? (
                  <div className="text-white/50 text-sm bg-white/[0.04] border border-white/10 rounded-xl p-3">
                    Вы уже записаны на все доступные языки.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableLangs.map(l => (
                      <button
                        key={l.code}
                        onClick={() => setLanguage(l.code)}
                        className={`px-3 py-2.5 rounded-xl border text-sm transition ${
                          selectedLanguage === l.code
                            ? 'bg-brand-500/20 border-brand-500/60 text-white'
                            : 'bg-white/[0.05] border-white/15 text-white/70 hover:bg-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="text-xl">{l.flag}</div>
                        <div className="text-[11px] mt-0.5">{l.label}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Days */}
              <div>
                <label className="input-label">Удобные дни (можно несколько)</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(d => (
                    <button
                      key={d.code}
                      onClick={() => toggle(days, d.code, setDays)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                        days.has(d.code)
                          ? 'bg-brand-500/20 border-brand-500/60 text-brand-200'
                          : 'bg-white/[0.05] border-white/15 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slot */}
              <div>
                <label className="input-label">Удобное время</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map(s => (
                    <button
                      key={s.code}
                      onClick={() => setTimeSlot(timeSlot === s.code ? '' : s.code)}
                      className={`px-3 py-2.5 rounded-xl border text-sm transition ${
                        timeSlot === s.code
                          ? 'bg-brand-500/20 border-brand-500/60 text-white'
                          : 'bg-white/[0.05] border-white/15 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div>{s.label}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{s.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Themes */}
              <div>
                <label className="input-label">Любимые темы (помогут с подбором вопросов)</label>
                <div className="flex flex-wrap gap-1.5">
                  {THEMES.map(t => (
                    <button
                      key={t.code}
                      onClick={() => toggle(themes, t.code, setThemes)}
                      className={`px-3 py-1.5 rounded-xl border text-xs transition ${
                        themes.has(t.code)
                          ? 'bg-accent-500/20 border-accent-500/60 text-accent-200'
                          : 'bg-white/[0.05] border-white/15 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <span className="mr-1">{t.emoji}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="input-label">
                  Комментарий <span className="text-white/30 font-normal">(необязательно)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value.slice(0, 500))}
                  rows={2}
                  placeholder="Например: «хочу командно с друзьями»"
                  className="input-field resize-y min-h-[60px]"
                />
                <div className="text-[10px] text-white/30 mt-1 text-right">{comment.length} / 500</div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={submit}
                disabled={submitting || availableLangs.length === 0}
                className="btn-primary w-full text-center"
              >
                {submitting ? 'Сохраняем...' : 'Записаться в очередь'}
              </button>
              <p className="text-[11px] text-white/30 text-center">
                Запись действует 30 дней. Когда соберём турнир на этом языке, мы первыми пригласим вас.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
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

function themeLabel(code: string): string {
  return THEMES.find(t => t.code === code)?.label || code;
}
