'use client';

interface Week {
  weekStart: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface Props {
  weekly: Week[];
}

export default function WeeklyChart({ weekly }: Props) {
  if (!weekly?.length) return null;

  const maxTotal = Math.max(...weekly.map(w => w.total), 1);
  const hasData = weekly.some(w => w.total > 0);

  if (!hasData) {
    return (
      <div className="text-center py-6 text-white/30 text-sm">
        Нет активности за последние 12 недель
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Точность по неделям
        </div>
        <div className="text-xs text-white/50">последние 12 недель</div>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: '128px' }}>
        {weekly.map((w, i) => {
          const heightPx = w.total > 0 ? Math.max(16, Math.round((w.total / maxTotal) * 110)) : 4;
          const accuracyColor =
            w.accuracy >= 80 ? 'from-green-500 to-green-400' :
            w.accuracy >= 50 ? 'from-brand-500 to-brand-400' :
            w.total > 0 ? 'from-red-500 to-red-400' : '';
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${w.weekStart}: ${w.correct}/${w.total} (${w.accuracy}%)`}>
              <div className="w-full flex flex-col justify-end" style={{ height: '110px' }}>
                <div
                  className={`w-full rounded-t ${w.total === 0 ? 'bg-white/5' : `bg-gradient-to-t ${accuracyColor}`} group-hover:opacity-80 transition`}
                  style={{ height: heightPx + 'px' }}
                />
              </div>
              <div className="text-[9px] text-white/40 font-mono">
                {w.total > 0 ? `${w.accuracy}%` : '·'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
