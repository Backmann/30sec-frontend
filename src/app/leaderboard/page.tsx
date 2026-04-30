'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { detectLocale, getTranslation, Locale } from '@/lib/i18n';
import { rankTitle } from '@/lib/ranks';

const LB_STR: Record<Locale, {
  topPlayers: string;
  byAccuracy: string;
  ranks: string;
  noData: string;
  answers: string;
  streak: string;
  correct: string;
  accuracyLabel: string;
  fromCorrectAnswers: string;
}> = {
  ru: {
    topPlayers: '🔥 Топ игроки',
    byAccuracy: '🎯 По точности',
    ranks: '⭐ Ранги',
    noData: 'Пока нет данных',
    answers: 'ответов',
    streak: 'серия',
    correct: 'правильных',
    accuracyLabel: 'точность',
    fromCorrectAnswers: 'от {n} правильных ответов',
  },
  en: {
    topPlayers: '🔥 Top players',
    byAccuracy: '🎯 By accuracy',
    ranks: '⭐ Ranks',
    noData: 'No data yet',
    answers: 'answers',
    streak: 'streak',
    correct: 'correct',
    accuracyLabel: 'accuracy',
    fromCorrectAnswers: 'from {n} correct answers',
  },
  de: {
    topPlayers: '🔥 Top-Spieler',
    byAccuracy: '🎯 Nach Genauigkeit',
    ranks: '⭐ Ränge',
    noData: 'Noch keine Daten',
    answers: 'Antworten',
    streak: 'Serie',
    correct: 'richtig',
    accuracyLabel: 'Genauigkeit',
    fromCorrectAnswers: 'ab {n} richtigen Antworten',
  },
};

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const locale = detectLocale();
  const t = getTranslation(locale);
  const lt = LB_STR[locale];

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [ranks, setRanks] = useState<any[]>([]);
  const [tab, setTab] = useState<'top' | 'accuracy' | 'ranks'>('top');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
    Promise.all([
      api.getGlobalLeaderboard(100),
      api.getRanks(),
    ]).then(([lb, rk]) => {
      setLeaderboard(lb);
      setRanks(rk);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN');

  const getMedal = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `${pos}`;
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/dashboard')} className="text-xl font-display font-black tracking-tight">
              <span className="text-white">30</span><span className="text-brand-400">sec</span><span className="text-accent-400">.</span>
            </button>
            <nav className="hidden sm:flex items-center gap-1">
              <button onClick={() => router.push('/dashboard')} className="nav-link">{t.nav.home}</button>
              <button className="nav-link-active">{t.nav.leaderboard}</button>
              {isAdmin && <button onClick={() => router.push('/admin')} className="nav-link text-accent-400">{t.nav.admin}</button>}
            </nav>
          </div>
          {user && (
            <button onClick={() => router.push('/profile')} className="text-brand-400 text-sm font-semibold hover:text-brand-300 transition-colors">
              {user.profile?.nickname}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-6 animate-fade-in">
          🏆 {t.nav.leaderboard}
        </h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {[
            { id: 'top', label: lt.topPlayers },
            { id: 'accuracy', label: lt.byAccuracy },
            { id: 'ranks', label: lt.ranks },
          ].map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-sm transition-all ${
                tab === tb.id ? 'bg-brand-500/10 text-brand-400 font-semibold' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}>
              {tb.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Top players */}
            {(tab === 'top' || tab === 'accuracy') && (
              <div className="space-y-2 animate-fade-in">
                {leaderboard.length === 0 ? (
                  <div className="card text-center py-16 text-white/30">{lt.noData}</div>
                ) : leaderboard
                  .sort((a, b) => tab === 'accuracy'
                    ? parseFloat(b.accuracyPercent) - parseFloat(a.accuracyPercent)
                    : b.totalCorrect - a.totalCorrect)
                  .map((p, idx) => {
                    const isMe = user && p.nickname === user.profile?.nickname;
                    const pos = idx + 1;
                    const isTop3 = pos <= 3;

                    return (
                      <div key={idx}
                        className={`card-hover flex items-center justify-between ${isMe ? 'border-brand-500/20 bg-brand-500/5' : ''} ${isTop3 ? 'border-accent-500/10' : ''}`}
                        onClick={() => router.push(`/player/${p.nickname}`)}>
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Position */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                            pos === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                            pos === 2 ? 'bg-gray-400/20 text-gray-300' :
                            pos === 3 ? 'bg-amber-600/20 text-amber-500' :
                            'bg-white/[0.03] text-white/30'
                          }`}>
                            {isTop3 ? getMedal(pos) : pos}
                          </div>

                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600/30 to-brand-800/30 flex items-center justify-center text-sm font-bold text-brand-400 shrink-0">
                            {p.nickname[0].toUpperCase()}
                          </div>

                          {/* Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${isMe ? 'text-brand-400' : 'text-white'}`}>{p.nickname}</span>
                              {p.flagCode && <span className="text-white/20 text-[10px]">{p.flagCode.toUpperCase()}</span>}
                              {p.rank && <span className="text-[10px]">{p.rank.icon}</span>}
                            </div>
                            <div className="text-white/25 text-[10px] mt-0.5">
                              {p.totalAnswered} {lt.answers} · {lt.streak} {p.bestStreak}
                            </div>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          {tab === 'accuracy' ? (
                            <div className="text-lg font-black font-mono text-brand-400">{p.accuracyPercent}%</div>
                          ) : (
                            <div className="text-lg font-black font-mono text-green-400">{p.totalCorrect}</div>
                          )}
                          <div className="text-white/20 text-[10px]">
                            {tab === 'accuracy' ? `${p.totalCorrect} ${lt.correct}` : `${p.accuracyPercent}% ${lt.accuracyLabel}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Ranks */}
            {tab === 'ranks' && (
              <div className="space-y-3 animate-fade-in">
                {ranks.map((rank, idx) => (
                  <div key={rank.id} className="card flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{rank.icon}</div>
                      <div>
                        <h3 className="text-white font-bold">{rankTitle(rank, locale)}</h3>
                        <p className="text-white/30 text-xs mt-0.5">{lt.fromCorrectAnswers.replace('{n}', String(rank.thresholdCorrectAnswers))}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-white/20">{rank.thresholdCorrectAnswers}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
