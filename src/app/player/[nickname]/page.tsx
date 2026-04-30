'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import AchievementsGrid from '@/components/AchievementsGrid';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import WeeklyChart from '@/components/WeeklyChart';
import { detectLocale, Locale } from '@/lib/i18n';

const PL_STR: Record<Locale, {
  notFound: string;
  toLeaderboard: string;
  back: string;
  leaderboard: string;
  yearsOld: string;
  playingSince: string;
  wins: string;
  losses: string;
  winrate: string;
  accuracy: string;
  tournaments: string;
  answers: string;
  correct: string;
  bestStreak: string;
  noRank: string;
  toNextRank: string;
  maxRank: string;
  recentTournaments: string;
  achievements: string;
}> = {
  ru: {
    notFound: 'Игрок не найден',
    toLeaderboard: '← Рейтинг',
    back: '← Назад',
    leaderboard: 'Рейтинг',
    yearsOld: 'лет',
    playingSince: 'Играет с',
    wins: 'Побед',
    losses: 'Поражений',
    winrate: 'Winrate',
    accuracy: 'Точность',
    tournaments: 'Турниров',
    answers: 'Ответов',
    correct: 'Правильных',
    bestStreak: 'Лучшая серия',
    noRank: 'Без ранга',
    toNextRank: 'Осталось {n} правильных ответов до «{rank}»',
    maxRank: 'Достигнут максимальный ранг 👑',
    recentTournaments: 'Последние турниры',
    achievements: 'Достижения',
  },
  en: {
    notFound: 'Player not found',
    toLeaderboard: '← Leaderboard',
    back: '← Back',
    leaderboard: 'Leaderboard',
    yearsOld: 'years old',
    playingSince: 'Playing since',
    wins: 'Wins',
    losses: 'Losses',
    winrate: 'Winrate',
    accuracy: 'Accuracy',
    tournaments: 'Tournaments',
    answers: 'Answers',
    correct: 'Correct',
    bestStreak: 'Best streak',
    noRank: 'No rank',
    toNextRank: '{n} correct answers to reach «{rank}»',
    maxRank: 'Max rank reached 👑',
    recentTournaments: 'Recent tournaments',
    achievements: 'Achievements',
  },
  de: {
    notFound: 'Spieler nicht gefunden',
    toLeaderboard: '← Rangliste',
    back: '← Zurück',
    leaderboard: 'Rangliste',
    yearsOld: 'Jahre alt',
    playingSince: 'Spielt seit',
    wins: 'Siege',
    losses: 'Niederlagen',
    winrate: 'Winrate',
    accuracy: 'Genauigkeit',
    tournaments: 'Turniere',
    answers: 'Antworten',
    correct: 'Richtige',
    bestStreak: 'Beste Serie',
    noRank: 'Kein Rang',
    toNextRank: 'Noch {n} richtige Antworten bis «{rank}»',
    maxRank: 'Höchster Rang erreicht 👑',
    recentTournaments: 'Letzte Turniere',
    achievements: 'Erfolge',
  },
};

