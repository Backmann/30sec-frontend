'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import io from 'socket.io-client';

type Tab = 'dashboard' | 'tournaments' | 'questions' | 'judge' | 'users' | 'logs';
const RQ = 23;

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
    if (['tournaments','questions','judge'].includes(tab)) refresh();
    if (tab === 'users') api.getAdminUsers().then(setUsers).catch(() => {});
    if (tab === 'logs') api.getAdminLogs().then(setLogs).catch(() => {});
  }, [tab, refresh]);

  // Auto-select LIVE tournament in judge tab
  useEffect(() => {
    if (tab === 'judge' && !selT && tournaments.length > 0) {
      const live = tournaments.find(t => t.status === 'LIVE');
      if (live) selectJudgeTournament(live.id);
    }
  }, [tab, tournaments]);

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
  const doFillTest = async (id: string) => { setBusy('fill-'+id); try { const r = await api.fillTestQuestions(id); alert('Added '+r.added+'. Total: '+r.total); refresh(); } catch(e:any) { alert(e.message); } setBusy(''); };
  const doApprove = async (pid: string) => { await api.approveParticipant(pid); refresh(); };
  const doReject = async (pid: string) => { await api.rejectParticipant(pid); refresh(); };
  const doCreateQ = async () => {
    if (!qF.tid) return alert('Select tournament');
    if (!qF.ru_t && !qF.de_t && !qF.en_t) return alert('Enter question');
    const locs: any[] = [];
    if (qF.ru_t) locs.push({ language: 'ru', questionText: qF.ru_t, correctAnswer: qF.ru_a });
    if (qF.de_t) locs.push({ language: 'de', questionText: qF.de_t, correctAnswer: qF.de_a });
    if (qF.en_t) locs.push({ language: 'en', questionText: qF.en_t, correctAnswer: qF.en_a });
    const q = await api.createQuestion({ category: 'LOGIC', localizations: locs });
    await api.addQuestionToTournament(qF.tid, q.id);
    setQF({ ...qF, ru_t: '', ru_a: '', de_t: '', de_a: '', en_t: '', en_a: '' }); refresh();
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
  const tabs: {id:Tab;icon:string;label:string}[] = [{id:'dashboard',icon:'D',label:'Dashboard'},{id:'tournaments',icon:'T',label:'Tournaments'},{id:'questions',icon:'Q',label:'Questions'},{id:'judge',icon:'J',label:'Judge'},{id:'users',icon:'U',label:'Players'},{id:'logs',icon:'L',label:'Logs'}];
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
          {tab === 'dashboard' && dashboard && <div className="animate-fade-in"><h2 className="text-xl font-bold text-white mb-5">Dashboard</h2><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[{l:'Players',v:dashboard.totalUsers,c:'text-brand-400',b:'from-brand-600/10'},{l:'Tournaments',v:dashboard.totalTournaments,c:'text-accent-400',b:'from-accent-500/10'},{l:'Live',v:dashboard.liveTournaments,c:'text-red-400',b:'from-red-500/10'},{l:'Questions',v:dashboard.totalQuestions,c:'text-green-400',b:'from-green-500/10'},{l:'Answers',v:dashboard.totalAnswers,c:'text-purple-400',b:'from-purple-500/10'},{l:'Judgements',v:dashboard.totalJudgements,c:'text-cyan-400',b:'from-cyan-500/10'}].map(s=><div key={s.l} className={`card text-center bg-gradient-to-b ${s.b} to-transparent`}><div className={`text-3xl font-black font-mono ${s.c}`}>{s.v}</div><div className="text-white/30 text-xs mt-1">{s.l}</div></div>)}</div></div>}

          {tab === 'tournaments' && <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-white">Tournaments</h2><button onClick={() => { setShowTF(true); setEditT(null); setTF({title:'',type:'WEEKLY',startAt:''}); }} className="btn-primary text-sm px-5 py-2.5">+ Create</button></div>
            {(showTF||editT) && <div className="card mb-5 space-y-3 animate-slide-down"><h3 className="text-white font-semibold text-sm">{editT?'Edit':'+ New'}</h3><input value={tF.title} onChange={e=>setTF({...tF,title:e.target.value})} className="input-field" placeholder="Tournament name" autoFocus /><div className="grid grid-cols-2 gap-3"><div><label className="input-label">Type</label><select value={tF.type} onChange={e=>setTF({...tF,type:e.target.value})} className="input-field"><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="SEASON">Season</option><option value="YEARLY">Yearly</option></select></div><div><label className="input-label">Start *</label><input type="datetime-local" value={tF.startAt} onChange={e=>setTF({...tF,startAt:e.target.value})} className="input-field" /></div></div><div className="flex gap-2"><button onClick={editT?doUpdateT:doCreateT} className="btn-primary text-sm">{editT?'Save':'Create'}</button><button onClick={()=>{setShowTF(false);setEditT(null);}} className="btn-ghost text-sm">Cancel</button></div></div>}
            <h3 className="text-sm font-semibold text-white/40 mb-2">Active</h3>
            {active.length===0?<div className="card text-center py-6 text-white/20 text-sm mb-6">None</div>:<div className="space-y-3 mb-6">{active.map(t=><div key={t.id} className="card space-y-3"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="text-white font-semibold">{t.title}</span>{t.status==='DRAFT'&&<span className="badge-draft">DRAFT</span>}{t.status==='LIVE'&&<span className="badge-live">LIVE</span>}</div><div className="text-white/30 text-xs mt-1">{t.type}{t.startAt&&<span> | Start: {new Date(t.startAt).toLocaleString()}</span>}</div><div className="text-xs mt-1">{qr(t)?<span className="text-green-400">OK {qc(t)}/{RQ}</span>:<span className="text-amber-400">! {qc(t)}/{RQ} (need {RQ-qc(t)})</span>}</div><div className="text-xs mt-0.5 text-white/30">{apprd(t)} approved | {pend(t).length} pending</div></div><div className="flex items-center gap-2 flex-wrap">{(t.status==='DRAFT'||t.status==='SCHEDULED')&&<><button onClick={()=>doStartT(t.id)} disabled={busy===t.id||!canStart(t)} className={`text-xs px-4 py-2 rounded-2xl font-semibold ${canStart(t)?'btn-primary':'bg-white/5 text-white/20 cursor-not-allowed'}`}>{busy===t.id?'...':'Start'}</button><button onClick={()=>{setEditT(t);setShowTF(false);setTF({title:t.title,type:t.type,startAt:t.startAt?new Date(t.startAt).toISOString().slice(0,16):''});}} className="btn-ghost text-xs">Edit</button><button onClick={()=>doDeleteT(t.id,t.title)} className="btn-ghost text-xs text-red-400">Del</button></>}{t.status==='LIVE'&&<button onClick={()=>doFinishT(t.id)} className="btn-danger text-xs px-4 py-2">Finish</button>}</div></div>{pend(t).length>0&&<div className="border-t border-white/[0.06] pt-3"><h4 className="text-xs text-white/40 mb-2">Applications:</h4><div className="space-y-1">{pend(t).map((p:any)=><div key={p.id} className="flex items-center justify-between py-1"><span className="text-white/70 text-sm">{p.user?.profile?.nickname||p.userId}</span><div className="flex gap-1"><button onClick={()=>doApprove(p.id)} className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-lg">Approve</button><button onClick={()=>doReject(p.id)} className="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-lg">Reject</button></div></div>)}</div></div>}</div>)}</div>}
            <h3 className="text-sm font-semibold text-white/40 mb-2">Finished</h3>
            <div className="flex gap-2 mb-3 items-center"><input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} className="input-field text-xs py-2 w-36" /><span className="text-white/20 text-xs">-</span><input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} className="input-field text-xs py-2 w-36" />{(fFrom||fTo)&&<button onClick={()=>{setFFrom('');setFTo('');}} className="btn-ghost text-xs">Reset</button>}</div>
            {fin.length===0?<div className="card text-center py-6 text-white/20 text-sm">None</div>:<div className="space-y-2">{fin.map(t=><div key={t.id} className="card flex items-center justify-between opacity-60"><div><span className="text-white font-medium">{t.title}</span><span className="text-white/20 text-xs ml-2">{t.type}</span></div><div className="flex items-center gap-2"><span className="badge-finished">Done</span><button onClick={()=>doDeleteT(t.id,t.title)} className="btn-ghost text-xs text-red-400">Del</button></div></div>)}</div>}
          </div>}

          {tab === 'questions' && <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-white">Questions</h2><button onClick={()=>setShowQF(true)} className="btn-primary text-sm px-5 py-2.5">+ Create</button></div>
            {showQF&&<div className="card mb-5 space-y-3 animate-slide-down"><div><label className="input-label">Tournament *</label><select value={qF.tid} onChange={e=>setQF({...qF,tid:e.target.value})} className="input-field"><option value="">-- Select --</option>{tournaments.filter(t=>t.status!=='FINISHED').map(t=><option key={t.id} value={t.id}>{t.title} ({qc(t)}/{RQ})</option>)}</select></div>{['ru','de','en'].map(l=><div key={l}><label className="input-label">{l.toUpperCase()}</label><div className="flex gap-2"><input value={(qF as any)[l+'_t']} onChange={e=>setQF({...qF,[l+'_t']:e.target.value})} className="input-field flex-1 text-sm" placeholder={'Q ('+l+')'} /><input value={(qF as any)[l+'_a']} onChange={e=>setQF({...qF,[l+'_a']:e.target.value})} className="input-field w-32 sm:w-40 text-sm" placeholder="Ans" /></div></div>)}<div className="flex gap-2"><button onClick={doCreateQ} className="btn-primary text-sm">Create</button><button onClick={()=>setShowQF(false)} className="btn-ghost text-sm">Cancel</button></div></div>}
            {tournaments.filter(t=>t.status!=='FINISHED').map(t=>{const tqs=t.tournamentQuestions||[];return <div key={t.id} className="mb-6"><div className="flex items-center gap-2 mb-2 flex-wrap"><h3 className="text-sm font-semibold text-white/50">{t.title}</h3><span className={`text-[10px] font-mono ${tqs.length>=RQ?'text-green-400':'text-amber-400'}`}>{tqs.length}/{RQ}</span>{tqs.length<RQ&&<><span className="text-[10px] text-red-400/60">need {RQ-tqs.length}</span><button onClick={()=>doFillTest(t.id)} disabled={busy==='fill-'+t.id} className="text-[10px] bg-brand-500/20 text-brand-400 px-3 py-1 rounded-lg ml-2">{busy==='fill-'+t.id?'...':'Fill test'}</button></>}</div>{tqs.length===0?<div className="card py-4 text-white/20 text-sm text-center">No questions</div>:<div className="space-y-1">{tqs.map((tq:any,i:number)=><div key={tq.id} className="card py-3 px-4"><div className="flex items-start gap-3"><span className="text-white/20 text-xs font-mono w-6 shrink-0">Q{i+1}</span><div className="flex-1">{tq.question?.localizations?.map((l:any)=><div key={l.id} className="text-white/60 text-sm"><span className="text-white/20 font-mono text-[10px] mr-1">{l.language}</span>{l.questionText}{l.correctAnswerLocalized&&<span className="text-green-400/40 ml-2"> {l.correctAnswerLocalized}</span>}</div>)}</div><span className={`text-[10px] ${tq.isUsed?'text-green-400':'text-white/15'}`}>{tq.isUsed?'OK':'o'}</span></div></div>)}</div>}</div>})}
          </div>}

          {/* ========== JUDGE TAB ========== */}
          {tab === 'judge' && <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-5">Judge</h2>

            {/* Select tournament */}
            <div className="space-y-2 mb-6">{tournaments.filter(t=>t.status==='LIVE').length===0&&<div className="card text-center py-10 text-white/30">No active tournaments</div>}{tournaments.filter(t=>t.status==='LIVE').map(t=><button key={t.id} onClick={()=>selectJudgeTournament(t.id)} className={`card-hover w-full text-left ${selT?.id===t.id?'border-brand-500/30 bg-brand-500/5':''}`}><span className="badge-live mr-2">LIVE</span><span className="text-white font-semibold">{t.title}</span><span className="text-white/20 text-xs ml-2">{t._count?.participants||0}</span></button>)}</div>

            {selT && <div className="space-y-4">
              {/* Launch button + timer */}
              <div className="card bg-gradient-to-r from-brand-600/10 to-transparent border-brand-500/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-white font-bold">Launch question</h3>
                    <p className="text-white/40 text-xs mt-1">Left: {selT.tournamentQuestions?.filter((q:any)=>!q.isUsed).length||0}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Admin timer */}
                    {judgePhase === 'reading' && <div className="text-center"><div className="text-amber-400 text-xs">Reading</div><div className="text-2xl font-mono font-bold text-amber-400">{judgeTimer}s</div></div>}
                    {judgePhase === 'answering' && <div className="text-center"><div className="text-brand-400 text-xs">Answering</div><div className="text-2xl font-mono font-bold text-brand-400">{judgeTimer}s</div></div>}
                    {judgePhase === 'judging' && <div className="text-center"><div className="text-green-400 text-xs">Time to judge!</div></div>}

                    <button onClick={doLaunch} className="btn-accent text-sm px-6 py-3"
                      disabled={busy==='launch' || !canLaunchNext || !selT.tournamentQuestions?.some((q:any)=>!q.isUsed)}>
                      {busy==='launch'?'...':'Launch'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Q buttons */}
              <div className="flex gap-2 overflow-x-auto pb-2">{selT.tournamentQuestions?.map((tq:any,i:number)=><button key={tq.id} onClick={async()=>{setAnswers(await api.getAnswersForQuestion(selT.id,tq.questionId));setCurrentQ({questionId:tq.questionId,orderIndex:tq.orderIndex,question:tq.question});}} className={`px-3 py-2 rounded-xl text-xs whitespace-nowrap ${tq.isUsed?'bg-green-500/10 text-green-400 border border-green-500/20':'bg-white/[0.03] text-white/30 border border-white/[0.06]'}`}>Q{i+1} {tq.isUsed?'OK':'o'}</button>)}</div>

              {/* Summary bar */}
              {currentQ && <div className="card bg-white/[0.02] border-white/[0.06]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div><div className="text-2xl font-mono font-bold text-brand-400">Q{(currentQ.orderIndex||0)+1}<span className="text-white/20 text-sm">/{selT.tournamentQuestions?.length||23}</span></div><div className="text-white/30 text-[10px] mt-0.5">Question</div></div>
                  <div><div className="text-2xl font-mono font-bold text-white">{(selT.participants||[]).filter((p:any)=>['PLAYING','APPROVED'].includes(p.matchStatus)).length}</div><div className="text-white/30 text-[10px] mt-0.5">Players</div></div>
                  <div><div className="text-2xl font-mono font-bold text-accent-400">{answers.length}<span className="text-white/20 text-sm">/{(selT.participants||[]).filter((p:any)=>['PLAYING','APPROVED'].includes(p.matchStatus)).length}</span></div><div className="text-white/30 text-[10px] mt-0.5">Answered</div></div>
                  <div><div className="text-2xl font-mono font-bold text-green-400">{answers.filter((a:any)=>a.judgement).length}<span className="text-white/20 text-sm">/{answers.length}</span></div><div className="text-white/30 text-[10px] mt-0.5">Judged</div></div>
                </div>
              </div>}

              {/* Scoreboard */}
              {selT.participants && selT.participants.filter((p:any)=>['PLAYING','APPROVED','WON','LOST','FINISHED'].includes(p.matchStatus)).length > 0 && <div className="card bg-white/[0.02] border-white/[0.06]">
                <h4 className="text-xs font-semibold text-white/40 mb-2">Scoreboard</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                  {selT.participants.filter((p:any)=>['PLAYING','APPROVED','WON','LOST','FINISHED'].includes(p.matchStatus)).sort((a:any,b:any)=>b.currentScoreUser-a.currentScoreUser || a.currentScoreSystem-b.currentScoreSystem).map((p:any,i:number)=>{
                    const hasAnswered = answers.some((a:any)=>a.user?.profile?.nickname===p.user?.profile?.nickname);
                    const myAns = answers.find((a:any)=>a.user?.profile?.nickname===p.user?.profile?.nickname);
                    const isJudged = myAns?.judgement;
                    const isCorrect = isJudged?.decision === 'ACCEPTED';
                    const borderColor = isJudged ? (isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5') : hasAnswered ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/[0.06]';
                    return <div key={p.id} className={`flex items-center justify-between px-2.5 py-2 rounded-xl border ${borderColor}`}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-white/20 text-[10px] font-mono">{i+1}</span>
                        <span className="text-white text-xs font-medium truncate">{p.user?.profile?.nickname}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-xs font-bold"><span className="text-brand-400">{p.currentScoreUser}</span><span className="text-white/15">:</span><span className="text-red-400">{p.currentScoreSystem}</span></span>
                        {isJudged && <span className={`text-[10px] ${isCorrect?'text-green-400':'text-red-400'}`}>{isCorrect?'✓':'✗'}</span>}
                        {!isJudged && hasAnswered && <span className="text-[10px] text-amber-400">●</span>}
                      </div>
                    </div>
                  })}
                </div>
              </div>}

              {/* Current question display */}
              {currentQ && <div className="card bg-white/[0.02] border-brand-500/10">
                <div className="flex items-center gap-2 mb-2"><span className="text-[10px] text-white/30 font-mono">Q{currentQ.orderIndex+1}</span></div>
                {currentQLocs.map((l:any)=><p key={l.id} className="text-white/60 text-sm"><span className="text-white/20 font-mono text-[10px] mr-1">{l.language}</span>{l.questionText}</p>)}
                {correctAnswers && <p className="text-green-400/60 text-sm mt-2">Answer: <span className="text-green-400 font-semibold">{correctAnswers}</span></p>}
              </div>}

              {/* Answers */}
              {answers.length > 0 ? <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white/50">Answers ({answers.filter((a:any)=>a.judgement).length}/{answers.length} judged):</h3>
                  <div className="flex gap-1">{(['all','unjudged','judged'] as const).map(f=><button key={f} onClick={()=>setJudgeFilter(f)} className={`text-[10px] px-3 py-1 rounded-lg ${judgeFilter===f?'bg-brand-500/20 text-brand-400':'bg-white/[0.03] text-white/30'}`}>{f==='all'?`All (${answers.length})`:f==='unjudged'?`Unjudged (${answers.filter((a:any)=>!a.judgement).length})`:`Judged (${answers.filter((a:any)=>a.judgement).length})`}</button>)}</div>
                </div>

                {answers.filter((a:any) => judgeFilter === 'all' ? true : judgeFilter === 'unjudged' ? !a.judgement : !!a.judgement).map((a:any) => {
                  const sim = checkSimilarity(a.answerText || '', correctAnswers);
                  const simColor = sim === 'match' ? 'border-green-500/30 bg-green-500/5' : sim === 'close' ? 'border-amber-500/30 bg-amber-500/5' : '';
                  const simBadge = sim === 'match' ? <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-md ml-2">AI: match</span> : sim === 'close' ? <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md ml-2">AI: close</span> : null;
                  return <div key={a.id} className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${simColor}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">{(a.user?.profile?.nickname||'?')[0].toUpperCase()}</div>
                    <div className="min-w-0">
                      <span className="text-brand-400 font-medium text-sm">{a.user?.profile?.nickname}{simBadge}</span>
                      <div className="text-white text-lg font-semibold truncate">{a.answerText || '(no answer)'}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {a.judgement ? <div className="flex items-center gap-1.5"><span className={`badge ${a.judgement.decision==='ACCEPTED'?'badge-finished':'bg-red-500/15 text-red-400 border border-red-500/20'}`}>{a.judgement.decision==='ACCEPTED'?'OK':'X'}</span><button onClick={()=>doUndo(a.judgement.id)} className="text-[10px] text-white/20 hover:text-amber-400 px-1.5 py-1 rounded hover:bg-amber-500/10 transition-colors" title="Change decision">↻</button></div>
                    : (!a.answerText || a.answerText === '(no answer)') ? <span className="badge bg-red-500/15 text-red-400 border border-red-500/20">Auto X</span>
                    : <><button onClick={()=>doJudge(a.id,'ACCEPTED')} className="btn-primary text-xs px-5 py-2.5">OK</button><button onClick={()=>doJudge(a.id,'REJECTED')} className="btn-danger text-xs px-5 py-2.5">X</button></>}
                  </div>
                </div>})}
                {allJudged && <div className="text-center text-green-400 text-sm py-2">All judged! Ready for next question.</div>}
              </div> : <div className="card text-center py-8 text-white/20 text-sm">{judgePhase === 'idle' ? 'Launch a question to start' : judgePhase === 'judging' ? 'Loading answers...' : 'Waiting for answers...'}</div>}
            </div>}
          </div>}

          {tab==='users'&&users?.data&&<div className="animate-fade-in"><h2 className="text-xl font-bold text-white mb-5">Players</h2><div className="space-y-2">{users.data.map((u:any)=><div key={u.id} className="card flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/30 text-sm font-bold">{(u.nickname||u.email[0]).charAt(0).toUpperCase()}</div><div><span className="text-white font-medium text-sm">{u.nickname||u.email}</span><div className="flex gap-2 mt-0.5"><span className="badge-draft text-[10px]">{u.role}</span></div></div></div><div className="text-white/20 text-xs font-mono">{u.stats?.totalAnswered||0}</div></div>)}</div></div>}
          {tab==='logs'&&logs?.data&&<div className="animate-fade-in"><h2 className="text-xl font-bold text-white mb-5">Logs</h2><div className="space-y-1">{logs.data.map((l:any)=><div key={l.id} className="card py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1"><div className="flex items-center gap-2"><span className="badge-draft text-[10px]">{l.actionType}</span><span className="text-white/40 text-xs">{l.entityType}</span></div><div className="text-white/20 text-[11px] font-mono">{l.adminNickname} | {new Date(l.createdAt).toLocaleString()}</div></div>)}</div></div>}
        </div>
      </div>
    </div>
  );
}
