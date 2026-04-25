'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const STATUS_LABELS: Record<string, { ru: string; cls: string }> = {
  new: { ru: 'Новое', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  reviewed: { ru: 'Просмотрено', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  resolved: { ru: 'Решено', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  wontfix: { ru: 'Не будет', cls: 'bg-white/5 text-white/40 border-white/10' },
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Баг',
  suggestion: '💡 Предложение',
  question: '❓ Вопрос',
  other: '💬 Другое',
};

function formatDateTime(d: string | Date) {
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function FeedbackTab() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selected, setSelected] = useState<any>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([
        api.getFeedbackList({ status: statusFilter || undefined, category: categoryFilter || undefined, limit: 100 }),
        api.getFeedbackStats(),
      ]);
      setItems(list.items || []);
      setStats(st);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [statusFilter, categoryFilter]);

  const openItem = (it: any) => {
    setSelected(it);
    setEditStatus(it.status);
    setEditNotes(it.adminNotes || '');
  };

  const saveItem = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.updateFeedback(selected.id, { status: editStatus, adminNotes: editNotes });
      await refresh();
      setSelected(null);
    } catch (e: any) { alert('Ошибка: ' + e.message); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="text-xl font-bold text-white">Обратная связь</h2>
        {stats && (
          <div className="text-sm text-white/40">
            Всего: <span className="text-white font-bold">{stats.total}</span>
            {stats.newCount > 0 && (
              <span className="ml-3">Новых: <span className="text-blue-400 font-bold">{stats.newCount}</span></span>
            )}
          </div>
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {Object.entries(stats.byCategory || {}).map(([cat, count]) => (
            <div key={cat} className="card text-center py-3 px-2">
              <div className="text-xl font-bold text-white">{String(count)}</div>
              <div className="text-[10px] uppercase text-white/40 mt-0.5">{CATEGORY_LABELS[cat] || cat}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-2 items-center">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{colorScheme:'dark'}} className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          <option value="">Все статусы</option>
          <option value="new">Новые</option>
          <option value="reviewed">Просмотрено</option>
          <option value="resolved">Решено</option>
          <option value="wontfix">Не будет</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{colorScheme:'dark'}} className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm">
          <option value="">Все категории</option>
          <option value="bug">🐛 Баги</option>
          <option value="suggestion">💡 Предложения</option>
          <option value="question">❓ Вопросы</option>
          <option value="other">💬 Другое</option>
        </select>
      </div>

      {loading ? (
        <div className="card text-center py-10 text-white/40">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-10 text-white/40">Нет сообщений</div>
      ) : (
        <div className="space-y-2">
          {items.map(it => {
            const s = STATUS_LABELS[it.status] || { ru: it.status, cls: '' };
            return (
              <div key={it.id} onClick={() => openItem(it)} className="card hover:border-brand-500/30 cursor-pointer transition">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white/50">{CATEGORY_LABELS[it.category] || it.category}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border ${s.cls}`}>{s.ru}</span>
                      {it.user?.profile?.nickname && (
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/player/${it.user.profile.nickname}`); }} className="text-[11px] text-white/50 hover:text-brand-400 hover:underline">
                          @{it.user.profile.nickname}
                        </button>
                      )}
                      {!it.user && it.email && <span className="text-[11px] text-white/40 font-mono">{it.email}</span>}
                    </div>
                    <div className="text-white font-semibold text-sm mt-1">{it.subject}</div>
                    <div className="text-white/50 text-xs mt-1 line-clamp-2">{it.message}</div>
                  </div>
                  <div className="text-white/30 text-[10px] whitespace-nowrap shrink-0">{formatDateTime(it.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-dark-800 border border-white/10 rounded-2xl max-w-2xl w-full my-8 animate-slide-up">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-dark-800 z-10">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.subject}</h3>
                <div className="text-xs text-white/40 mt-0.5">
                  {CATEGORY_LABELS[selected.category]} · {formatDateTime(selected.createdAt)}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Author */}
              <div className="bg-white/[0.02] rounded-xl p-3 text-sm">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Автор</div>
                {selected.user ? (
                  <div className="flex items-center gap-2">
                    {selected.user.profile?.avatarUrl && <img src={selected.user.profile.avatarUrl} className="w-7 h-7 rounded-lg" alt="" />}
                    <div>
                      <div className="text-white">{selected.user.profile?.nickname || selected.user.email}</div>
                      <div className="text-xs text-white/40">{selected.user.email}</div>
                    </div>
                  </div>
                ) : selected.email ? (
                  <div className="text-white">{selected.email} <span className="text-white/30 text-xs">(анонимно)</span></div>
                ) : (
                  <div className="text-white/40">Анонимно</div>
                )}
              </div>

              {/* Message */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">Сообщение</div>
                <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap break-words bg-white/[0.02] rounded-xl p-3">
                  {selected.message}
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selected.url && <div className="bg-white/[0.02] rounded-xl p-3"><div className="text-white/40 text-[10px] uppercase mb-1">URL</div><div className="text-white/70 truncate">{selected.url}</div></div>}
                {selected.ipAddress && <div className="bg-white/[0.02] rounded-xl p-3"><div className="text-white/40 text-[10px] uppercase mb-1">IP</div><div className="text-white/70 font-mono">{selected.ipAddress}</div></div>}
                {selected.userAgent && <div className="bg-white/[0.02] rounded-xl p-3 col-span-2"><div className="text-white/40 text-[10px] uppercase mb-1">User-Agent</div><div className="text-white/60 text-[10px] break-all">{selected.userAgent}</div></div>}
              </div>

              {/* Edit status */}
              <div className="pt-3 border-t border-white/[0.05]">
                <label className="input-label">Статус</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="input-field" style={{colorScheme:'dark'}}>
                  <option value="new">Новое</option>
                  <option value="reviewed">Просмотрено</option>
                  <option value="resolved">Решено</option>
                  <option value="wontfix">Не будет</option>
                </select>
              </div>

              {/* Admin notes */}
              <div>
                <label className="input-label">Заметка администратора (только для вас)</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value.slice(0, 2000))}
                  rows={3} className="input-field resize-y min-h-[80px]" placeholder="Внутренние заметки..." />
              </div>

              <button onClick={saveItem} disabled={saving} className="btn-primary w-full text-center">
                {saving ? 'Сохраняем...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
