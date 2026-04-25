'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function formatBytes(mb: number) {
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}д ${h}ч ${m}м`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

export default function HealthTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const d = await api.getSystemHealth();
      setData(d);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(refresh, 15000);
    return () => clearInterval(iv);
  }, [autoRefresh]);

  const statusBadge = (ok: boolean) => ok
    ? <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">● OK</span>
    : <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">● FAIL</span>;

  if (loading && !data) return <div className="card text-center py-10 text-white/40">Загрузка...</div>;
  if (!data) return <div className="card text-center py-10 text-red-400">Ошибка загрузки</div>;

  const c = data.counts || {};

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-xl font-bold text-white">Здоровье системы</h2>
        <div className="flex items-center gap-3 text-xs">
          {lastRefresh && <span className="text-white/40">Обновлено {lastRefresh.toLocaleTimeString('ru-RU')}</span>}
          <label className="flex items-center gap-1.5 text-white/60 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-brand-500" />
            Авто (15с)
          </label>
          <button onClick={refresh} className="text-brand-400 hover:text-brand-300">↻ Обновить</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* API */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">⚙️ API</h3>
            {statusBadge(data.api?.ok)}
          </div>
          <div className="space-y-1.5 text-xs">
            <Row label="Uptime" value={formatUptime(data.api?.uptimeSeconds || 0)} />
            <Row label="Node" value={data.api?.nodeVersion} />
            <Row label="RSS память" value={formatBytes(data.api?.memoryMB?.rss || 0)} />
            <Row label="Heap used" value={formatBytes(data.api?.memoryMB?.heapUsed || 0)} />
            <Row label="Heap total" value={formatBytes(data.api?.memoryMB?.heapTotal || 0)} />
          </div>
        </div>

        {/* Database */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">🗄️ База данных</h3>
            {statusBadge(data.database?.ok)}
          </div>
          <div className="space-y-1.5 text-xs">
            <Row label="Latency" value={data.database?.latencyMs != null ? `${data.database.latencyMs} ms` : '—'} />
            {data.database?.error && <div className="text-red-400 text-[10px]">{data.database.error}</div>}
          </div>
        </div>

        {/* Redis */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">🔴 Redis</h3>
            {statusBadge(data.redis?.ok)}
          </div>
          <div className="text-xs text-white/60">
            {data.redis?.configured ? 'Настроен' : 'Не настроен'}
          </div>
        </div>

        {/* Disk */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">💾 Диск</h3>
            {statusBadge(data.disk?.ok)}
          </div>
          {data.disk?.ok && (
            <>
              <div className="space-y-1.5 text-xs mb-2">
                <Row label="Использовано" value={`${data.disk.usedGB} GB / ${data.disk.totalGB} GB`} />
                <Row label="Свободно" value={`${data.disk.freeGB} GB`} />
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    data.disk.usagePct > 90 ? 'bg-red-500' :
                    data.disk.usagePct > 75 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${data.disk.usagePct}%` }}
                />
              </div>
              <div className="text-[10px] text-white/40 mt-1 text-right">{data.disk.usagePct}%</div>
            </>
          )}
        </div>
      </div>

      {/* Counts */}
      {c.ok && (
        <div className="card mt-3">
          <h3 className="text-sm font-semibold text-white mb-3">📊 Статистика данных</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <Stat label="Юзеров" value={c.users} />
            <Stat label="Профилей" value={c.profiles} />
            <Stat label="Турниров" value={c.tournaments} />
            <Stat label="Вопросов всего" value={c.questions} />
            <Stat label="Активных вопросов" value={c.activeQuestions} highlight={c.activeQuestions < 30} />
            <Stat label="Ответов" value={c.answers} />
            <Stat label="Сессий" value={c.sessions} />
            <Stat label="Feedback" value={c.feedback} />
            <Stat label="Новых FB" value={c.newFeedback} highlight={c.newFeedback > 0} />
          </div>
        </div>
      )}

      <div className="text-[10px] text-white/30 mt-4 text-center">
        Бэкап: {data.backup?.note}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-white/40">{label}</span>
      <span className="text-white/80 font-mono">{value || '—'}</span>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/[0.02]'}`}>
      <div className={`text-xl font-black ${highlight ? 'text-amber-400' : 'text-white'}`}>{value ?? '—'}</div>
      <div className="text-[10px] uppercase text-white/40 mt-0.5">{label}</div>
    </div>
  );
}
