'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { detectLocale, Locale } from '@/lib/i18n';

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

// Days, time slots, and themes are localized per UI locale.
// Stored codes (`mon`, `morning`, `history`, etc.) stay constant — only labels change.
const DAYS_BY_LOCALE: Record<Locale, { code: string; label: string }[]> = {
  ru: [
    { code: 'mon', label: 'Пн' }, { code: 'tue', label: 'Вт' }, { code: 'wed', label: 'Ср' },
    { code: 'thu', label: 'Чт' }, { code: 'fri', label: 'Пт' }, { code: 'sat', label: 'Сб' },
    { code: 'sun', label: 'Вс' },
  ],
  en: [
    { code: 'mon', label: 'Mon' }, { code: 'tue', label: 'Tue' }, { code: 'wed', label: 'Wed' },
    { code: 'thu', label: 'Thu' }, { code: 'fri', label: 'Fri' }, { code: 'sat', label: 'Sat' },
    { code: 'sun', label: 'Sun' },
  ],
  de: [
    { code: 'mon', label: 'Mo' }, { code: 'tue', label: 'Di' }, { code: 'wed', label: 'Mi' },
    { code: 'thu', label: 'Do' }, { code: 'fri', label: 'Fr' }, { code: 'sat', label: 'Sa' },
    { code: 'sun', label: 'So' },
  ],
};

const TIME_SLOTS_BY_LOCALE: Record<Locale, { code: string; label: string; hint: string }[]> = {
  ru: [
    { code: 'morning', label: 'Утро', hint: '8–12' },
    { code: 'afternoon', label: 'День', hint: '12–18' },
    { code: 'evening', label: 'Вечер', hint: '18–23' },
  ],
  en: [
    { code: 'morning', label: 'Morning', hint: '8–12' },
    { code: 'afternoon', label: 'Afternoon', hint: '12–18' },
    { code: 'evening', label: 'Evening', hint: '18–23' },
  ],
  de: [
    { code: 'morning', label: 'Morgen', hint: '8–12' },
    { code: 'afternoon', label: 'Nachmittag', hint: '12–18' },
    { code: 'evening', label: 'Abend', hint: '18–23' },
  ],
};

const THEMES_BY_LOCALE: Record<Locale, { code: string; label: string; emoji: string }[]> = {
  ru: [
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
  ],
  en: [
    { code: 'history', label: 'History', emoji: '📜' },
    { code: 'science', label: 'Science', emoji: '🔬' },
    { code: 'geography', label: 'Geography', emoji: '🌍' },
    { code: 'culture', label: 'Culture', emoji: '🎭' },
    { code: 'sports', label: 'Sports', emoji: '⚽' },
    { code: 'literature', label: 'Literature', emoji: '📚' },
    { code: 'art', label: 'Art', emoji: '🎨' },
    { code: 'music', label: 'Music', emoji: '🎵' },
    { code: 'technology', label: 'Technology', emoji: '💻' },
    { code: 'daily', label: 'Everyday', emoji: '🌟' },
  ],
  de: [
    { code: 'history', label: 'Geschichte', emoji: '📜' },
    { code: 'science', label: 'Wissenschaft', emoji: '🔬' },
    { code: 'geography', label: 'Geografie', emoji: '🌍' },
    { code: 'culture', label: 'Kultur', emoji: '🎭' },
    { code: 'sports', label: 'Sport', emoji: '⚽' },
    { code: 'literature', label: 'Literatur', emoji: '📚' },
    { code: 'art', label: 'Kunst', emoji: '🎨' },
    { code: 'music', label: 'Musik', emoji: '🎵' },
    { code: 'technology', label: 'Technologie', emoji: '💻' },
    { code: 'daily', label: 'Alltag', emoji: '🌟' },
  ],
};

