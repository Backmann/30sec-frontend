'use client';

interface Day {
  date: string;
  total: number;
  correct: number;
}

interface Props {
  heatmap: Day[];
}

function intensity(total: number): string {
  if (total === 0) return 'bg-white/[0.04]';
  if (total <= 2) return 'bg-brand-500/30';
  if (total <= 5) return 'bg-brand-500/55';
  if (total <= 10) return 'bg-brand-500/80';
  return 'bg-brand-500';
}

export default function ActivityHeatmap({ heatmap }: Props) {
  if (!heatmap?.length) return null;

  // Group by week: find first Monday before heatmap[0].date
  const firstDate = new Date(heatmap[0].date);
  const dayOfWeek = (firstDate.getDay() + 6) % 7; // 0=Mon .. 6=Sun
  const padDays = dayOfWeek;
  const padded: (Day | null)[] = Array(padDays).fill(null).concat(heatmap);

  // Group into weeks of 7
  const weeks: (Day | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const totalAnswers = heatmap.reduce((s, d) => s + d.total, 0);
  const activeDays = heatmap.filter(d => d.total > 0).length;

  // Month labels — rough: pick first day of each month
  const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Активность за год
        </div>
        <div className="text-xs text-white/50">
          <span className="text-white font-bold">{totalAnswers}</span> ответов · <span className="text-white font-bold">{activeDays}</span> дней
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]" style={{ minWidth: weeks.length * 13 }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-[10px] h-[10px] rounded-[2px] ${day ? intensity(day.total) : 'bg-transparent'}`}
                  title={day ? `${day.date}: ${day.total} ответов, ${day.correct} правильных` : ''}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-white/40">
        <span>Меньше</span>
        <div className="flex gap-[3px]">
          <div className="w-[10px] h-[10px] rounded-[2px] bg-white/[0.04]" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-brand-500/30" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-brand-500/55" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-brand-500/80" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-brand-500" />
        </div>
        <span>Больше</span>
      </div>
    </div>
  );
}
