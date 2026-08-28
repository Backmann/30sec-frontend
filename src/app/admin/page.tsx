'use client';
import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import ImageUploader, { UploadedImage } from '@/components/ImageUploader';
import ImageLightbox from '@/components/ImageLightbox';
import io from 'socket.io-client';
import ReorderableQuestions from '@/components/ReorderableQuestions';
import PlayersTab from '@/components/PlayersTab';
import FeedbackTab from '@/components/FeedbackTab';
import HealthTab from '@/components/HealthTab';
import QueueAdminTab from '@/components/QueueAdminTab';
import QuestionLibraryTab from '@/components/QuestionLibraryTab';

type Tab = 'dashboard' | 'tournaments' | 'questions' | 'library' | 'users' | 'queue' | 'feedback' | 'health' | 'logs';
const RQ = 23;

/**
 * Single-element textarea that grows to fit its content.
 * Handles three resize triggers: typing, value-prop change (e.g. when admin
 * opens an existing question for editing), and initial mount.
 */
function AutoTextarea(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };
  useLayoutEffect(() => { resize(); }, [props.value]);
  return (
    <textarea
      ref={ref}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onInput={resize}
      rows={1}
      maxLength={props.maxLength}
      className={(props.className || '') + ' resize-none overflow-hidden min-h-[44px]'}
      placeholder={props.placeholder}
    />
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [selT, setSelT] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [logs, setLogs] = useState<any>(null);
  const [mob, setMob] = useState(false);
  const [showTF, setShowTF] = useState(false);
  const [editT, setEditT] = useState<any>(null);
  const [showQF, setShowQF] = useState(false);
  const [tF, setTF] = useState({ title: '', type: 'WEEKLY', startAt: '' });
  const [qF, setQF] = useState({ tid: '', ru_t: '', ru_a: '', de_t: '', de_a: '', en_t: '', en_a: '' });
  const [fFrom, setFFrom] = useState(''); const [fTo, setFTo] = useState('');
  const [busy, setBusy] = useState('');
  const [now, setNow] = useState(Date.now());
  // Judge state
  const [judgeTimer, setJudgeTimer] = useState(0);
  const [judgePhase, setJudgePhase] = useState<'idle' | 'reading' | 'answering' | 'judging'>('idle');
  const [currentQ, setCurrentQ] = useState<any>(null);
  const [judgeWs, setJudgeWs] = useState<any>(null);
  const [undoTimer, setUndoTimer] = useState<{id: string; aid: string; sec: number} | null>(null);
  const [judgeFilter, setJudgeFilter] = useState<'all' | 'unjudged' | 'judged'>('all');

  // Questions library state
  const [qSubtab, setQSubtab] = useState<'library' | 'byTournament' | 'archive'>('library');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qfQuestionImages, setQfQuestionImages] = useState<UploadedImage[]>([]);
  const [lightboxImages, setLightboxImages] = useState<any[] | null>(null);
  const [lightboxStart, setLightboxStart] = useState(0);
  const [qfAnswerImages, setQfAnswerImages] = useState<UploadedImage[]>([]);
  const [linkDropdownId, setLinkDropdownId] = useState<string | null>(null); // which question's dropdown is open
  const [archiveDetailsId, setArchiveDetailsId] = useState<string | null>(null); // which archive item is expanded
  const [archiveCache, setArchiveCache] = useState<Record<string, any>>({}); // cached details per question
  const [archiveTournaments, setArchiveTournaments] = useState<any[]>([]); // tournaments in archive
  const [archiveFilterTId, setArchiveFilterTId] = useState<string>(''); // '' = all
  const [qLibrary, setQLibrary] = useState<any[]>([]);
  const [selectedQ, setSelectedQ] = useState<Set<string>>(new Set());
  // Clear selection when leaving library (tab or subtab change)
  useEffect(() => {
    if (tab !== 'questions' || qSubtab !== 'library') {
      setSelectedQ(new Set());
    }
  }, [tab, qSubtab]);

  // Refresh free questions count when viewing byTournament
  useEffect(() => {
    if (tab === 'questions' && qSubtab === 'byTournament') {
      refreshFreeCount();
    }
  }, [tab, qSubtab]);
  const [bulkTarget, setBulkTarget] = useState<string>('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelected = (id: string) => {
    const next = new Set(selectedQ);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedQ(next);
  };
  const doBulkAdd = async () => {
    if (!bulkTarget || selectedQ.size === 0) return;
    setBulkBusy(true);
    try {
      await api.bulkAddToTournament(bulkTarget, Array.from(selectedQ));
      alert(`Добавлено ${selectedQ.size} вопросов`);
      setSelectedQ(new Set());
      setBulkTarget('');
      refresh();
      const list = await api.getQuestions({ search: qSearch, sort: qSort, location: 'library' });
      setQLibrary(list);
    } catch (e: any) {
      alert('Ошибка: ' + (e.message || ''));
    }
    setBulkBusy(false);
  };
  const doAutoFill = async (tournamentId: string) => {
    if (!confirm('Заполнить случайными свободными вопросами до 23?')) return;
    try {
      const res = await api.autoFillTournament(tournamentId, 23);
      if (res.partial) {
        alert(`Добавлено ${res.added} вопросов. Всего: ${res.total}/${res.target}.\n\nВ библиотеке закончились свободные вопросы. Чтобы добрать ещё ${res.stillNeeded}, создайте новые или освободите из других турниров.`);
      } else {
        alert(`✓ Турнир заполнен! Добавлено ${res.added} вопросов (всего ${res.total}/${res.target})`);
      }
      refreshFreeCount();
      refresh();
    } catch (e: any) {
      alert('Ошибка: ' + (e.message || ''));
    }
  };

  const [freeCount, setFreeCount] = useState<number | null>(null);
  const refreshFreeCount = async () => {
    try {
      const res = await api.getFreeQuestionsCount();
      setFreeCount(res.count);
    } catch {}
  };
  const [qSearch, setQSearch] = useState('');
  const [qOnlyUnused, setQOnlyUnused] = useState(false);
  const [qSort, setQSort] = useState<'new' | 'old'>('new');

  // Simple similarity check: normalize and compare
  const checkSimilarity = (answer: string, correct: string): 'match' | 'close' | 'wrong' => {
    if (!answer || !correct) return 'wrong';
    const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '');
    const a = norm(answer);
    const c = norm(correct);
    if (a === c) return 'match';
    // Check if answer is contained in correct or vice versa
    if (c.includes(a) || a.includes(c)) return 'close';
    // Check Levenshtein-like: allow 1-2 char difference for short answers
    if (a.length > 2 && c.length > 2) {
      let matches = 0;
      for (let i = 0; i < Math.min(a.length, c.length); i++) { if (a[i] === c[i]) matches++; }
      if (matches / Math.max(a.length, c.length) > 0.7) return 'close';
    }
    return 'wrong';
  };

  useEffect(() => { loadUser().then(() => setLoading(false)); }, []);
  useEffect(() => { if (!loading && (!user || !['ADMIN','SUPERADMIN'].includes(user.role))) router.push('/dashboard'); }, [loading, user]);
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(iv); }, []);
  const refresh = useCallback(() => api.getTournaments().then(setTournaments).catch(() => {}), []);
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://30sec.org/api').replace('/api', '');
    const s = io(wsUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    s.on('tournaments_updated', () => refresh());
    return () => { s.disconnect(); };
  }, [refresh]);
  useEffect(() => {
    if (tab === 'dashboard') api.getAdminDashboard().then(setDashboard).catch(() => {});
    if (['tournaments','questions'].includes(tab)) refresh();
    if (tab === 'users') api.getAdminUsers().then(setUsers).catch(() => {});
    if (tab === 'logs') api.getAdminLogs().then(setLogs).catch(() => {});
  }, [tab, refresh]);

  // Load questions for library or archive subtab
  useEffect(() => {
    if (tab !== 'questions' || (qSubtab !== 'library' && qSubtab !== 'archive')) return;
    const delay = setTimeout(() => {
      const location = qSubtab === 'archive' ? 'archive' : 'library';
      const tournamentId = qSubtab === 'archive' && archiveFilterTId ? archiveFilterTId : undefined;
      api.getQuestions({ search: qSearch, sort: qSort, location, tournamentId })
        .then(setQLibrary).catch(() => {});
    }, 250);
    return () => clearTimeout(delay);
  }, [tab, qSubtab, qSearch, qSort, archiveFilterTId]);

  // Load archive tournaments list when entering archive
  useEffect(() => {
    if (tab !== 'questions' || qSubtab !== 'archive') return;
    api.getArchiveTournaments().then(setArchiveTournaments).catch(() => {});
  }, [tab, qSubtab]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const doCreateT = async () => {
    if (!tF.title.trim()) return alert('Name required');
    if (!tF.startAt) return alert('Date/time required');
    await api.createTournament({ title: tF.title, type: tF.type, startAt: new Date(tF.startAt).toISOString() });
    setShowTF(false); setTF({ title: '', type: 'WEEKLY', startAt: '' }); refresh();
  };
  const doUpdateT = async () => { if (!editT) return; await api.updateTournament(editT.id, { title: tF.title, type: tF.type, startAt: tF.startAt ? new Date(tF.startAt).toISOString() : undefined }); setEditT(null); setTF({ title: '', type: 'WEEKLY', startAt: '' }); refresh(); };
  const doDeleteT = async (id: string, t: string) => { if (!confirm('Delete "'+t+'"?')) return; try { await api.deleteTournament(id); refresh(); } catch(e:any) { alert(e.message); } };
  const doStartT = async (id: string) => { setBusy(id); try { await api.startTournament(id); refresh(); } catch(e:any) { alert(e.message); } setBusy(''); };
  const doFinishT = async (id: string) => { if (!confirm('Finish?')) return; await api.finishTournament(id); refresh(); };
  // Generates simple questions from a built-in list, marked with theme TEST so
  // they never mix into the real library. Use it to reach 23 and rehearse a
  // tournament without spending authored questions.
  const doFillTest = async (id: string) => {
    if (!confirm('Добавить недостающие вопросы из встроенного тестового набора?\n\nОни помечаются как TEST и в библиотеку не попадут.')) return;
    setBusy('fill-'+id);
    try {
      const r = await api.fillTestQuestions(id);
      alert(`Добавлено тестовых вопросов: ${r.added}. Всего в турнире: ${r.total}/${RQ}`);
      refresh();
    } catch(e:any) {
      alert('Ошибка: ' + (e.message || ''));
    }
    setBusy('');
  };
  const doApprove = async (pid: string) => { await api.approveParticipant(pid); refresh(); };
  const doReject = async (pid: string) => { await api.rejectParticipant(pid); refresh(); };
  const doCreateQ = async () => {
    if (!qF.ru_t && !qF.de_t && !qF.en_t) return alert('Введите текст вопроса хотя бы на одном языке');
    try {
      const locs: any[] = [];
      if (qF.ru_t) locs.push({ language: 'ru', questionText: qF.ru_t, correctAnswer: qF.ru_a });
      if (qF.de_t) locs.push({ language: 'de', questionText: qF.de_t, correctAnswer: qF.de_a });
      if (qF.en_t) locs.push({ language: 'en', questionText: qF.en_t, correctAnswer: qF.en_a });
      const payload: any = {
        localizations: locs,
        questionImages: qfQuestionImages.map(({ url, r2Key, caption }) => ({ url, r2Key, caption })),
        answerImages: qfAnswerImages.map(({ url, r2Key, caption }) => ({ url, r2Key, caption })),
      };
      if (editingQuestionId) {
        await api.updateQuestion(editingQuestionId, payload);
      } else {
        const q = await api.createQuestion({ category: 'LOGIC', ...payload });
        if (qF.tid) {
          await api.addQuestionToTournament(qF.tid, q.id);
        }
      }
      setQF({ tid: qF.tid, ru_t: '', ru_a: '', de_t: '', de_a: '', en_t: '', en_a: '' });
      setQfQuestionImages([]);
      setQfAnswerImages([]);
      setShowQF(false);
      setEditingQuestionId(null);
      refresh();
      if (qSubtab === 'library' || qSubtab === 'archive') {
        const location = qSubtab === 'archive' ? 'archive' : 'library';
        const list = await api.getQuestions({ search: qSearch, sort: qSort, location });
        setQLibrary(list);
      }
    } catch (e: any) {
      alert('Ошибка: ' + (e.message || 'не удалось сохранить вопрос'));
    }
  };

  const doEditQ = async (q: any) => {
    // Load full question details including images
    let full: any = q;
    try { full = await api.getQuestion(q.id); } catch {}
    const ru = full.localizations?.find((l: any) => l.language === 'ru');
    const de = full.localizations?.find((l: any) => l.language === 'de');
    const en = full.localizations?.find((l: any) => l.language === 'en');
    setQfQuestionImages((full.questionImages || []).map((img: any) => ({ url: img.url, r2Key: img.r2Key, caption: img.caption || '' })));
    setQfAnswerImages((full.answerImages || []).map((img: any) => ({ url: img.url, r2Key: img.r2Key, caption: img.caption || '' })));
    setQF({
      tid: '',
      ru_t: ru?.questionText || '', ru_a: ru?.correctAnswerLocalized || '',
      de_t: de?.questionText || '', de_a: de?.correctAnswerLocalized || '',
      en_t: en?.questionText || '', en_a: en?.correctAnswerLocalized || '',
    });
    setEditingQuestionId(q.id);
    setShowQF(true);
  };

  const doLinkQToTournament = async (questionId: string, tournamentId: string, force = false) => {
    try {
      const result: any = await api.addQuestionToTournamentForced(tournamentId, questionId, force);
      if (result?.warning === 'ALREADY_PLAYED') {
        const ok = confirm(result.message || 'Этот вопрос уже игрался. Использовать снова?');
        if (!ok) return;
        return doLinkQToTournament(questionId, tournamentId, true);
      }
      setLinkDropdownId(null);
      const location = qSubtab === 'archive' ? 'archive' : 'library';
      const list = await api.getQuestions({ search: qSearch, sort: qSort, location });
      setQLibrary(list);
      refresh();
    } catch (e: any) {
      alert('Ошибка: ' + (e.message || 'не удалось добавить'));
    }
  };

  const doRemoveFromTournament = async (tqId: string, questionText: string) => {
    if (!confirm(`Убрать вопрос "${questionText.slice(0, 60)}${questionText.length > 60 ? '...' : ''}" из турнира?\n\nОн вернётся в библиотеку.`)) return;
    try {
      await api.removeQuestionFromTournament(tqId);
      refresh();
      if (qSubtab === 'library') {
        const list = await api.getQuestions({ search: qSearch, sort: qSort, location: 'library' });
        setQLibrary(list);
      }
    } catch (e: any) {
      alert('Ошибка: ' + (e.message || 'не удалось убрать'));
    }
  };

  const doExpandArchive = async (q: any) => {
    if (archiveDetailsId === q.id) {
      setArchiveDetailsId(null);
      return;
    }
    setArchiveDetailsId(q.id);
    if (!archiveCache[q.id]) {
      try {
        const details = await api.getArchiveDetails(q.id);
        setArchiveCache(prev => ({ ...prev, [q.id]: details }));
      } catch (e) { console.error(e); }
    }
  };

  const doReturnFromArchive = async (q: any) => {
    const text = q.localizations?.[0]?.questionText || '';
    if (!confirm(`Вернуть вопрос в библиотеку?\n\n"${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"\n\nЭтот вопрос уже игрался. После возврата его можно будет снова использовать в турнирах. При повторном добавлении появится предупреждение.`)) return;
    try {
      await api.returnQuestionToLibrary(q.id);
      // Перезагружаем текущий список
      const list = await api.getQuestions({ search: qSearch, sort: qSort, location: 'archive' });
      setQLibrary(list);
      refresh();
    } catch (e: any) {
      alert('Ошибка: ' + (e.message || 'не удалось вернуть'));
    }
  };

  const doDeleteQ = async (q: any) => {
    const text = q.localizations?.[0]?.questionText || 'вопрос';
    if (!confirm(`Удалить вопрос: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"?\n\nЭто действие нельзя отменить.`)) return;
    try {
      await api.deleteQuestion(q.id);
      const location = qSubtab === 'archive' ? 'archive' : 'library';
      const list = await api.getQuestions({ search: qSearch, sort: qSort, location });
      setQLibrary(list);
      refresh();
    } catch (e: any) {
      alert('Не удалось удалить: ' + (e.message || 'ошибка'));
    }
  };
  const doJudge = async (aid: string, d: 'ACCEPTED' | 'REJECTED') => {
    const result = await api.judgeAnswer(aid, d);
    const jid = result?.judgement?.id;
    // Reload answers
    if (selT && currentQ) {
      const updated = await api.getAnswersForQuestion(selT.id, currentQ.questionId);
      setAnswers(updated);
      const f = await api.getTournament(selT.id); setSelT(f);
    }

  };
  const doUndo = async (judgementId?: string) => {
    const jid = judgementId || (undoTimer ? undoTimer.id : null);
    if (!jid) return;
    try {
      await api.undoJudgement(jid);
      setUndoTimer(null);
      if (selT && currentQ) {
        const updated = await api.getAnswersForQuestion(selT.id, currentQ.questionId);
        setAnswers(updated);
        const f = await api.getTournament(selT.id); setSelT(f);
      }
    } catch (e: any) { alert(e.message); }
  };

  // Launch question with timer tracking
  const doLaunch = async () => {
    if (!selT) return;
    setBusy('launch');
    try {
      const d = await api.launchQuestion(selT.id);
      if (d.launched) {
        // Find the question data
        const f = await api.getTournament(selT.id);
        setSelT(f);
        const lastUsed = f.tournamentQuestions?.filter((tq: any) => tq.isUsed).pop();
        setCurrentQ(lastUsed ? { questionId: lastUsed.questionId, orderIndex: lastUsed.orderIndex, question: lastUsed.question } : null);
        setAnswers([]);
        setJudgePhase('reading');
        setJudgeTimer(20);
        // Timer syncs via WS (question_started, phase_changed, timer_tick, question_locked)
        // Auto-load answers when judging phase starts
        if (d.questionId) { setTimeout(() => { api.getAnswersForQuestion(selT.id, d.questionId).then(setAnswers); }, 50000); }
      }
    } catch(e:any) { alert(e.message); }
    setBusy('');
  };

  // Connect WS when selecting tournament in judge
  const selectJudgeTournament = async (tid: string) => {
    const f = await api.getTournament(tid); setSelT(f);
    if (judgeWs) judgeWs.disconnect();
    const tk = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://30sec.org/api').replace('/api', '');
    const ws = io(wsUrl, { auth: { token: tk }, transports: ['websocket', 'polling'] });
    ws.on('connect', () => { ws.emit('join_admin', { tournamentId: tid }); ws.emit('join_tournament', { tournamentId: tid }); });
    ws.on('answer_submitted', (d: any) => { setAnswers(p => p.some(a => a.id === d.answerId) ? p : [...p, { id: d.answerId, answerText: d.answerText || '(no answer)', user: { profile: { nickname: d.nickname } }, judgement: null }]); });
    ws.on('question_started', () => { setJudgePhase('reading'); setJudgeTimer(20); });
    ws.on('phase_changed', (d: any) => { if (d.phase === 'answering') { setJudgePhase('answering'); setJudgeTimer(d.seconds || 30); } });
    ws.on('timer_tick', (d: any) => { setJudgeTimer(d.secondsLeft); if (d.phase) setJudgePhase(d.phase === 'answering' ? 'answering' : judgePhase); });
    ws.on('question_locked', () => { setJudgePhase('judging'); });
    setJudgeWs(ws);

    // Restore game state
    try {
      const gs = await api.getGameState(tid);
      if (gs && gs.currentQuestion) {
        const lastUsed = f.tournamentQuestions?.filter((tq: any) => tq.isUsed).pop();
        setCurrentQ(lastUsed ? { questionId: lastUsed.questionId, orderIndex: lastUsed.orderIndex, question: lastUsed.question } : null);
        setAnswers(gs.allAnswers || []);
        if (gs.phase === 'judging' || gs.phase === 'idle') { setJudgePhase('judging'); }
        else if (gs.phase === 'answering') { setJudgePhase('answering'); setJudgeTimer(gs.timerSeconds); }
        else if (gs.phase === 'reading') { setJudgePhase('reading'); setJudgeTimer(gs.timerSeconds); }
        else { setJudgePhase('idle'); }
      } else {
        setAnswers([]); setJudgePhase('idle'); setCurrentQ(null);
      }
    } catch { setAnswers([]); setJudgePhase('idle'); setCurrentQ(null); }
  };

  const wk = new Date(Date.now()-7*86400000).toISOString();
  const active = tournaments.filter(t => ['LIVE','SCHEDULED','DRAFT'].includes(t.status));
  const fin = tournaments.filter(t => { if (t.status !== 'FINISHED') return false; const d = t.endAt || t.createdAt; if (fFrom && new Date(d)<new Date(fFrom)) return false; if (fTo && new Date(d)>new Date(fTo+'T23:59:59')) return false; if (!fFrom && !fTo) return new Date(d)>new Date(wk); return true; });
  const tabs: {id:Tab;icon:string;label:string}[] = [{id:'dashboard',icon:'D',label:'Дашборд'},{id:'tournaments',icon:'T',label:'Турниры'},{id:'questions',icon:'Q',label:'Вопросы'},{id:'library',icon:'📚',label:'Библиотека'},{id:'users',icon:'U',label:'Игроки'},{id:'queue',icon:'📅',label:'Очередь'},{id:'feedback',icon:'F',label:'Обратная связь'},{id:'health',icon:'H',label:'Здоровье'},{id:'logs',icon:'L',label:'Журнал'}];
  const qc = (t: any) => t.tournamentQuestions?.length || 0;
  const qr = (t: any) => qc(t) >= RQ;
  const apprd = (t: any) => (t.participants || []).filter((p: any) => p.matchStatus === 'APPROVED' || p.matchStatus === 'PLAYING').length;
  const pend = (t: any) => (t.participants || []).filter((p: any) => p.matchStatus === 'PENDING');
  const canStart = (t: any) => qr(t) && (!t.startAt || now >= new Date(t.startAt).getTime()) && apprd(t) > 0;

  // Judge: can launch next question?
  const allJudged = answers.length > 0 && answers.every((a: any) => a.judgement);
  const canLaunchNext = judgePhase === 'idle' || (judgePhase === 'judging' && allJudged);

  // Current question info for judge
  const currentQLocs = currentQ?.question?.localizations || [];
  const correctAnswers = currentQLocs.map((l: any) => l.correctAnswerLocalized).filter(Boolean).join(' / ');

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50"><div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={() => router.push('/dashboard')} className="text-xl font-display font-black"><span className="text-white">30</span><span className="text-brand-400">sec</span><span className="text-accent-400">.</span></button><span className="badge-accent text-[10px]">ADMIN</span></div><div className="flex items-center gap-3"><span className="text-white/40 text-sm hidden sm:block">{user.profile?.nickname}</span><button onClick={() => setMob(!mob)} className="lg:hidden btn-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button></div></div></header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex gap-6">
        <nav className="hidden lg:block w-48 shrink-0 space-y-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`w-full text-left px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2.5 ${tab===t.id?'bg-brand-500/10 text-brand-400 font-semibold':'text-white/40 hover:text-white hover:bg-white/5'}`}>{t.label}</button>)}</nav>
        {mob && <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMob(false)}><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" /><div className="absolute left-0 top-14 w-64 bg-dark-800 border-r border-white/[0.06] h-full p-4 space-y-1">{tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setMob(false); }} className={`w-full text-left px-4 py-3 rounded-2xl text-sm flex items-center gap-3 ${tab===t.id?'bg-brand-500/10 text-brand-400 font-semibold':'text-white/50'}`}>{t.label}</button>)}</div></div>}
        <div className="flex-1 min-w-0">
          {tab === 'dashboard' && dashboard && <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Дашборд</h2>
              <div className="text-white/30 text-xs">Обновлено: сейчас</div>
            </div>

            {/* Требует внимания */}
            {(dashboard.pendingApplications > 0 || dashboard.upcomingTournaments?.some((t:any)=>!t.ready)) && (
              <div className="card border-amber-500/30 bg-amber-500/5">
                <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2"><span>⚠️</span> Требует внимания</h3>
                <div className="space-y-2 text-sm">
                  {dashboard.pendingApplications > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Заявок ожидают одобрения: <span className="font-bold text-amber-400">{dashboard.pendingApplications}</span></span>
                      <button onClick={() => setTab('tournaments')} className="text-xs text-amber-400 hover:underline">Перейти →</button>
                    </div>
                  )}
                  {dashboard.upcomingTournaments?.filter((t:any)=>!t.ready).map((t:any) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <span className="text-white/70">«{t.title}» — вопросов {t.questionsCount}/{t.questionsRequired}</span>
                      <button onClick={() => setTab('questions')} className="text-xs text-amber-400 hover:underline">Дополнить →</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Быстрые действия */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => setTab('tournaments')} className="card-hover text-left group">
                <div className="text-2xl mb-2">🏆</div>
                <div className="text-white font-semibold">Создать турнир</div>
                <div className="text-white/30 text-xs mt-1">Новый турнир с датой и временем</div>
              </button>
              <button onClick={() => setTab('questions')} className="card-hover text-left group">
                <div className="text-2xl mb-2">❓</div>
                <div className="text-white font-semibold">Добавить вопросы</div>
                <div className="text-white/30 text-xs mt-1">Для предстоящих турниров</div>
              </button>
              <button onClick={() => {
                const live = dashboard.liveTournamentsList?.[0];
                const upcoming = dashboard.upcomingTournaments?.[0];
                const target = live || upcoming;
                if (target) router.push('/admin/live/' + target.id);
                else alert('Нет активных или предстоящих турниров');
              }} className="card-hover text-left group">
                <div className="text-2xl mb-2">⚖️</div>
                <div className="text-white font-semibold">Открыть трансляцию</div>
                <div className="text-white/30 text-xs mt-1">Текущий или следующий турнир</div>
              </button>
            </div>

            {/* Статистика */}
            <div>
              <h3 className="section-title mb-3">Статистика</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {l:'Игроков',v:dashboard.totalUsers,c:'text-brand-400',b:'from-brand-600/10',sub: dashboard.newUsersToday > 0 ? `+${dashboard.newUsersToday} сегодня` : null},
                  {l:'Турниров',v:dashboard.totalTournaments,c:'text-accent-400',b:'from-accent-500/10'},
                  {l:'Идут сейчас',v:dashboard.liveTournaments,c:'text-red-400',b:'from-red-500/10'},
                  {l:'Вопросов',v:dashboard.totalQuestions,c:'text-green-400',b:'from-green-500/10'},
                  {l:'Ответов',v:dashboard.totalAnswers,c:'text-purple-400',b:'from-purple-500/10'},
                  {l:'Судейств',v:dashboard.totalJudgements,c:'text-cyan-400',b:'from-cyan-500/10'},
                ].map(s => (
                  <div key={s.l} className={`card text-center bg-gradient-to-b ${s.b} to-transparent`}>
                    <div className={`text-3xl font-black font-mono ${s.c}`}>{s.v}</div>
                    <div className="text-white/30 text-xs mt-1">{s.l}</div>
                    {s.sub && <div className="text-green-400/80 text-[10px] mt-1">{s.sub}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Live турниры */}
            {dashboard.liveTournamentsList?.length > 0 && (
              <div>
                <h3 className="section-title mb-3 flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Идут сейчас</h3>
                <div className="space-y-2">
                  {dashboard.liveTournamentsList.map((t:any) => (
                    <button key={t.id} onClick={() => router.push('/admin/live/' + t.id)} className="card-hover w-full flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold">{t.title}</div>
                        <div className="text-white/30 text-xs">{t.participantsCount} участников</div>
                      </div>
                      <span className="text-red-400 text-xs">⚖️ Открыть →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Предстоящие турниры */}
            {dashboard.upcomingTournaments?.length > 0 && (
              <div>
                <h3 className="section-title mb-3">Предстоящие</h3>
                <div className="space-y-2">
                  {dashboard.upcomingTournaments.map((t:any) => {
                    const startDate = new Date(t.startAt);
                    return (
                      <button key={t.id} onClick={() => router.push('/admin/live/' + t.id)} className="card-hover w-full flex items-center justify-between text-left">
                        <div>
                          <div className="text-white font-semibold">{t.title}</div>
                          <div className="text-white/30 text-xs">{startDate.toLocaleString('ru-RU', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})} · {t.participantsCount} заявок</div>
                        </div>
                        <span className={`text-xs font-mono ${t.ready ? 'text-green-400' : 'text-amber-400'}`}>{t.questionsCount}/{t.questionsRequired} {t.ready ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Последняя активность */}
            {dashboard.recentActivity?.length > 0 && (
              <div>
                <h3 className="section-title mb-3">Последняя активность</h3>
                <div className="space-y-1">
                  {dashboard.recentActivity.slice(0,5).map((a:any) => {
                    const actionMap:any = {
                      post_auth: 'вход в админку',
                      post_tournaments: 'работа с турниром',
                      post_questions: 'работа с вопросами',
                      post_notifications: 'уведомления',
                      delete_tournaments: 'удаление турнира',
                      patch_tournaments: 'изменение турнира',
                    };
                    const label = actionMap[a.actionType] || a.actionType;
                    return (
                      <div key={a.id} className="text-white/50 text-xs flex items-center justify-between py-2 border-b border-white/[0.04]">
                        <span><span className="text-white/70">{a.adminNickname}</span> — {label}</span>
                        <span className="text-white/30">{new Date(a.createdAt).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>}

          {tab === 'tournaments' && <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-white">Турниры</h2><button onClick={() => { setShowTF(true); setEditT(null); setTF({title:'',type:'WEEKLY',startAt:''}); }} className="btn-primary text-sm px-5 py-2.5">+ Create</button></div>
            {(showTF||editT) && <div className="card mb-5 space-y-3 animate-slide-down"><h3 className="text-white font-semibold text-sm">{editT?'Edit':'+ New'}</h3><input value={tF.title} onChange={e=>setTF({...tF,title:e.target.value})} className="input-field" placeholder="Название турнира" autoFocus /><div className="grid grid-cols-2 gap-3"><div><label className="input-label">Тип</label><select value={tF.type} onChange={e=>setTF({...tF,type:e.target.value})} className="input-field"><option value="WEEKLY">Недельный</option><option value="MONTHLY">Месячный</option><option value="SEASON">Сезонный</option><option value="YEARLY">Годовой</option></select></div><div><label className="input-label">Start *</label><input type="datetime-local" value={tF.startAt} onChange={e=>setTF({...tF,startAt:e.target.value})} className="input-field" /></div></div><div className="flex gap-2"><button onClick={editT?doUpdateT:doCreateT} className="btn-primary text-sm">{editT?'Save':'Create'}</button><button onClick={()=>{setShowTF(false);setEditT(null);}} className="btn-ghost text-sm">Отмена</button></div></div>}
            <h3 className="text-sm font-semibold text-white/40 mb-2">Активен</h3>
            {active.length===0?<div className="card text-center py-6 text-white/20 text-sm mb-6">Нет</div>:<div className="space-y-3 mb-6">{active.map(t=><div key={t.id} className="card space-y-3"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="text-white font-semibold">{t.title}</span>{t.status==='DRAFT'&&<span className="badge-draft">Черновик</span>}{t.status==='LIVE'&&<span className="badge-live">Идёт</span>}</div><div className="text-white/30 text-xs mt-1">{t.type}{t.startAt&&<span> | Start: {new Date(t.startAt).toLocaleString()}</span>}</div><div className="text-xs mt-1">{qr(t)?<span className="text-green-400">OK {qc(t)}/{RQ}</span>:<span className="text-amber-400">! {qc(t)}/{RQ} (need {RQ-qc(t)})</span>}</div><div className="text-xs mt-0.5 text-white/30">{apprd(t)} approved | {pend(t).length} pending</div></div><div className="flex items-center gap-2 flex-wrap">{(t.status==='DRAFT'||t.status==='SCHEDULED')&&<><button onClick={()=>doStartT(t.id)} disabled={busy===t.id||!canStart(t)} className={`text-xs px-4 py-2 rounded-2xl font-semibold ${canStart(t)?'btn-primary':'bg-white/5 text-white/20 cursor-not-allowed'}`}>{busy===t.id?'...':'Start'}</button><button onClick={()=>{setEditT(t);setShowTF(false);setTF({title:t.title,type:t.type,startAt:t.startAt?new Date(t.startAt).toISOString().slice(0,16):''});}} className="btn-ghost text-xs">Изменить</button><button onClick={()=>doDeleteT(t.id,t.title)} className="btn-ghost text-xs text-red-400">Удалить</button></>}{t.status==='LIVE'&&<button onClick={()=>doFinishT(t.id)} className="btn-danger text-xs px-4 py-2">Завершить</button>}</div></div>{pend(t).length>0&&<div className="border-t border-white/[0.06] pt-3"><h4 className="text-xs text-white/40 mb-2">Applications:</h4><div className="space-y-1">{pend(t).map((p:any)=><div key={p.id} className="flex items-center justify-between py-1"><span className="text-white/70 text-sm">{p.user?.profile?.nickname||p.userId}</span><div className="flex gap-1"><button onClick={()=>doApprove(p.id)} className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-lg">Одобрить</button><button onClick={()=>doReject(p.id)} className="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-lg">Отклонить</button></div></div>)}</div></div>}</div>)}</div>}
            <h3 className="text-sm font-semibold text-white/40 mb-2">Завершён</h3>
            <div className="flex gap-2 mb-3 items-center"><input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} className="input-field text-xs py-2 w-36" /><span className="text-white/20 text-xs">-</span><input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} className="input-field text-xs py-2 w-36" />{(fFrom||fTo)&&<button onClick={()=>{setFFrom('');setFTo('');}} className="btn-ghost text-xs">Сброс</button>}</div>
            {fin.length===0?<div className="card text-center py-6 text-white/20 text-sm">Нет</div>:<div className="space-y-2">{fin.map(t=><div key={t.id} className="card flex items-center justify-between hover:border-brand-500/30 transition cursor-pointer group" onClick={()=>router.push('/admin/live/'+t.id)}><div className="flex-1"><span className="text-white font-medium group-hover:text-brand-400">{t.title}</span><span className="text-white/20 text-xs ml-2">{t.type}</span>{t.endAt && <div className="text-white/30 text-[11px] mt-0.5">{new Date(t.endAt).toLocaleDateString('ru-RU',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>}</div><div className="flex items-center gap-2" onClick={(e)=>e.stopPropagation()}><span className="text-[10px] uppercase tracking-wider text-white/30">📊 статистика</span><button onClick={(e)=>{e.stopPropagation();doDeleteT(t.id,t.title);}} className="btn-ghost text-xs text-red-400">Удалить</button></div></div>)}</div>}
          </div>}

          {tab === 'questions' && <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h2 className="text-xl font-bold text-white">Вопросы</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setQSubtab('library')} className={`text-sm px-4 py-2 rounded-xl transition ${qSubtab==='library'?'bg-brand-500/20 text-brand-400 font-semibold':'text-white/40 hover:text-white hover:bg-white/5'}`}>Библиотека</button>
                <button onClick={() => setQSubtab('byTournament')} className={`text-sm px-4 py-2 rounded-xl transition ${qSubtab==='byTournament'?'bg-brand-500/20 text-brand-400 font-semibold':'text-white/40 hover:text-white hover:bg-white/5'}`}>По турнирам</button>
                <button onClick={() => setQSubtab('archive')} className={`text-sm px-4 py-2 rounded-xl transition ${qSubtab==='archive'?'bg-brand-500/20 text-brand-400 font-semibold':'text-white/40 hover:text-white hover:bg-white/5'}`}>Архив</button>
                <button onClick={() => { setEditingQuestionId(null); setQF({ tid: '', ru_t: '', ru_a: '', de_t: '', de_a: '', en_t: '', en_a: '' }); setShowQF(true); }} className="btn-primary text-sm px-5 py-2">+ Новый вопрос</button>
              </div>
            </div>

            {showQF && <div className="card mb-5 space-y-3 animate-slide-down"><div className="text-sm font-semibold text-white/70 mb-2">{editingQuestionId ? '✏️ Редактирование вопроса' : '➕ Новый вопрос'}</div>{!editingQuestionId && <div><label className="input-label">Турнир (опционально)</label><select value={qF.tid} onChange={e=>setQF({...qF,tid:e.target.value})} className="input-field"><option value="">— не привязывать —</option>{tournaments.filter(t=>t.status!=='FINISHED').map(t=><option key={t.id} value={t.id}>{t.title} ({qc(t)}/{RQ})</option>)}</select></div>}{['ru','de','en'].map(l=><div key={l}><label className="input-label">{l.toUpperCase()}</label><div className="flex flex-col sm:flex-row gap-2"><AutoTextarea value={(qF as any)[l+'_t']} onChange={v=>setQF({...qF,[l+'_t']:v})} className="input-field flex-1 text-sm" placeholder={'Вопрос ('+l+')'} /><AutoTextarea value={(qF as any)[l+'_a']} onChange={v=>setQF({...qF,[l+'_a']:v})} className="input-field sm:w-40 text-sm" placeholder="Ответ" /></div></div>)}
              <div className="pt-2 border-t border-white/[0.06]"><ImageUploader images={qfQuestionImages} onChange={setQfQuestionImages} category="question" label="🖼 Изображения к вопросу (до 10)" /></div>
              <div className="pt-2"><ImageUploader images={qfAnswerImages} onChange={setQfAnswerImages} category="answer" label="🎯 Изображения к правильному ответу (до 10)" /></div>
              <div className="flex gap-2 pt-2"><button onClick={doCreateQ} className="btn-primary text-sm">{editingQuestionId ? 'Сохранить' : 'Создать'}</button><button onClick={()=>{ setShowQF(false); setEditingQuestionId(null); setQfQuestionImages([]); setQfAnswerImages([]); }} className="btn-ghost text-sm">Отмена</button></div></div>}

            {/* ─── LIBRARY / ARCHIVE SUBTAB ─── */}
            {(qSubtab === 'library' || qSubtab === 'archive') && <div>
              <div className="card mb-4 flex flex-col sm:flex-row gap-3">
                <input
                  value={qSearch}
                  onChange={e => setQSearch(e.target.value)}
                  placeholder="🔍 Поиск по тексту вопроса или ответа..."
                  className="input-field flex-1 text-sm"
                />
                <select value={qSort} onChange={e => setQSort(e.target.value as any)} className="input-field text-sm sm:w-48">
                  <option value="new">Сначала новые</option>
                  <option value="old">Сначала старые</option>
                </select>
                {qSubtab === 'archive' && archiveTournaments.length > 1 && (
                  <select value={archiveFilterTId} onChange={e => setArchiveFilterTId(e.target.value)} className="input-field text-sm sm:w-56">
                    <option value="">Все турниры</option>
                    {archiveTournaments.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                )}
              </div>

              <div className="text-white/30 text-xs mb-3">Найдено: {qLibrary.length}</div>

              {qLibrary.length === 0 ? (
                <div className="card py-8 text-center text-white/30 text-sm">Нет вопросов, соответствующих фильтрам</div>
              ) : (
                <div className="space-y-2">
                  {qLibrary.map((q: any) => {
                    const loc = q.localizations?.find((l: any) => l.language === 'ru') || q.localizations?.[0];
                    const details = archiveCache[q.id];
                    const isExpanded = archiveDetailsId === q.id;
                    return (
                      <div key={q.id}>
                      <div className={`card py-3 px-4 ${selectedQ.has(q.id) ? 'border-brand-500/40 bg-brand-500/5' : ''}`}>
                        <div className="flex items-start gap-3">
                          {qSubtab === 'library' && (
                            <input
                              type="checkbox"
                              checked={selectedQ.has(q.id)}
                              onChange={() => toggleSelected(q.id)}
                              className="mt-1 w-4 h-4 accent-brand-500 cursor-pointer shrink-0"
                            />
                          )}
                          {(q.questionImages?.length > 0 || q.answerImages?.length > 0) && (
                            <div className="flex flex-col gap-1 shrink-0">
                              {q.questionImages?.length > 0 && (
                                <div className="flex gap-1 items-center" title="Изображения вопроса">
                                  <span className="text-[9px] text-white/30 w-4">🖼</span>
                                  {q.questionImages.slice(0, 3).map((img: any, i: number) => (
                                    <img key={img.id || i} src={img.url} alt="" onClick={() => { setLightboxImages(q.questionImages); setLightboxStart(i); }} className="w-8 h-8 rounded-md object-cover border border-white/10 cursor-pointer hover:border-brand-400/60 transition" />
                                  ))}
                                  {q.questionImages.length > 3 && (
                                    <div onClick={() => { setLightboxImages(q.questionImages); setLightboxStart(3); }} className="w-8 h-8 rounded-md border border-white/10 bg-white/5 flex items-center justify-center text-white/40 text-[9px] cursor-pointer">+{q.questionImages.length - 3}</div>
                                  )}
                                </div>
                              )}
                              {q.answerImages?.length > 0 && (
                                <div className="flex gap-1 items-center" title="Изображения ответа">
                                  <span className="text-[9px] text-green-400/60 w-4">🎯</span>
                                  {q.answerImages.slice(0, 3).map((img: any, i: number) => (
                                    <img key={img.id || i} src={img.url} alt="" onClick={() => { setLightboxImages(q.answerImages); setLightboxStart(i); }} className="w-8 h-8 rounded-md object-cover border border-green-500/20 cursor-pointer hover:border-green-400/60 transition" />
                                  ))}
                                  {q.answerImages.length > 3 && (
                                    <div onClick={() => { setLightboxImages(q.answerImages); setLightboxStart(3); }} className="w-8 h-8 rounded-md border border-green-500/20 bg-green-500/5 flex items-center justify-center text-green-400/40 text-[9px] cursor-pointer">+{q.answerImages.length - 3}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm">{loc?.questionText || '(пусто)'}</div>
                            {loc?.correctAnswerLocalized && <div className="text-green-400/60 text-xs mt-0.5">→ {loc.correctAnswerLocalized}</div>}
                            <div className="flex gap-2 mt-1.5 text-[10px] items-center">
                              <span className="text-white/30">{new Date(q.createdAt).toLocaleDateString('ru-RU', {day:'2-digit', month:'short'})}</span>
                              {q.played && <span className="bg-white/5 text-white/40 px-1.5 py-0.5 rounded">✓ сыгран</span>}
                              {q.inUpcoming && !q.played && <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">в предстоящем</span>}
                              {!q.played && !q.inUpcoming && <span className="bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">свободен</span>}
                              <span className="text-white/20">{q.localizations?.length || 0} {q.localizations?.length === 1 ? 'язык' : 'языка'}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0 relative">
                            {qSubtab === 'library' && <>
                              <button onClick={() => setLinkDropdownId(linkDropdownId === q.id ? null : q.id)} title="Добавить в турнир" className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-green-500/20 text-white/40 hover:text-green-400 text-sm transition">➕</button>
                              <button onClick={() => doEditQ(q)} title="Редактировать" className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-brand-500/20 text-white/40 hover:text-brand-400 text-sm transition">✏️</button>
                              <button onClick={() => doDeleteQ(q)} title="Удалить" disabled={q.inUpcoming} className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-red-500/20 text-white/40 hover:text-red-400 text-sm transition disabled:opacity-30 disabled:cursor-not-allowed">🗑</button>
                            </>}
                            {qSubtab === 'archive' && <>
                              <button onClick={() => doExpandArchive(q)} title={archiveDetailsId === q.id ? 'Свернуть' : 'История'} className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-brand-500/20 text-white/40 hover:text-brand-400 text-sm transition">{archiveDetailsId === q.id ? '▲' : '▼'}</button>
                              <button onClick={() => doReturnFromArchive(q)} title="Вернуть в библиотеку" className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-amber-500/20 text-white/40 hover:text-amber-400 text-sm transition">↻</button>
                            </>}

                          </div>
                        </div>
                      </div>
                      {qSubtab === 'archive' && isExpanded && details && (
                        <div className="card mt-1 p-4 border-l-2 border-brand-500/30 bg-white/[0.02] animate-fade-in">
                          <div className="flex flex-wrap gap-3 text-xs mb-4 pb-3 border-b border-white/[0.06]">
                            <span className="text-white/40">Сыгран:</span>
                            <span className="text-white font-semibold">{details.playedTimes} {details.playedTimes === 1 ? 'раз' : 'раза'}</span>
                            <span className="text-white/20">·</span>
                            <span className="text-white/40">Ответов:</span>
                            <span className="text-white font-semibold">{details.correctAnswers} / {details.totalAnswers}</span>
                            <span className="text-white/20">·</span>
                            <span className="text-white/40">Успех:</span>
                            <span className={`font-bold ${details.successRate >= 70 ? 'text-green-400' : details.successRate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{details.successRate}%</span>
                          </div>
                          {details.history.map((h: any) => (
                            <div key={h.tournamentQuestionId} className="mb-3 last:mb-0">
                              <div className="flex items-center gap-2 mb-2 text-sm">
                                <span className="text-brand-400 font-semibold">{h.tournament.title}</span>
                                <span className="text-white/30 text-xs">{h.tournament.endAt ? new Date(h.tournament.endAt).toLocaleString('ru-RU', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'}) : new Date(h.tournament.startAt).toLocaleString('ru-RU', {day:'2-digit', month:'short', year:'numeric'})}</span>
                              </div>
                              {h.noAnswers ? (
                                <div className="text-white/30 text-xs italic px-2 py-2">Никто не ответил</div>
                              ) : (
                                <div className="space-y-1">
                                  {h.answers.map((a: any) => (
                                    <div key={a.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg bg-white/[0.02]">
                                      <span className={`${a.decision === 'ACCEPTED' ? 'text-green-400' : a.decision === 'REJECTED' ? 'text-red-400' : 'text-white/30'}`}>{a.decision === 'ACCEPTED' ? '✓' : a.decision === 'REJECTED' ? '✗' : '—'}</span>
                                      <span className="text-white font-medium">{a.nickname}</span>
                                      {a.flagCode && <span className="text-white/30 text-[10px] uppercase">{a.flagCode}</span>}
                                      <span className="text-white/40 flex-1 truncate">"{a.answerText || '(пусто)'}"</span>
                                      {a.relSeconds !== null && <span className="text-white/30 text-[10px] font-mono shrink-0">+{a.relSeconds}с</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>}

            {/* ─── BY TOURNAMENT SUBTAB ─── */}
            {qSubtab === 'byTournament' && <div>
              {tournaments.filter(t=>t.status!=='FINISHED').map(t=>{const tqs=t.tournamentQuestions||[];return <div key={t.id} className="mb-6"><div className="flex items-center gap-2 mb-2 flex-wrap"><h3 className="text-sm font-semibold text-white/50">{t.title}</h3><span className={`text-[10px] font-mono ${tqs.length>=RQ?'text-green-400':'text-amber-400'}`}>{tqs.length}/{RQ}</span>{tqs.length<RQ&&<span className="text-[10px] text-red-400/60">нужно ещё {RQ-tqs.length}</span>}{tqs.length>1&&<span className="text-[10px] text-white/30 ml-auto">⇅ перетащите чтобы изменить порядок</span>}{tqs.length<RQ&&(()=>{const need=RQ-tqs.length;const canAdd=freeCount!==null?Math.min(need,freeCount):need;const enough=freeCount===null||freeCount>=need;return <><button onClick={()=>doAutoFill(t.id)} disabled={freeCount===0} className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition ${freeCount===0?'bg-white/5 text-white/30 cursor-not-allowed':enough?'bg-brand-500/10 hover:bg-brand-500/20 text-brand-400':'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'}`} title={freeCount===0?'В библиотеке нет свободных вопросов':enough?'Заполнить случайными свободными':`Будет добавлено ${canAdd}/${need} — в библиотеке ${freeCount} свободных`}>⚡ {freeCount===0?'Нет свободных':enough?'Заполнить':`Заполнить ${canAdd}/${need}`}</button><button onClick={()=>doFillTest(t.id)} disabled={busy==='fill-'+t.id} className="text-[10px] px-2 py-0.5 rounded-md font-semibold transition bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-40" title="Добавить простые вопросы из встроенного набора (помечаются TEST, в библиотеку не попадают)">{busy==='fill-'+t.id?'…':`🧪 Тестовыми ${need}`}</button>{freeCount!==null&&<span className="text-[10px] text-white/30">в библиотеке: <span className={freeCount===0?'text-red-400':'text-white/50'}>{freeCount}</span></span>}</>;})()}</div><ReorderableQuestions tournamentId={t.id} tqs={tqs} onRemove={doRemoveFromTournament} onReorderSaved={() => { /* optional: refresh data */ }} /></div>})}
              {tournaments.filter(t=>t.status!=='FINISHED').length === 0 && <div className="card py-8 text-center text-white/30 text-sm">Нет активных турниров</div>}
            </div>}
          </div>}

          {/* ─── Bulk selection floating panel ─── */}
          {selectedQ.size > 0 && tab === 'questions' && qSubtab === 'library' && (
            <div className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 bg-dark-800/95 backdrop-blur-xl border-t sm:border border-brand-500/40 sm:rounded-2xl shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:px-5 sm:py-3 sm:w-[560px]">
                <div className="flex items-center justify-between sm:justify-start gap-3 sm:shrink-0">
                  <span className="text-white font-semibold text-sm whitespace-nowrap">Выбрано: <span className="text-brand-400">{selectedQ.size}</span></span>
                  <button onClick={() => setSelectedQ(new Set())} className="sm:hidden w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center" title="Снять выбор">✕</button>
                </div>
                <select
                  value={bulkTarget}
                  onChange={e => setBulkTarget(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="flex-1 min-w-0 px-3 h-11 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/60"
                >
                  <option value="">— в какой турнир? —</option>
                  {tournaments.filter(t => t.status !== 'FINISHED').map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({qc(t)}/{RQ})</option>
                  ))}
                </select>
                <div className="flex gap-2 sm:shrink-0">
                  <button onClick={doBulkAdd} disabled={!bulkTarget || bulkBusy} className="btn-primary text-sm h-11 px-5 flex-1 sm:flex-none whitespace-nowrap">
                    {bulkBusy ? '...' : 'Добавить'}
                  </button>
                  <button onClick={() => setSelectedQ(new Set())} className="hidden sm:flex w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 items-center justify-center text-sm" title="Снять выбор">✕</button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Image lightbox ─── */}
          {lightboxImages && <ImageLightbox images={lightboxImages} startIndex={lightboxStart} onClose={() => setLightboxImages(null)} />}

          {/* ─── Link question to tournament modal ─── */}
          {linkDropdownId && (() => {
            const q = qLibrary.find((x: any) => x.id === linkDropdownId);
            if (!q) return null;
            const eligible = tournaments.filter(t => ['DRAFT','SCHEDULED'].includes(t.status) && !q.tournaments?.some((qt: any) => qt.tournament.id === t.id));
            const loc = q.localizations?.find((l: any) => l.language === 'ru') || q.localizations?.[0];
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setLinkDropdownId(null)}>
                <div onClick={e => e.stopPropagation()} className="card max-w-md w-full p-5 space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Добавить в турнир</div>
                    <div className="text-white font-semibold text-sm truncate">{loc?.questionText}</div>
                  </div>
                  <div className="space-y-1 max-h-80 overflow-y-auto -mx-1">
                    {eligible.length === 0 ? (
                      <div className="text-white/30 text-xs px-2 py-6 text-center">Нет доступных турниров.<br/>Создайте турнир со статусом Черновик или Запланирован.</div>
                    ) : eligible.map(t => (
                      <button key={t.id} onClick={() => doLinkQToTournament(q.id, t.id)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-brand-500/10 text-sm text-white/80 flex items-center justify-between gap-2">
                        <span className="truncate">{t.title}</span>
                        <span className="text-white/30 text-[10px] shrink-0 font-mono bg-white/5 px-2 py-0.5 rounded">{(t.tournamentQuestions?.length||0)}/{RQ}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setLinkDropdownId(null)} className="btn-ghost text-sm w-full">Отмена</button>
                </div>
              </div>
            );
          })()}

          {tab==='users' && <PlayersTab />}
          {tab==='library' && <QuestionLibraryTab />}
          {tab==='queue' && <QueueAdminTab />}
          {tab==='feedback' && <FeedbackTab />}
          {tab==='health' && <HealthTab />}
          {tab==='logs'&&logs?.data&&<div className="animate-fade-in"><h2 className="text-xl font-bold text-white mb-5">Журнал</h2><div className="space-y-1">{logs.data.map((l:any)=><div key={l.id} className="card py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1"><div className="flex items-center gap-2"><span className="badge-draft text-[10px]">{l.actionType}</span><span className="text-white/40 text-xs">{l.entityType}</span></div><div className="text-white/20 text-[11px] font-mono">{l.adminNickname} | {new Date(l.createdAt).toLocaleString()}</div></div>)}</div></div>}
        </div>
      </div>
    </div>
  );
}
