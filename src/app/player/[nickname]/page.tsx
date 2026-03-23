'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function PlayerPage() {
  const params = useParams();
  const nickname = params.nickname as string;
  const router = useRouter();
  const [player, setPlayer] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getPublicProfile(nickname).then(setPlayer).catch(() => setError(true));
  }, [nickname]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 opacity-30">🔍</div>
        <p className="text-white/40">Игрок не найден</p>
        <button onClick={() => router.push('/leaderboard')} className="btn-secondary text-sm mt-4">← Рейтинг</button>
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
          <button onClick={() => router.push('/leaderboard')} className="text-white/40 hover:text-white text-sm">← Рейтинг</button>
          <span className="text-white font-semibold">{player.nickname}</span>
          <div />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="card-glow text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-3xl font-black text-white mx-auto mb-4">
            {player.nickname[0].toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold text-brand-400">{player.nickname}</h1>
          {player.firstName && <p className="text-white/40 mt-1">{player.firstName} {player.lastName}</p>}
          <div className="flex items-center justify-center gap-3 mt-3">
            {player.countryCode && <span className="badge-draft">{player.flagCode?.toUpperCase()} {player.countryCode}</span>}
            {stats?.rank && <span className="badge-accent">{stats.rank.icon} {stats.rank.title}</span>}
          </div>
          <p className="text-white/20 text-xs mt-3">С {new Date(player.memberSince).toLocaleDateString()}</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            {[
              { label: 'Ответов', value: stats.totalAnswered, color: 'text-white' },
              { label: 'Правильных', value: stats.totalCorrect, color: 'text-green-400' },
              { label: 'Точность', value: `${stats.accuracyPercent}%`, color: 'text-brand-400' },
              { label: 'Лучшая серия', value: stats.bestStreak, color: 'text-accent-400' },
              { label: 'Побед 12:0', value: stats.wins12_0, color: 'text-green-400' },
              { label: 'Нед. финалы', value: stats.weeklyFinals, color: 'text-white/60' },
              { label: 'Мес. финалы', value: stats.monthlyFinals, color: 'text-white/60' },
              { label: 'Сез. финалы', value: stats.seasonFinals, color: 'text-white/60' },
            ].map((s, i) => (
              <div key={i} className="card text-center">
                <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
                <div className="text-white/25 text-[10px] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