const STR: Record<Locale, {
  wantNext: string;
  signupCard: string;
  signupExplain: string;
  signup: string;
  unsignSure: string;
  unsignAction: string;
  signupAnotherLang: string;
  errorGeneric: string;
  errorPrefix: string;
  modalTitle: string;
  modalClose: string;
  langRequired: string;
  langAllUsed: string;
  daysLabel: string;
  timeLabel: string;
  themesLabel: string;
  commentLabel: string;
  commentOptional: string;
  commentPlaceholder: string;
  saving: string;
  signupCta: string;
  signupHint30days: string;
  onlyYouQueue: string;
  themesLine: string;
  modalAriaClose: string;
  pluralPlayers: (n: number) => string;
  // "Вы и ещё N <plural>"
  youAndOthers: (n: number) => string;
}> = {
  ru: {
    wantNext: 'Хочешь следующий турнир?',
    signupCard: 'Запишись в очередь',
    signupExplain: 'Так мы поймём, на каком языке собирать следующий турнир и какие вопросы готовить.',
    signup: 'Записаться',
    unsignSure: 'Снять запись из очереди?',
    unsignAction: 'Снять запись',
    signupAnotherLang: '+ Записаться на другом языке',
    errorGeneric: 'Не удалось записаться',
    errorPrefix: 'Ошибка: ',
    modalTitle: 'Запись в очередь',
    modalClose: 'Закрыть',
    langRequired: 'Язык турнира',
    langAllUsed: 'Вы уже записаны на все доступные языки.',
    daysLabel: 'Удобные дни (можно несколько)',
    timeLabel: 'Удобное время',
    themesLabel: 'Любимые темы (помогут с подбором вопросов)',
    commentLabel: 'Комментарий',
    commentOptional: '(необязательно)',
    commentPlaceholder: 'Например: «хочу командно с друзьями»',
    saving: 'Сохраняем...',
    signupCta: 'Записаться в очередь',
    signupHint30days: 'Запись действует 30 дней. Когда соберём турнир на этом языке, мы первыми пригласим вас.',
    onlyYouQueue: 'Пока в очереди только вы',
    themesLine: '· темы: ',
    modalAriaClose: 'Закрыть',
    pluralPlayers: (n) => {
      const m10 = n % 10, m100 = n % 100;
      if (m100 >= 11 && m100 <= 14) return 'игроков';
      if (m10 === 1) return 'игрок';
      if (m10 >= 2 && m10 <= 4) return 'игрока';
      return 'игроков';
    },
    youAndOthers: (n) => {
      const word = STR.ru.pluralPlayers(n);
      return `Вы и ещё ${n} ${word} в очереди`;
    },
  },
  en: {
    wantNext: 'Want the next tournament?',
    signupCard: 'Join the queue',
    signupExplain: 'This tells us which language to set up next and what questions to prepare.',
    signup: 'Join',
    unsignSure: 'Leave the queue?',
    unsignAction: 'Leave queue',
    signupAnotherLang: '+ Join in another language',
    errorGeneric: 'Could not join',
    errorPrefix: 'Error: ',
    modalTitle: 'Join the queue',
    modalClose: 'Close',
    langRequired: 'Tournament language',
    langAllUsed: 'You are already in queue for all available languages.',
    daysLabel: 'Convenient days (multiple OK)',
    timeLabel: 'Preferred time',
    themesLabel: 'Favourite themes (helps us pick questions)',
    commentLabel: 'Comment',
    commentOptional: '(optional)',
    commentPlaceholder: 'E.g. "would like to play with friends"',
    saving: 'Saving...',
    signupCta: 'Join the queue',
    signupHint30days: 'Your entry is valid for 30 days. When we set up a tournament in this language, you will be invited first.',
    onlyYouQueue: 'Only you in queue so far',
    themesLine: '· themes: ',
    modalAriaClose: 'Close',
    pluralPlayers: (n) => n === 1 ? 'player' : 'players',
    youAndOthers: (n) => `You and ${n} other ${STR.en.pluralPlayers(n)} in queue`,
  },
  de: {
    wantNext: 'Beim nächsten Turnier dabei?',
    signupCard: 'In die Warteliste',
    signupExplain: 'So wissen wir, in welcher Sprache wir das nächste Turnier ansetzen und welche Fragen vorbereiten.',
    signup: 'Eintragen',
    unsignSure: 'Aus der Warteliste austragen?',
    unsignAction: 'Austragen',
    signupAnotherLang: '+ In anderer Sprache eintragen',
    errorGeneric: 'Eintrag fehlgeschlagen',
    errorPrefix: 'Fehler: ',
    modalTitle: 'In die Warteliste',
    modalClose: 'Schließen',
    langRequired: 'Turniersprache',
    langAllUsed: 'Du bist bereits für alle verfügbaren Sprachen eingetragen.',
    daysLabel: 'Mögliche Tage (mehrere möglich)',
    timeLabel: 'Bevorzugte Zeit',
    themesLabel: 'Lieblingsthemen (für die Fragenauswahl)',
    commentLabel: 'Kommentar',
    commentOptional: '(optional)',
    commentPlaceholder: 'Z.B. „mit Freunden im Team spielen"',
    saving: 'Speichern...',
    signupCta: 'In die Warteliste',
    signupHint30days: 'Eintrag ist 30 Tage gültig. Sobald wir ein Turnier in dieser Sprache ansetzen, wirst du zuerst eingeladen.',
    onlyYouQueue: 'Du bist bisher allein in der Warteliste',
    themesLine: '· Themen: ',
    modalAriaClose: 'Schließen',
    pluralPlayers: (n) => n === 1 ? 'Spieler' : 'Spieler',
    youAndOthers: (n) => `Du und ${n} weitere${n === 1 ? 'r' : ''} ${STR.de.pluralPlayers(n)} in der Warteliste`,
  },
};

