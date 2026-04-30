'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import AvatarUploader from '@/components/AvatarUploader';
import AchievementsGrid from '@/components/AchievementsGrid';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import WeeklyChart from '@/components/WeeklyChart';
import { detectLocale, getTranslation, Locale } from '@/lib/i18n';
import { rankTitle } from '@/lib/ranks';

const P_STR: Record<Locale, {
  saved: string;
  errorPrefix: string;
  tabStats: string;
  tabAchievements: string;
  tabAnswers: string;
  tabTournaments: string;
  tabSettings: string;
  emailVerified: string;
  emailNotVerified: string;
  totalAnswered: string;
  correct: string;
  wrong: string;
  accuracy: string;
  bestStreak: string;
  currentStreak: string;
  wins12_0: string;
  losses0_12: string;
  finals: string;
  weekly: string;
  monthly: string;
  seasonal: string;
  yearly: string;
  noRank: string;
  toNextRank: string;
  maxRank: string;
  noAnswersYet: string;
  awaitingJudgement: string;
  pageOf: string;
  noTournaments: string;
  avatar: string;
  nickname: string;
  nicknameHint: string;
  language: string;
  russian: string;
  dateOfBirth: string;
  gender: string;
  notSpecified: string;
  male: string;
  female: string;
  other: string;
  city: string;
  phone: string;
  phoneOptional: string;
  about: string;
  bioPlaceholder: string;
  privacyTitle: string;
  showRealName: string;
  showCountry: string;
  showCity: string;
  showAge: string;
  emailNeverShown: string;
  myDataGdpr: string;
  gdprText: string;
  exportError: string;
  downloadData: string;
  promptPassword: string;
  confirmDelete: string;
  deletedSuccess: string;
  errorGeneric: string;
  deleteAccount: string;
}> = {
  ru: {
    saved: '✓ Сохранено',
    errorPrefix: 'Ошибка: ',
    tabStats: '📊 Статистика',
    tabAchievements: '🏅 Достижения',
    tabAnswers: '📝 Ответы',
    tabTournaments: '🏆 Турниры',
    tabSettings: '⚙️ Настройки',
    emailVerified: 'Email ✓',
    emailNotVerified: 'Email не подтверждён',
    totalAnswered: 'Всего ответов',
    correct: 'Правильных',
    wrong: 'Неправильных',
    accuracy: 'Точность',
    bestStreak: 'Лучшая серия',
    currentStreak: 'Текущая серия',
    wins12_0: 'Побед 12:0',
    losses0_12: 'Поражений 0:12',
    finals: 'Финалы',
    weekly: 'Недельные',
    monthly: 'Месячные',
    seasonal: 'Сезонные',
    yearly: 'Годовые',
    noRank: 'Без ранга',
    toNextRank: 'Осталось {n} правильных ответов до «{rank}»',
    maxRank: 'Достигнут максимальный ранг 👑',
    noAnswersYet: 'Пока нет ответов',
    awaitingJudgement: 'ожидание',
    pageOf: 'Страница {p} из {t}',
    noTournaments: 'Пока нет турниров',
    avatar: 'Аватар',
    nickname: 'Никнейм',
    nicknameHint: 'Буквы, цифры и _ (3-20 символов). Можно менять раз в 30 дней.',
    language: 'Язык / Language',
    russian: 'Русский',
    dateOfBirth: 'Дата рождения',
    gender: 'Пол',
    notSpecified: 'Не указано',
    male: 'Мужской',
    female: 'Женский',
    other: 'Другое',
    city: 'Город',
    phone: 'Телефон',
    phoneOptional: '(необязательно)',
    about: 'О себе',
    bioPlaceholder: 'Расскажите о себе несколько слов...',
    privacyTitle: '🔒 Приватность публичного профиля',
    showRealName: 'Показывать настоящее имя',
    showCountry: 'Показывать страну и флаг',
    showCity: 'Показывать город',
    showAge: 'Показывать возраст (вычисляется из даты рождения)',
    emailNeverShown: 'Email никогда не показывается другим игрокам',
    myDataGdpr: 'Мои данные (GDPR)',
    gdprText: 'Согласно GDPR, вы имеете право скачать свои данные или удалить аккаунт в любой момент.',
    exportError: 'Ошибка экспорта: ',
    downloadData: 'Скачать мои данные (JSON)',
    promptPassword: 'Для подтверждения удаления введите ваш пароль:',
    confirmDelete: 'Вы УВЕРЕНЫ что хотите удалить аккаунт? Это действие необратимо.\n\nВаша история турниров будет анонимизирована, но сохранена для целостности данных.',
    deletedSuccess: 'Аккаунт удалён. Вы будете перенаправлены на главную.',
    errorGeneric: 'Ошибка',
    deleteAccount: 'Удалить аккаунт',
  },
  en: {
    saved: '✓ Saved',
    errorPrefix: 'Error: ',
    tabStats: '📊 Statistics',
    tabAchievements: '🏅 Achievements',
    tabAnswers: '📝 Answers',
    tabTournaments: '🏆 Tournaments',
    tabSettings: '⚙️ Settings',
    emailVerified: 'Email ✓',
    emailNotVerified: 'Email not verified',
    totalAnswered: 'Total answers',
    correct: 'Correct',
    wrong: 'Wrong',
    accuracy: 'Accuracy',
    bestStreak: 'Best streak',
    currentStreak: 'Current streak',
    wins12_0: 'Wins 12:0',
    losses0_12: 'Losses 0:12',
    finals: 'Finals',
    weekly: 'Weekly',
    monthly: 'Monthly',
    seasonal: 'Seasonal',
    yearly: 'Yearly',
    noRank: 'No rank',
    toNextRank: '{n} correct answers to reach «{rank}»',
    maxRank: 'Max rank reached 👑',
    noAnswersYet: 'No answers yet',
    awaitingJudgement: 'pending',
    pageOf: 'Page {p} of {t}',
    noTournaments: 'No tournaments yet',
    avatar: 'Avatar',
    nickname: 'Nickname',
    nicknameHint: 'Letters, digits and _ (3-20 chars). Can be changed once every 30 days.',
    language: 'Language',
    russian: 'Russian',
    dateOfBirth: 'Date of birth',
    gender: 'Gender',
    notSpecified: 'Not specified',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    city: 'City',
    phone: 'Phone',
    phoneOptional: '(optional)',
    about: 'About',
    bioPlaceholder: 'Tell others a few words about yourself...',
    privacyTitle: '🔒 Public profile privacy',
    showRealName: 'Show real name',
    showCountry: 'Show country and flag',
    showCity: 'Show city',
    showAge: 'Show age (computed from date of birth)',
    emailNeverShown: 'Email is never shown to other players',
    myDataGdpr: 'My data (GDPR)',
    gdprText: 'Under GDPR you have the right to download your data or delete your account at any time.',
    exportError: 'Export error: ',
    downloadData: 'Download my data (JSON)',
    promptPassword: 'To confirm deletion, please enter your password:',
    confirmDelete: 'Are you SURE you want to delete your account? This action cannot be undone.\n\nYour tournament history will be anonymised but kept for data integrity.',
    deletedSuccess: 'Account deleted. You will be redirected to home.',
    errorGeneric: 'Error',
    deleteAccount: 'Delete account',
  },
  de: {
    saved: '✓ Gespeichert',
    errorPrefix: 'Fehler: ',
    tabStats: '📊 Statistik',
    tabAchievements: '🏅 Erfolge',
    tabAnswers: '📝 Antworten',
    tabTournaments: '🏆 Turniere',
    tabSettings: '⚙️ Einstellungen',
    emailVerified: 'E-Mail ✓',
    emailNotVerified: 'E-Mail nicht bestätigt',
    totalAnswered: 'Antworten gesamt',
    correct: 'Richtig',
    wrong: 'Falsch',
    accuracy: 'Genauigkeit',
    bestStreak: 'Beste Serie',
    currentStreak: 'Aktuelle Serie',
    wins12_0: 'Siege 12:0',
    losses0_12: 'Niederlagen 0:12',
    finals: 'Finals',
    weekly: 'Wöchentlich',
    monthly: 'Monatlich',
    seasonal: 'Saisonal',
    yearly: 'Jährlich',
    noRank: 'Kein Rang',
    toNextRank: 'Noch {n} richtige Antworten bis «{rank}»',
    maxRank: 'Höchster Rang erreicht 👑',
    noAnswersYet: 'Noch keine Antworten',
    awaitingJudgement: 'wartet',
    pageOf: 'Seite {p} von {t}',
    noTournaments: 'Noch keine Turniere',
    avatar: 'Avatar',
    nickname: 'Nickname',
    nicknameHint: 'Buchstaben, Ziffern und _ (3-20 Zeichen). Änderbar alle 30 Tage.',
    language: 'Sprache',
    russian: 'Russisch',
    dateOfBirth: 'Geburtsdatum',
    gender: 'Geschlecht',
    notSpecified: 'Nicht angegeben',
    male: 'Männlich',
    female: 'Weiblich',
    other: 'Andere',
    city: 'Stadt',
    phone: 'Telefon',
    phoneOptional: '(optional)',
    about: 'Über mich',
    bioPlaceholder: 'Erzähle in ein paar Worten über dich...',
    privacyTitle: '🔒 Privatsphäre des öffentlichen Profils',
    showRealName: 'Echten Namen anzeigen',
    showCountry: 'Land und Flagge anzeigen',
    showCity: 'Stadt anzeigen',
    showAge: 'Alter anzeigen (aus Geburtsdatum berechnet)',
    emailNeverShown: 'E-Mail wird anderen Spielern nie gezeigt',
    myDataGdpr: 'Meine Daten (DSGVO)',
    gdprText: 'Gemäß DSGVO hast du das Recht, deine Daten herunterzuladen oder dein Konto jederzeit zu löschen.',
    exportError: 'Export-Fehler: ',
    downloadData: 'Meine Daten herunterladen (JSON)',
    promptPassword: 'Zur Bestätigung der Löschung gib bitte dein Passwort ein:',
    confirmDelete: 'Bist du SICHER, dass du dein Konto löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.\n\nDeine Turnierhistorie wird anonymisiert, aber zur Datenintegrität erhalten.',
    deletedSuccess: 'Konto gelöscht. Du wirst zur Startseite weitergeleitet.',
    errorGeneric: 'Fehler',
    deleteAccount: 'Konto löschen',
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loadUser, logout } = useAuth();
  const locale = detectLocale();
  const t = getTranslation(locale);
  const pt = P_STR[locale];

  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [tournamentHistory, setTournamentHistory] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const [rankProgress, setRankProgress] = useState<any>(null);
  const [tab, setTab] = useState<'stats' | 'achievements' | 'answers' | 'tournaments' | 'settings'>('stats');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ nickname: '', firstName: '', lastName: '', language: '', showRealName: false, dateOfBirth: '', gender: '', city: '', bio: '', phone: '', avatarUrl: '', showCity: true, showAge: false, showCountry: true });
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    loadUser().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      api.getMyProfile().then(setProfile).catch(() => {});
      api.getMyAnswerHistory().then(setHistory).catch(() => {});
      api.getMyTournamentHistory().then(setTournamentHistory).catch(() => {});
      api.getMyAchievements().then(setAchievements).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [loading, user]);

  useEffect(() => {
    if (profile?.profile?.nickname) {
      api.getPlayerActivity(profile.profile.nickname).then(setActivity).catch(() => {});
      api.getPublicProfile(profile.profile.nickname).then((p: any) => setRankProgress(p.rankProgress)).catch(() => {});
    }
    if (profile?.profile) {
      setEditForm({
        nickname: profile.profile.nickname || '',
        firstName: profile.profile.firstName || '',
        lastName: profile.profile.lastName || '',
        language: profile.profile.language || 'ru',
        showRealName: profile.profile.showRealName || false,
        dateOfBirth: profile.profile.dateOfBirth ? String(profile.profile.dateOfBirth).split('T')[0] : '',
        gender: profile.profile.gender || '',
        city: profile.profile.city || '',
        bio: profile.profile.bio || '',
        phone: profile.profile.phone || '',
        avatarUrl: profile.profile.avatarUrl || '',
        showCity: profile.profile.showCity !== false,
        showAge: profile.profile.showAge === true,
        showCountry: profile.profile.showCountry !== false,
      });
    }
  }, [profile]);

  const saveProfile = async () => {
    try {
      await api.updateProfile(editForm);
      setSaveMsg(pt.saved);
      setEditMode(false);
      await Promise.all([api.getMyProfile().then(setProfile), loadUser()]);
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveMsg(pt.errorPrefix + err.message);
    }
  };

  // Track if anything changed vs loaded profile
  const hasChanges = profile?.profile ? (
    editForm.nickname !== (profile.profile.nickname || '') ||
    editForm.firstName !== (profile.profile.firstName || '') ||
    editForm.lastName !== (profile.profile.lastName || '') ||
    editForm.language !== (profile.profile.language || 'ru') ||
    editForm.showRealName !== (profile.profile.showRealName || false) ||
    editForm.dateOfBirth !== (profile.profile.dateOfBirth ? String(profile.profile.dateOfBirth).split('T')[0] : '') ||
    editForm.gender !== (profile.profile.gender || '') ||
    editForm.city !== (profile.profile.city || '') ||
    editForm.bio !== (profile.profile.bio || '') ||
    editForm.phone !== (profile.profile.phone || '') ||
    editForm.avatarUrl !== (profile.profile.avatarUrl || '') ||
    editForm.showCity !== (profile.profile.showCity !== false) ||
    editForm.showAge !== (profile.profile.showAge === true) ||
    editForm.showCountry !== (profile.profile.showCountry !== false)
  ) : false;

  const resetForm = () => {
    if (profile?.profile?.nickname) {
      api.getPlayerActivity(profile.profile.nickname).then(setActivity).catch(() => {});
      api.getPublicProfile(profile.profile.nickname).then((p: any) => setRankProgress(p.rankProgress)).catch(() => {});
    }
    if (profile?.profile) {
      setEditForm({
        nickname: profile.profile.nickname || '',
        firstName: profile.profile.firstName || '',
        lastName: profile.profile.lastName || '',
        language: profile.profile.language || 'ru',
        showRealName: profile.profile.showRealName || false,
        dateOfBirth: profile.profile.dateOfBirth ? String(profile.profile.dateOfBirth).split('T')[0] : '',
        gender: profile.profile.gender || '',
        city: profile.profile.city || '',
        bio: profile.profile.bio || '',
        phone: profile.profile.phone || '',
        avatarUrl: profile.profile.avatarUrl || '',
        showCity: profile.profile.showCity !== false,
        showAge: profile.profile.showAge === true,
        showCountry: profile.profile.showCountry !== false,
      });
    }
  };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = profile?.playerStats;
  const rankInfo = stats?.rank;

  const tabs = [
    { id: 'stats', label: pt.tabStats },
    { id: 'achievements', label: pt.tabAchievements },
    { id: 'answers', label: pt.tabAnswers },
    { id: 'tournaments', label: pt.tabTournaments },
    { id: 'settings', label: pt.tabSettings },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="text-white/40 hover:text-white text-sm transition-colors">← {t.common.back}</button>
          <h2 className="text-white font-semibold">{t.nav.profile}</h2>
          <div />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile header */}
        <div className="card-glow mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-3xl font-black text-white shrink-0">
              {profile?.profile?.nickname?.[0]?.toUpperCase() || '?'}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-brand-400">{profile?.profile?.nickname}</h1>
              {profile?.profile?.showRealName && (
                <p className="text-white/50 text-sm mt-0.5">{profile?.profile?.firstName} {profile?.profile?.lastName}</p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                {profile?.profile?.countryCode && (
                  <span className="badge-draft">{profile.profile.flagCode?.toUpperCase()} {profile.profile.countryCode}</span>
                )}
                <span className="badge-draft">{user.role}</span>
                {profile?.emailVerifiedAt ? (
                  <span className="badge-finished">{pt.emailVerified}</span>
                ) : (
                  <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20">{pt.emailNotVerified}</span>
                )}
              </div>
            </div>

            {/* Rank */}
            {rankInfo && (
              <div className="text-center shrink-0">
                <div className="text-4xl">{rankInfo.icon}</div>
                <div className="text-sm font-semibold text-white/60 mt-1">{rankInfo.title}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-sm whitespace-nowrap transition-all ${
                tab === tb.id ? 'bg-brand-500/10 text-brand-400 font-semibold' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* Stats tab */}
        {tab === 'stats' && stats && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: pt.totalAnswered, value: stats.totalAnswered, color: 'text-white' },
                { label: pt.correct, value: stats.totalCorrect, color: 'text-green-400' },
                { label: pt.wrong, value: stats.totalWrong, color: 'text-red-400' },
                { label: pt.accuracy, value: `${stats.accuracyPercent}%`, color: 'text-brand-400' },
                { label: pt.bestStreak, value: stats.bestStreak, color: 'text-accent-400' },
                { label: pt.currentStreak, value: stats.currentStreak, color: 'text-accent-400' },
                { label: pt.wins12_0, value: stats.wins12_0, color: 'text-green-400' },
                { label: pt.losses0_12, value: stats.losses0_12, color: 'text-red-400' },
              ].map((s, i) => (
                <div key={i} className="card text-center">
                  <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
                  <div className="text-white/30 text-[11px] mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Finals */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white/50 mb-3">{pt.finals}</h3>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { label: pt.weekly, value: stats.weeklyFinals },
                  { label: pt.monthly, value: stats.monthlyFinals },
                  { label: pt.seasonal, value: stats.seasonFinals },
                  { label: pt.yearly, value: stats.yearlyFinals },
                ].map((f, i) => (
                  <div key={i}>
                    <div className="text-lg font-bold font-mono text-white/60">{f.value}</div>
                    <div className="text-[10px] text-white/25">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Rank progress */}
            {rankProgress && (
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {rankProgress.current && (
                      <span className="text-2xl">{rankProgress.current.icon}</span>
                    )}
                    <span className="text-white font-semibold">{rankTitle(rankProgress.current, locale) || pt.noRank}</span>
                  </div>
                  {rankProgress.next && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/50">→</span>
                      <span className="text-2xl opacity-60">{rankProgress.next.icon}</span>
                      <span className="text-white/70">{rankTitle(rankProgress.next, locale)}</span>
                    </div>
                  )}
                </div>
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
                    style={{ width: `${rankProgress.progressPct}%` }}
                  />
                </div>
                <div className="text-xs text-white/50 mt-2">
                  {rankProgress.next
                    ? pt.toNextRank.replace('{n}', String(rankProgress.toNext)).replace('{rank}', rankTitle(rankProgress.next, locale))
                    : pt.maxRank}
                </div>
              </div>
            )}
            {/* Activity heatmap */}
            {activity?.heatmap?.length > 0 && (
              <div className="card">
                <ActivityHeatmap heatmap={activity.heatmap} />
              </div>
            )}
            {/* Weekly chart */}
            {activity?.weekly?.length > 0 && (
              <div className="card">
                <WeeklyChart weekly={activity.weekly} />
              </div>
            )}
          </div>
        )}

        {/* Answers tab */}
        {tab === 'achievements' && (
          <div className="animate-fade-in">
            <div className="card">
              <AchievementsGrid achievements={achievements} showLocked={true} />
            </div>
          </div>
        )}
        {tab === 'answers' && history && (
          <div className="animate-fade-in space-y-2">
            {history.data?.length === 0 ? (
              <div className="card text-center py-12 text-white/30">{pt.noAnswersYet}</div>
            ) : history.data?.map((a: any) => (
              <div key={a.id} className="card flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-white/40 text-xs mb-1">
                    {a.question?.localizations?.find((l: any) => l.language === locale)?.questionText
                      || a.question?.localizations?.[0]?.questionText || '—'}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">"{a.answerText}"</span>
                    {a.decision === 'ACCEPTED' && <span className="text-green-400 text-xs font-semibold">✓</span>}
                    {a.decision === 'REJECTED' && <span className="text-red-400 text-xs font-semibold">✗</span>}
                    {!a.decision && <span className="text-white/20 text-xs">{pt.awaitingJudgement}</span>}
                  </div>
                </div>
                <div className="text-white/20 text-[10px] font-mono shrink-0 ml-3">
                  {new Date(a.submittedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {history?.pagination?.totalPages > 1 && (
              <p className="text-center text-white/20 text-xs mt-4">{pt.pageOf.replace('{p}', String(history.pagination.page)).replace('{t}', String(history.pagination.totalPages))}</p>
            )}
          </div>
        )}

        {/* Tournaments tab */}
        {tab === 'tournaments' && (
          <div className="animate-fade-in space-y-2">
            {tournamentHistory.length === 0 ? (
              <div className="card text-center py-12 text-white/30">{pt.noTournaments}</div>
            ) : tournamentHistory.map((tp: any) => (
              <div key={tp.id} className="card-hover flex items-center justify-between"
                onClick={() => router.push(`/game/${tp.tournament?.id}`)}>
                <div>
                  <span className="text-white font-medium">{tp.tournament?.title}</span>
                  <div className="flex gap-2 mt-1">
                    <span className="badge-draft text-[10px]">{tp.tournament?.type}</span>
                    <span className={`badge text-[10px] ${
                      tp.matchStatus === 'WON' ? 'badge-finished' : tp.matchStatus === 'LOST' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'badge-draft'
                    }`}>{tp.matchStatus}</span>
                  </div>
                </div>
                <div className="font-mono font-bold text-sm">
                  <span className="text-brand-400">{tp.currentScoreUser}</span>
                  <span className="text-white/20 mx-1">:</span>
                  <span className="text-red-400">{tp.currentScoreSystem}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings tab */}
        {tab === 'settings' && (
          <div className="animate-fade-in">
            <div className="card space-y-4">
              <div>
                <label className="input-label">{pt.avatar}</label>
                <AvatarUploader
                  currentUrl={editForm.avatarUrl}
                  fallbackText={editForm.nickname || profile?.profile?.nickname}
                  onUpload={(url) => setEditForm({...editForm, avatarUrl: url})}
                  
                />
              </div>
              <div>
                <label className="input-label">{pt.nickname}</label>
                <input type="text" value={editForm.nickname} onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                  className="input-field"  placeholder="my_nickname" />
                <p className="text-white/20 text-[10px] mt-1">{pt.nicknameHint}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">{t.auth.firstName}</label>
                  <input type="text" value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                    className="input-field"  />
                </div>
                <div>
                  <label className="input-label">{t.auth.lastName}</label>
                  <input type="text" value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                    className="input-field"  />
                </div>
              </div>

              <div>
                <label className="input-label">{pt.language}</label>
                <select value={editForm.language} onChange={(e) => setEditForm({...editForm, language: e.target.value})}
                  className="input-field" >
                  <option value="ru">{pt.russian}</option>
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">{pt.dateOfBirth}</label>
                  <input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})}
                    className="input-field"  />
                </div>
                <div>
                  <label className="input-label">{pt.gender}</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                    className="input-field"  style={{colorScheme:'dark'}}>
                    <option value="">{pt.notSpecified}</option>
                    <option value="male">{pt.male}</option>
                    <option value="female">{pt.female}</option>
                    <option value="other">{pt.other}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">{pt.city}</label>
                <input type="text" value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                  className="input-field"  placeholder="Berlin, Moscow, etc." />
              </div>
              <div>
                <label className="input-label">{pt.phone} {pt.phoneOptional}</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="input-field"  placeholder="+49..." />
              </div>
              <div>
                <label className="input-label">{pt.about} <span className="text-white/30">({editForm.bio.length}/500)</span></label>
                <textarea value={editForm.bio} onChange={(e) => setEditForm({...editForm, bio: e.target.value.slice(0, 500)})}
                  className="input-field min-h-[80px] resize-y"  rows={3}
                  placeholder={pt.bioPlaceholder} />
              </div>
              <div className="pt-3 border-t border-white/[0.05]">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">{pt.privacyTitle}</div>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={editForm.showRealName}
                      onChange={(e) => setEditForm({...editForm, showRealName: e.target.checked})}
                      className="w-4 h-4 rounded bg-dark-700 border-white/20 accent-brand-500" />
                    <span className="text-white/70 text-sm">{pt.showRealName}</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={editForm.showCountry}
                      onChange={(e) => setEditForm({...editForm, showCountry: e.target.checked})}
                      className="w-4 h-4 rounded bg-dark-700 border-white/20 accent-brand-500" />
                    <span className="text-white/70 text-sm">{pt.showCountry}</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={editForm.showCity}
                      onChange={(e) => setEditForm({...editForm, showCity: e.target.checked})}
                      className="w-4 h-4 rounded bg-dark-700 border-white/20 accent-brand-500" />
                    <span className="text-white/70 text-sm">{pt.showCity}</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={editForm.showAge}
                      onChange={(e) => setEditForm({...editForm, showAge: e.target.checked})}
                      className="w-4 h-4 rounded bg-dark-700 border-white/20 accent-brand-500" />
                    <span className="text-white/70 text-sm">{pt.showAge}</span>
                  </label>
                </div>
                <div className="text-[10px] text-white/30 mt-3">{pt.emailNeverShown}</div>
              </div>

              {saveMsg && !hasChanges && <div className="text-green-400 text-sm">{saveMsg}</div>}
            </div>

            <div className="card mt-4">
              <h3 className="text-white font-semibold mb-3">{pt.myDataGdpr}</h3>
              <p className="text-white/40 text-xs mb-4">{pt.gdprText}</p>
              <div className="space-y-2">
                <button onClick={async () => {
                  try {
                    const token = localStorage.getItem('accessToken');
                    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '/api') + '/me/gdpr/export', {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `30sec-data-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch(e:any) { alert(pt.exportError + e.message); }
                }} className="btn-secondary text-sm w-full text-center">
                  {pt.downloadData}
                </button>
                <button onClick={async () => {
                  const pwd = prompt(pt.promptPassword);
                  if (!pwd) return;
                  if (!confirm(pt.confirmDelete)) return;
                  try {
                    const token = localStorage.getItem('accessToken');
                    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '/api') + '/me/gdpr/delete-account', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirmPassword: pwd })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message?.[0] || data.message || pt.errorGeneric);
                    alert(pt.deletedSuccess);
                    logout();
                    router.push('/');
                  } catch(e:any) { alert(pt.errorPrefix + e.message); }
                }} className="text-sm w-full text-center px-4 py-2.5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-medium">
                  {pt.deleteAccount}
                </button>
              </div>
            </div>

            <div className="card mt-4 border-red-500/10">
              <button onClick={() => { logout(); router.push('/'); }} className="btn-danger text-sm w-full text-center">
                {t.nav.logout}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
