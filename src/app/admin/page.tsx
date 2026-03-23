'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';

type Tab = 'dashboard' | 'tournaments' | 'questions' | 'judge' | 'users' | 'logs';

export default function AdminPage() {
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [logs, setLogs] = useState<any>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [showCreateT, setShowCreateT] = useState(false);
  const [showCreateQ, setShowCreateQ] = useState(false);
  const [tForm, setTForm] = useState({ title: '', type: 'WEEKLY', theme: '', maxPlayers: '' });
  const [qForm, setQForm] = useState({ category: 'LOGIC', ru_text: '', ru_answer: '', de_text: '', de_answer: '', en_text: '', en_answer: '' });

  useEffect(() => { loadUser().then(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!loading && (!user || !['ADMIN', 'SUPERADMIN'].includes(user.role))) router.push('/dashboard');
  }, [loading, user]);

  useEffect(() => {
    if (tab === 'dashboard') api.getAdminDashboard().then(setDashboard).catch(() => {});
    if (tab === 'tournaments') api.getTournaments().then(setTournaments).catch(() => {});
    if (tab === 'questions') { api.getQuestions().then(setQuestions).catch(() => {}); api.getTournaments().then(setTournaments).catch(() => {}); }
    if (tab === 'users') api.getAdminUsers().then(setUsers).catch(() => {});
    if (tab === 'logs') api.getAdminLogs().then(setLogs).catch(() => {});
    if (tab === 'judge') api.getTournaments().then(setTournaments).catch(() => {});
  }, [tab]);

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const createT = async () => {
    await api.createTournament({ title: tForm.title, type: tForm.type, theme: tForm.theme || undefined, maxPlayers: tForm.maxPlayers ? parseInt(tForm.maxPlayers) : undefined });
    setShowCreateT(false); setTForm({ title: '', type: 'WEEKLY', theme: '', maxPlayers: '' });
    api.getTournaments().then(setTournaments);
  };

  const createQ = async () => {
    const locs: any[] = [];
    if (qForm.ru_text) locs.push({ language: 'ru', questionText: qForm.ru_text, correctAnswer: qForm.ru_answer });
    if (qForm.de_text) locs.push({ language: 'de', questionText: qForm.de_text, correctAnswer: qForm.de_answer });
    if (qForm.en_text) locs.push({ language: 'en', questionText: qForm.en_text, correctAnswer: qForm.en_answer });
    await api.createQuestion({ category: qForm.category, localizations: locs });
    setShowCreateQ(false); setQForm({ category: 'LOGIC', ru_text: '', ru_answer: '', de_text: '', de_answer: '', en_text: '', en_answer: '' });
    api.getQuestions().then(setQuestions);
  };

  const loadAnswers = async (tid: string, qid: string) => {
    setAnswers(await api.getAnswersForQuestion(tid, qid));
  };

  const judgeAnswer = async (aid: string, decision: 'ACCEPTED' | 'REJECTED') => {
    await api.judgeAnswer(aid, decision);
    if (selectedTournament) {
      const tq = selectedTournament.tournamentQuestions?.find((q: any) => !q.isUsed);
      if (tq) loadAnswers(selectedTournament.id, tq.questionId);
    }
  };

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '📊', label: 'Дашборд' },
    { id: 'tournaments', icon: '🏆', label: 'Турниры' },
    { id: 'questions', icon: '❓', label: 'Вопросы' },
    { id: 'judge', icon: '⚖️', label: 'Судейство' },
    { id: 'users', icon: '👥', label: 'Игроки' },
    { id: 'logs', icon: '📋', label: 'Журнал' },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="text-xl font-display font-black tracking-tight">
              <span className="text-white">30</span><span className="text-brand-400">sec</span><span className="text-accent-400">.</span>
            </button>
            <span className="badge-accent text-[10px]">ADMIN</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm hidden sm:block">{user.profile?.nickname}</span>
            <button onClick={() => setMobileNav(!mobileNav)} className="lg:hidden btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex gap-6">
        {/* Sidebar — desktop */}
        <nav className="hidden lg:block w-48 shrink-0 space-y-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full text-left px-4 py-2.5 rounded-2xl text-sm transition-all duration-200 flex items-center gap-2.5 ${
                tab === t.id ? 'bg-brand-500/10 text-brand-400 font-semibold' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}>
              <span className="text-base">{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>

        {/* Mobile nav overlay */}
        {mobileNav && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileNav(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="absolute left-0 top-14 w-64 bg-dark-800 border-r border-white/[0.06] h-full p-4 space-y-1 animate-slide-up">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => { setTab(t.id); setMobileNav(false); }}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm flex items-center gap-3 ${
                    tab === t.id ? 'bg-brand-500/10 text-brand-400 font-semibold' : 'text-white/50 hover:text-white'
                  }`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ─── Dashboard ──────────────────────── */}
          {tab === 'dashboard' && dashboard && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-5">Дашборд</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Игроки', value: dashboard.totalUsers, color: 'text-brand-400', bg: 'from-brand-600/10' },
                  { label: 'Турниры', value: dashboard.totalTournaments, color: 'text-accent-400', bg: 'from-accent-500/10' },
                  { label: 'Live', value: dashboard.liveTournaments, color: 'text-red-400', bg: 'from-red-500/10' },
                  { label: 'Вопросы', value: dashboard.totalQuestions, color: 'text-green-400', bg: 'from-green-500/10' },
                  { label: 'Ответы', value: dashboard.totalAnswers, color: 'text-purple-400', bg: 'from-purple-500/10' },
                  { label: 'Решения', value: dashboard.totalJudgements, color: 'text-cyan-400', bg: 'from-cyan-500/10' },
                ].map((s) => (
                  <div key={s.label} className={`card text-center bg-gradient-to-b ${s.bg} to-transparent`}>
                    <div className={`text-3xl font-black font-mono ${s.color}`}>{s.value}</div>
                    <div className="text-white/30 text-xs mt-1 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Tournaments ────────────────────── */}
          {tab === 'tournaments' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">Турниры</h2>
                <button onClick={() => setShowCreateT(true)} className="btn-primary text-sm px-5 py-2.5">+ Создать</button>
              </div>

              {showCreateT && (
                <div className="card mb-5 space-y-3 animate-slide-down">
                  <input value={tForm.title} onChange={(e) => setTForm({ ...tForm, title: e.target.value })}
                    className="input-field" placeholder="Название турнира" autoFocus />
                  <div className="flex gap-3">
                    <select value={tForm.type} onChange={(e) => setTForm({ ...tForm, type: e.target.value })} className="input-field">
                      <option value="WEEKLY">Недельный</option>
                      <option value="MONTHLY">Месячный</option>
                      <option value="SEASON">Сезонный</option>
                      <option value="YEARLY">Годовой</option>
                    </select>
                    <input value={tForm.maxPlayers} onChange={(e) => setTForm({ ...tForm, maxPlayers: e.target.value })}
                      className="input-field" placeholder="Макс." type="number" />
                  </div>
                  <div>
                    <label className="input-label">Тема турнира</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {[
                        { value: '', label: 'Без темы', icon: '🎯' },
                        { value: 'detective', label: 'Детектив', icon: '🔍' },
                        { value: 'history', label: 'История', icon: '📜' },
                        { value: 'science', label: 'Наука', icon: '🔬' },
                        { value: 'language', label: 'Язык', icon: '📝' },
                        { value: 'logic', label: 'Логика', icon: '🧩' },
                        { value: 'visual', label: 'Визуал', icon: '🖼️' },
                        { value: 'mixed', label: 'Микс', icon: '🎲' },
                      ].map((th) => (
                        <button key={th.value} type="button"
                          onClick={() => setTForm({ ...tForm, theme: th.value })}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                            tForm.theme === th.value
                              ? 'bg-brand-500/20 border border-brand-500/30 text-brand-400 font-semibold'
                              : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.06]'
                          }`}>
                          <span>{th.icon}</span> {th.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={createT} className="btn-primary text-sm">Создать</button>
                    <button onClick={() => setShowCreateT(false)} className="btn-ghost text-sm">Отмена</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {tournaments.map((t) => (
                  <div key={t.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-white font-semibold">{t.title}</span>
                      <span className="text-white/20 text-sm ml-3">{t.type} · {t._count?.participants || 0} players</span>
                      {t.theme && <span className="badge-accent text-[10px] ml-2">{t.theme}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === 'LIVE' && <span className="badge-live">LIVE</span>}
                      {t.status === 'FINISHED' && <span className="badge-finished">Finished</span>}
                      {t.status === 'DRAFT' && <span className="badge-draft">DRAFT</span>}
                      {(t.status === 'DRAFT' || t.status === 'SCHEDULED') && (
                        <button onClick={async () => { await api.startTournament(t.id); api.getTournaments().then(setTournaments); }}
                          className="btn-primary text-xs px-4 py-2">▶ Запустить</button>
                      )}
                      {t.status === 'LIVE' && (
                        <button onClick={async () => { await api.finishTournament(t.id); api.getTournaments().then(setTournaments); }}
                          className="btn-danger text-xs px-4 py-2">■ Завершить</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Questions ──────────────────────── */}
          {tab === 'questions' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-white">Вопросы</h2>
                <button onClick={() => setShowCreateQ(true)} className="btn-primary text-sm px-5 py-2.5">+ Создать</button>
              </div>

              {showCreateQ && (
                <div className="card mb-5 space-y-3 animate-slide-down">
                  <select value={qForm.category} onChange={(e) => setQForm({ ...qForm, category: e.target.value })} className="input-field">
                    {['LOGIC', 'LANGUAGE', 'DETECTIVE', 'HISTORY', 'SCIENCE', 'IMAGE'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {['ru', 'de', 'en'].map((lang) => (
                    <div key={lang} className="flex gap-2 items-start">
                      <span className="text-white/30 text-xs font-mono w-7 pt-4 text-right shrink-0">{lang}</span>
                      <input value={(qForm as any)[`${lang}_text`]} onChange={(e) => setQForm({ ...qForm, [`${lang}_text`]: e.target.value })}
                        className="input-field flex-1 text-sm" placeholder={`Вопрос (${lang})`} />
                      <input value={(qForm as any)[`${lang}_answer`]} onChange={(e) => setQForm({ ...qForm, [`${lang}_answer`]: e.target.value })}
                        className="input-field w-32 sm:w-40 text-sm" placeholder="Ответ" />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={createQ} className="btn-primary text-sm">Создать</button>
                    <button onClick={() => setShowCreateQ(false)} className="btn-ghost text-sm">Отмена</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {questions.map((q) => (
                  <div key={q.id} className="card">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <span className="badge-draft text-[10px] mr-2">{q.category}</span>
                        {q.localizations?.map((l: any) => (
                          <div key={l.id} className="text-white/60 text-sm mt-1.5">
                            <span className="text-white/20 font-mono text-xs">{l.language}</span>{' '}
                            <span>{l.questionText}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {tournaments.filter((t) => t.status !== 'FINISHED' && t.status !== 'ARCHIVED').map((t) => (
                          <button key={t.id}
                            onClick={() => api.addQuestionToTournament(t.id, q.id)}
                            className="text-[10px] text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1 rounded-lg transition-all whitespace-nowrap">
                            + {t.title.slice(0, 12)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Judge ──────────────────────────── */}
          {tab === 'judge' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-5">⚖️ Судейство</h2>

              <div className="space-y-2 mb-6">
                {tournaments.filter((t) => t.status === 'LIVE').length === 0 && (
                  <div className="card text-center py-10 text-white/30">Нет активных турниров</div>
                )}
                {tournaments.filter((t) => t.status === 'LIVE').map((t) => (
                  <button key={t.id}
                    onClick={async () => {
                      const full = await api.getTournament(t.id);
                      setSelectedTournament(full);
                      const tq = full.tournamentQuestions?.find((q: any) => !q.isUsed);
                      if (tq) loadAnswers(t.id, tq.questionId);
                    }}
                    className={`card-hover w-full text-left ${selectedTournament?.id === t.id ? 'border-brand-500/30 bg-brand-500/5' : ''}`}>
                    <span className="badge-live mr-2">LIVE</span>
                    <span className="text-white font-semibold">{t.title}</span>
                  </button>
                ))}
              </div>

              {answers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white/50">Ответы на текущий вопрос:</h3>
                  {answers.map((a) => (
                    <div key={a.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
                          {(a.user?.profile?.nickname || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-brand-400 font-medium text-sm">{a.user?.profile?.nickname}</span>
                          <div className="text-white text-lg font-semibold truncate">"{a.answerText}"</div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {a.judgement ? (
                          <span className={`badge ${a.judgement.decision === 'ACCEPTED' ? 'badge-finished' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
                            {a.judgement.decision === 'ACCEPTED' ? '✓ Засчитано' : '✗ Отклонено'}
                          </span>
                        ) : (
                          <>
                            <button onClick={() => judgeAnswer(a.id, 'ACCEPTED')}
                              className="btn-primary text-xs px-5 py-2.5">✓ Засчитать</button>
                            <button onClick={() => judgeAnswer(a.id, 'REJECTED')}
                              className="btn-danger text-xs px-5 py-2.5">✗ Отклонить</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Users ──────────────────────────── */}
          {tab === 'users' && users?.data && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-5">Игроки ({users.pagination.total})</h2>
              <div className="space-y-2">
                {users.data.map((u: any) => (
                  <div key={u.id} className="card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/30 text-sm font-bold">
                        {(u.nickname || u.email[0]).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-white font-medium text-sm">{u.nickname || u.email}</span>
                        <div className="flex gap-2 mt-0.5">
                          <span className="badge-draft text-[10px]">{u.role}</span>
                          {!u.isActive && <span className="badge text-[10px] bg-red-500/15 text-red-400">Blocked</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/20 text-xs font-mono">{u.stats?.totalAnswered || 0} ans</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Logs ───────────────────────────── */}
          {tab === 'logs' && logs?.data && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-white mb-5">Журнал действий</h2>
              <div className="space-y-1">
                {logs.data.map((l: any) => (
                  <div key={l.id} className="card py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="badge-draft text-[10px]">{l.actionType}</span>
                      <span className="text-white/40 text-xs">{l.entityType}</span>
                    </div>
                    <div className="text-white/20 text-[11px] font-mono">
                      {l.adminNickname} · {new Date(l.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