function formatDate(d: string | Date | null | undefined, locale: Locale = 'ru') {
  if (!d) return '—';
  const localeMap: Record<Locale, string> = { ru: 'ru-RU', en: 'en-GB', de: 'de-DE' };
  return new Date(d).toLocaleDateString(localeMap[locale], { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PlayerPage() {
  const params = useParams();
  const nickname = params.nickname as string;
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('ru');
  useEffect(() => { setLocale(detectLocale()); }, []);
  const pl = PL_STR[locale];
  const [player, setPlayer] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getPublicProfile(nickname).then(setPlayer).catch(() => setError(true));
    api.getPublicAchievements(nickname).then(setAchievements).catch(() => {});
    api.getPlayerActivity(nickname).then(setActivity).catch(() => {});
  }, [nickname]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 opacity-30">🔍</div>
        <p className="text-white/40">{pl.notFound}</p>
        <button onClick={() => router.push('/leaderboard')} className="btn-secondary text-sm mt-4">{pl.toLeaderboard}</button>
      </div>
    </div>
  );

  if (!player) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = player.stats;

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-white/40 hover:text-white text-sm">{pl.back}</button>
          <span className="text-white font-semibold">{player.nickname}</span>
          <button onClick={() => router.push('/leaderboard')} className="text-white/40 hover:text-white text-sm">{pl.leaderboard}</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="card-glow text-center mb-6 animate-fade-in py-8 px-6">
          <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-4xl font-black text-white mx-auto mb-4 shadow-xl">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={player.nickname} className="w-full h-full object-cover" />
            ) : (
              player.nickname[0].toUpperCase()
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">{player.nickname}</h1>
          {(player.firstName || player.lastName) && (
            <p className="text-white/50 mt-1 text-sm">{[player.firstName, player.lastName].filter(Boolean).join(' ')}</p>
          )}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-3">
            {player.countryCode && (
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-white/70 text-xs font-mono">
                {player.flagCode?.toUpperCase()} {player.countryCode}{player.city ? ` · ${player.city}` : ''}
              </span>
            )}
            {player.age && (
              <span className="px-2.5 py-1 rounded-lg bg-white/5 text-white/70 text-xs">
                {player.age} {pl.yearsOld}
              </span>
            )}
            {player.rank && (
              <span className="px-2.5 py-1 rounded-lg bg-accent-500/10 text-accent-400 text-xs font-semibold">
                {player.rank.icon} {player.rank.title}
              </span>
            )}
          </div>
          {player.bio && (
            <p className="text-white/60 text-sm mt-4 max-w-md mx-auto italic">"{player.bio}"</p>
          )}
          <p className="text-white/25 text-xs mt-4">{pl.playingSince} {formatDate(player.memberSince, locale)}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <StatCard label={pl.wins} value={stats.wins} color="text-accent-400" icon="🏆" />
          <StatCard label={pl.losses} value={stats.losses} color="text-red-400" icon="·" />
          <StatCard label={pl.winrate} value={`${stats.winRate}%`} color="text-brand-400" icon="⚡" />
          <StatCard label={pl.accuracy} value={`${stats.accuracy}%`} color="text-green-400" icon="🎯" />
          <StatCard label={pl.tournaments} value={stats.tournamentsPlayed} color="text-white" icon="🎮" />
          <StatCard label={pl.answers} value={stats.answersTotal} color="text-white/70" icon="💭" />
          <StatCard label={pl.correct} value={stats.answersCorrect} color="text-green-400" icon="✓" />
          <StatCard label={pl.bestStreak} value={stats.bestStreak} color="text-accent-400" icon="🔥" />
        </div>

        {/* Rank progress */}
        {player.rankProgress && (
          <div className="card mb-6 animate-slide-up" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {player.rankProgress.current && (
                  <span className="text-2xl">{player.rankProgress.current.icon}</span>
                )}
                <span className="text-white font-semibold">{player.rankProgress.current?.title || pl.noRank}</span>
              </div>
              {player.rankProgress.next && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white/50">→</span>
                  <span className="text-2xl opacity-60">{player.rankProgress.next.icon}</span>
                  <span className="text-white/70">{player.rankProgress.next.title}</span>
                </div>
              )}
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
                style={{ width: `${player.rankProgress.progressPct}%` }}
              />
            </div>
            <div className="text-xs text-white/50 mt-2">
              {player.rankProgress.next
                ? pl.toNextRank.replace('{n}', String(player.rankProgress.toNext)).replace('{rank}', player.rankProgress.next.title)
                : pl.maxRank
              }
            </div>
          </div>
        )}

        {/* Activity heatmap */}
        {activity?.heatmap?.length > 0 && (
          <div className="card mb-6 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <ActivityHeatmap heatmap={activity.heatmap} />
          </div>
        )}

        {/* Weekly chart */}
        {activity?.weekly?.length > 0 && (
          <div className="card mb-6 animate-slide-up" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
            <WeeklyChart weekly={activity.weekly} />
          </div>
        )}

        {/* Recent tournaments */}
        {player.recentTournaments?.length > 0 && (
          <div className="card animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">{pl.recentTournaments}</div>
            <div className="space-y-2">
              {player.recentTournaments.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition cursor-pointer" onClick={() => router.push('/watch/' + t.id)}>
                  <span className="text-lg shrink-0">
                    {t.matchStatus === 'WON' ? '🏆' : t.matchStatus === 'LOST' ? '·' : '·'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{t.title}</div>
                    <div className="text-white/40 text-[10px]">{formatDate(t.endAt)}</div>
                  </div>
                  <div className="font-mono text-sm shrink-0">
                    <span className={t.matchStatus === 'WON' ? 'text-accent-400 font-bold' : 'text-white'}>{t.scoreUser}</span>
                    <span className="text-white/30 mx-1">:</span>
                    <span className="text-white/60">{t.scoreSystem}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {achievements.length > 0 && (
          <div className="card mt-6 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">
              {pl.achievements} · {achievements.length}
            </div>
            <AchievementsGrid achievements={achievements} />
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: any; color?: string; icon?: string }) {
  return (
    <div className="card text-center py-4">
      {icon && <div className="text-lg opacity-60 mb-0.5">{icon}</div>}
      <div className={`text-2xl font-black font-mono ${color || 'text-white'}`}>{value}</div>
      <div className="text-white/30 text-[10px] mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}
