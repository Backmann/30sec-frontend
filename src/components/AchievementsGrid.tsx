'use client';

interface Achievement {
  id?: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string | Date | null;
}

interface Props {
  achievements: Achievement[];
  /** If true, also show locked achievements as greyed-out. Default false (public profile — only unlocked). */
  showLocked?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: 'Старт',
  wins: 'Победы',
  accuracy: 'Точность',
  speed: 'Скорость',
  streaks: 'Серии',
  decisive: 'Решающие моменты',
  creator: 'Автор',
  social: 'Сообщество',
  activity: 'Активность',
};

export default function AchievementsGrid({ achievements, showLocked = false }: Props) {
  const filtered = showLocked ? achievements : achievements.filter(a => a.unlockedAt);
  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-sm">
        {showLocked ? 'Достижения пока не загружены' : 'Пока нет разблокированных достижений'}
      </div>
    );
  }

  // Group by category
  const grouped: Record<string, Achievement[]> = {};
  for (const a of filtered) {
    const cat = a.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  }

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const totalCount = achievements.length;

  return (
    <div className="space-y-5">
      {showLocked && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/60">
            Разблокировано: <span className="text-brand-400 font-bold">{unlockedCount}</span> из {totalCount}
          </div>
          {totalCount > 0 && (
            <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">
            {CATEGORY_LABELS[cat] || cat}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {items.map(a => (
              <div
                key={a.code}
                className={`rounded-xl p-3 border transition ${
                  a.unlockedAt
                    ? 'bg-gradient-to-br from-accent-500/10 to-brand-500/5 border-accent-500/30'
                    : 'bg-white/[0.02] border-white/[0.05] opacity-50'
                }`}
                title={a.description}
              >
                <div className="text-center">
                  <div className={`text-3xl mb-1 ${!a.unlockedAt && 'grayscale'}`}>{a.icon}</div>
                  <div className={`text-xs font-semibold leading-tight ${a.unlockedAt ? 'text-white' : 'text-white/50'}`}>
                    {a.title}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1 line-clamp-2">{a.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