function langInfo(code: string) {
  return LANGUAGES.find(l => l.code === code) || { code, label: code.toUpperCase(), flag: '🌐' };
}

export default function QueueJoinWidget() {
  const { user } = useAuth();
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [locale, setLocale] = useState<Locale>('ru');
  useEffect(() => { setLocale(detectLocale()); }, []);

  const t = STR[locale];
  const DAYS = DAYS_BY_LOCALE[locale];
  const TIME_SLOTS = TIME_SLOTS_BY_LOCALE[locale];
  const THEMES = THEMES_BY_LOCALE[locale];
  const themeLabel = (code: string) => THEMES.find(x => x.code === code)?.label || code;

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
      setError(e?.message || t.errorGeneric);
    }
    setSubmitting(false);
  };

  const withdraw = async (id: string) => {
    if (!confirm(t.unsignSure)) return;
    try {
      await api.withdrawTournamentRequest(id);
      await refresh();
    } catch (e: any) { alert(t.errorPrefix + e.message); }
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
          <span className="text-brand-400">📅</span> {t.wantNext}
        </h3>

        {mine.length === 0 ? (
          <div className="card-glow">
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0">🎯</div>
              <div className="flex-1">
                <div className="text-white font-semibold">{t.signupCard}</div>
                <div className="text-white/50 text-xs mt-1">
                  {t.signupExplain}
                </div>
              </div>
              <button onClick={openForm} className="btn-primary text-sm whitespace-nowrap shrink-0">
                {t.signup}
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
                          ? t.youAndOthers(others)
                          : t.onlyYouQueue}
                        {r.themes?.length > 0 && (
                          <span className="ml-2 hidden sm:inline">
                            {t.themesLine}{r.themes.slice(0, 3).map((tt: string) => themeLabel(tt)).join(', ')}
                            {r.themes.length > 3 && ' …'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => withdraw(r.id)} className="btn-ghost text-xs whitespace-nowrap text-white/50 hover:text-red-400">
                    {t.unsignAction}
                  </button>
                </div>
              );
            })}
            {availableLangs.length > 0 && (
              <button onClick={openForm} className="btn-secondary w-full text-sm">
                {t.signupAnotherLang}
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
              <h3 className="text-lg font-bold text-white">{t.modalTitle}</h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center"
                aria-label={t.modalAriaClose}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Language — required */}
              <div>
                <label className="input-label">
                  {t.langRequired} <span className="text-red-400">*</span>
                </label>
                {availableLangs.length === 0 ? (
                  <div className="text-white/50 text-sm bg-white/[0.04] border border-white/10 rounded-xl p-3">
                    {t.langAllUsed}
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
                <label className="input-label">{t.daysLabel}</label>
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
                <label className="input-label">{t.timeLabel}</label>
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
                <label className="input-label">{t.themesLabel}</label>
                <div className="flex flex-wrap gap-1.5">
                  {THEMES.map(th => (
                    <button
                      key={th.code}
                      onClick={() => toggle(themes, th.code, setThemes)}
                      className={`px-3 py-1.5 rounded-xl border text-xs transition ${
                        themes.has(th.code)
                          ? 'bg-accent-500/20 border-accent-500/60 text-accent-200'
                          : 'bg-white/[0.05] border-white/15 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <span className="mr-1">{th.emoji}</span>{th.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="input-label">
                  {t.commentLabel} <span className="text-white/30 font-normal">{t.commentOptional}</span>
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value.slice(0, 500))}
                  rows={2}
                  placeholder={t.commentPlaceholder}
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
                {submitting ? t.saving : t.signupCta}
              </button>
              <p className="text-[11px] text-white/30 text-center">
                {t.signupHint30days}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


