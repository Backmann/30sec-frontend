'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import io, { Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws') || 'wss://30sec.org';

export default function AdminLivePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const tournamentId = params.id as string;

  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>('ru');
  const [soundOn, setSoundOn] = useState<boolean>(() => typeof window !== 'undefined' && localStorage.getItem('liveSoundOn') !== 'false');
  const socketRef = useRef<Socket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastAnswersCountRef = useRef(0);
  const lastTimerRef = useRef(0);
  const lastPhaseRef = useRef<string>('');

  // ═══ Sound effects ═══
  const playSound = (type: 'tick' | 'ding' | 'victory') => {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (type === 'tick') {
        // Short low click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'ding') {
        // Pleasant bell "ding"
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'victory') {
        // Rising fanfare: C5 -> E5 -> G5 -> C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const startTime = ctx.currentTime + i * 0.15;
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.connect(gain).connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
      }
    } catch (e) { /* audio blocked */ }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (typeof window !== 'undefined') localStorage.setItem('liveSoundOn', String(next));
  };

  // Load user and initial state
  useEffect(() => { loadUser(); }, []);
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') { router.push('/dashboard'); return; }
    fetchState();
  }, [user, tournamentId]);

  // WebSocket for real-time updates
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    const socket = io(WS_URL, { path: '/socket.io', auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join_tournament', { tournamentId });

    // Re-fetch on any meaningful event
    const events = ['phase_changed', 'timer_tick', 'answer_submitted', 'judgement_made', 'score_updated', 'question_launched', 'match_finished'];
    events.forEach(ev => socket.on(ev, () => fetchState()));

    return () => {
      socket.emit('leave_tournament', { tournamentId });
      socket.disconnect();
    };
  }, [user, tournamentId]);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchState = async () => {
    try {
      const data = await api.getAdminLiveState(tournamentId);
      setState(data);
      setFetchError(null);
      if (data?.currentQuestion?.localizations?.length && !data.currentQuestion.localizations.find((l: any) => l.language === selectedLang)) {
        setSelectedLang(data.currentQuestion.localizations[0].language);
      }
    } catch (e: any) {
      console.error('Failed to fetch live state', e);
      setFetchError(e?.message || 'Не удалось загрузить турнир');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh timer every second while phase is active
  useEffect(() => {
    if (!state || state.phase === 'idle') return;
    const interval = setInterval(() => fetchState(), 1000);
    return () => clearInterval(interval);
  }, [state?.phase]);

  // ═══ Sound triggers on state changes ═══
  useEffect(() => {
    if (!state) return;
    // Tick-tock last 5 seconds of answering
    if (state.phase === 'answering' && state.timerSeconds <= 5 && state.timerSeconds > 0 && state.timerSeconds !== lastTimerRef.current) {
      playSound('tick');
    }
    lastTimerRef.current = state.timerSeconds;
    // Ding on new answer during answering/judging
    if (state.currentAnswers.length > lastAnswersCountRef.current && (state.phase === 'answering' || state.phase === 'judging')) {
      playSound('ding');
    }
    lastAnswersCountRef.current = state.currentAnswers.length;
    // Victory when someone wins
    const hasNewWinner = state.participants.some((p: any) => p.matchStatus === 'WON');
    if (hasNewWinner && lastPhaseRef.current !== 'won') {
      playSound('victory');
      lastPhaseRef.current = 'won';
    }
    if (!hasNewWinner) lastPhaseRef.current = state.phase;
  }, [state, soundOn]);

  // ═══ Hotkeys ═══
  useEffect(() => {
    if (!state) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Space — launch next question
      if (e.code === 'Space') {
        e.preventDefault();
        const canLaunch = state.progress.remainingQuestions > 0 && (state.phase === 'idle' || (state.phase === 'judging' && state.currentAnswers.length > 0 && state.currentAnswers.every((a: any) => a.judged)));
        if (canLaunch && state.tournament.status === 'LIVE') doLaunchQuestion();
      }
      // 1 — accept first unjudged
      if (e.key === '1' && state.phase === 'judging') {
        e.preventDefault();
        const unjudged = state.currentAnswers.find((a: any) => !a.judged);
        if (unjudged) doJudge(unjudged.id, 'ACCEPTED');
      }
      // 2 — reject first unjudged
      if (e.key === '2' && state.phase === 'judging') {
        e.preventDefault();
        const unjudged = state.currentAnswers.find((a: any) => !a.judged);
        if (unjudged) doJudge(unjudged.id, 'REJECTED');
      }
      // F — toggle fullscreen
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
      // Esc handled natively by browser for fullscreen exit
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  const doLaunchQuestion = async () => {
    setBusy('launch');
    try { await api.launchQuestion(tournamentId); await fetchState(); }
    catch (e: any) { alert(e.message || 'Ошибка запуска'); }
    finally { setBusy(null); }
  };

  const doJudge = async (answerId: string, decision: 'ACCEPTED' | 'REJECTED') => {
    setBusy('judge-' + answerId);
    try { await api.judgeAnswer(answerId, decision); await fetchState(); }
    catch (e: any) { alert(e.message || 'Ошибка'); }
    finally { setBusy(null); }
  };

  const doStart = async () => {
    if (!confirm('Запустить турнир?')) return;
    setBusy('start');
    try { await api.startTournament(tournamentId); await fetchState(); }
    catch (e: any) { alert(e.message || 'Ошибка'); }
    finally { setBusy(null); }
  };

  const doFinish = async () => {
    if (!confirm('Завершить турнир? Это действие нельзя отменить.')) return;
    setBusy('finish');
    try { await api.finishTournament(tournamentId); await fetchState(); }
    catch (e: any) { alert(e.message || 'Ошибка'); }
    finally { setBusy(null); }
  };

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <div className="text-xl text-white font-semibold mb-2">Не удалось загрузить трансляцию</div>
        <div className="text-white/50 text-sm mb-6 max-w-md">{fetchError}</div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/admin')} className="btn-primary">В админку</button>
          <button onClick={() => { setFetchError(null); setLoading(true); fetchState(); }} className="btn-ghost">Попробовать снова</button>
        </div>
      </div>
    );
  }
  if (loading || !state) {
    return <div className="min-h-screen flex items-center justify-center text-white/40">Загрузка трансляции…</div>;
  }

  const { tournament, progress, phase, timerSeconds, currentQuestion, participants, currentAnswers, spectatorCount } = state;
  const loc = currentQuestion?.localizations.find((l: any) => l.language === selectedLang) || currentQuestion?.localizations[0];
  const allJudged = currentAnswers.length > 0 && currentAnswers.every((a: any) => a.judged);
  const hasUnjudged = currentAnswers.some((a: any) => !a.judged);
  const canLaunchNext = progress.remainingQuestions > 0 && (phase === 'idle' || (phase === 'judging' && allJudged));
  const isDecisive = participants.some((p: any) => p.scoreUser === 11 && p.scoreSystem === 11);
  const hasWinner = participants.some((p: any) => p.matchStatus === 'WON');
  const winner = participants.find((p: any) => p.matchStatus === 'WON');
  const finishedPlayers = participants.filter((p: any) => ['WON', 'LOST', 'FINISHED'].includes(p.matchStatus));
  const isPreStart = tournament.status === 'DRAFT' || tournament.status === 'SCHEDULED';
  const isFinished = tournament.status === 'FINISHED';
  const timeUntilStart = tournament.startAt ? Math.max(0, Math.floor((new Date(tournament.startAt).getTime() - Date.now()) / 1000)) : 0;

  // Phase colors & labels
  const phaseStyle: any = {
    idle: { bg: 'bg-white/5', color: 'text-white/50', label: 'Ожидание' },
    reading: { bg: 'bg-blue-500/15', color: 'text-blue-400', label: 'Чтение вопроса' },
    answering: { bg: 'bg-accent-500/15', color: 'text-accent-400', label: 'Ответы игроков' },
    judging: { bg: 'bg-amber-500/15', color: 'text-amber-400', label: 'Судейство' },
  };
  const ps = phaseStyle[phase] || phaseStyle.idle;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* ═══ Header ═══ */}
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="text-white/40 hover:text-white text-sm">← Админка</button>
          <div>
            <h1 className="text-2xl font-bold text-white">{tournament.title}</h1>
            <div className="text-white/40 text-sm flex items-center gap-3 mt-1 flex-wrap">
              <span className={`${ps.bg} ${ps.color} px-2 py-0.5 rounded-lg text-xs font-semibold`}>{ps.label}</span>
              {isPreStart && timeUntilStart > 0 && (
                <span className="text-brand-400 font-mono font-semibold">
                  старт через {Math.floor(timeUntilStart / 60).toString().padStart(2, '0')}:{(timeUntilStart % 60).toString().padStart(2, '0')}
                </span>
              )}
              {isPreStart && timeUntilStart === 0 && <span className="text-green-400 font-semibold">готов к запуску</span>}
              {!isPreStart && <span>Вопрос {progress.currentQuestionNumber} / {progress.totalQuestions}</span>}
              <span>· {participants.length} игроков</span>
              {spectatorCount > 0 && <span>· 👁 {spectatorCount}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-white/30 font-mono">
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">Space</kbd>
            <span>Запуск</span>
            <kbd className="ml-2 px-1.5 py-0.5 bg-white/5 rounded border border-white/10">1</kbd>
            <span>✓</span>
            <kbd className="ml-1 px-1.5 py-0.5 bg-white/5 rounded border border-white/10">2</kbd>
            <span>✗</span>
            <kbd className="ml-2 px-1.5 py-0.5 bg-white/5 rounded border border-white/10">F</kbd>
            <span>Экран</span>
          </div>
          <button onClick={toggleSound} title={soundOn ? 'Звук включён' : 'Звук выключен'} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition">
            {soundOn ? '🔊' : '🔇'}
          </button>
          {tournament.status === 'SCHEDULED' || tournament.status === 'DRAFT' ? (
            <button onClick={doStart} disabled={busy === 'start'} className="btn-primary text-sm">▶ Запустить турнир</button>
          ) : tournament.status === 'LIVE' ? (
            <button onClick={doFinish} disabled={busy === 'finish'} className="btn-ghost text-sm text-red-400 border-red-500/30 hover:bg-red-500/10">⏹ Завершить</button>
          ) : (
            <span className="text-white/40 text-sm">{tournament.status}</span>
          )}
        </div>
      </header>

      {/* ═══ PRE-START SCREEN ═══ */}
      {isPreStart && (
        <div className="max-w-3xl mx-auto">
          <div className="card text-center py-16 mb-6">
            <div className="text-5xl mb-4">🎯</div>
            <div className="text-white/40 text-sm uppercase tracking-wider mb-2">До начала турнира</div>
            {timeUntilStart > 0 ? (
              <div className="text-[80px] font-black font-mono text-brand-400 leading-none">
                {Math.floor(timeUntilStart / 60).toString().padStart(2, '0')}:{(timeUntilStart % 60).toString().padStart(2, '0')}
              </div>
            ) : (
              <div className="text-[80px] font-black font-mono text-green-400 leading-none">GO!</div>
            )}
            <div className="text-white/30 text-sm mt-3">
              {new Date(tournament.startAt).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}
            </div>
            <button onClick={doStart} disabled={busy === 'start'} className="btn-primary text-lg px-10 mt-8">
              ▶ Запустить сейчас
            </button>
          </div>
          <div className="card">
            <div className="section-title mb-4 flex items-center justify-between">
              <span>Одобренные участники · {participants.length}</span>
              {participants.length > 0 && spectatorCount > 0 && (
                <span className="text-green-400/80 text-xs font-normal">👁 {spectatorCount} на странице игры</span>
              )}
            </div>
            {participants.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {participants.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/[0.03]">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 text-xs font-bold relative">
                      {p.nickname[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-white text-sm truncate">{p.nickname}</div>
                      {p.flagCode && <div className="text-white/40 text-[10px] uppercase">{p.flagCode}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/30 text-sm text-center py-6">Пока нет одобренных заявок</div>
            )}
            {participants.length > 0 && spectatorCount === 0 && (
              <div className="mt-3 text-amber-400/70 text-xs text-center">⚠️ Никто ещё не открыл страницу игры. Попросите игроков подключиться.</div>
            )}
          </div>
        </div>
      )}

      {/* ═══ RECAP SCREEN (after finish) ═══ */}
      {isFinished && (
        <div className="max-w-3xl mx-auto">
          <div className="card text-center py-16 mb-6 bg-gradient-to-b from-accent-500/10 to-transparent border-accent-500/30">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-white/40 text-sm uppercase tracking-wider mb-2">Турнир завершён</div>
            {winner ? (
              <>
                <div className="text-4xl font-black text-accent-400 mb-2">{winner.nickname}</div>
                <div className="text-xl text-white/60">
                  Победитель со счётом <span className="text-white font-bold">{winner.scoreUser}</span>
                  <span className="text-white/40 mx-1">:</span>
                  <span className="text-white/60">{winner.scoreSystem}</span>
                </div>
              </>
            ) : (
              <div className="text-xl text-white/60">Итоги ниже</div>
            )}
          </div>
          <div className="card">
            <div className="section-title mb-4">Итоговые результаты</div>
            <div className="space-y-2">
              {participants.map((p: any, idx: number) => {
                const isWinner = p.matchStatus === 'WON';
                return (
                  <div key={p.id} className={`card py-3 flex items-center gap-3 ${isWinner ? 'border-accent-500/50 bg-accent-500/10' : ''}`}>
                    <span className={`text-2xl font-bold font-mono w-8 shrink-0 ${idx === 0 ? 'text-accent-400' : 'text-white/30'}`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{p.nickname} {p.flagCode && <span className="text-xs text-white/40">{p.flagCode.toUpperCase()}</span>}</div>
                      <div className="text-[10px] uppercase font-bold text-white/40">
                        {p.matchStatus === 'WON' ? '🏆 ПОБЕДА' : p.matchStatus === 'LOST' ? 'Поражение' : 'Завершён'}
                      </div>
                    </div>
                    <div className="font-mono text-lg shrink-0">
                      <span className="text-white font-bold">{p.scoreUser}</span>
                      <span className="text-white/30 mx-1">:</span>
                      <span className="text-white/60">{p.scoreSystem}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ DECISIVE QUESTION BANNER ═══ */}
      {!isPreStart && !isFinished && isDecisive && phase !== 'idle' && (
        <div className="mb-6 card bg-gradient-to-r from-red-500/20 via-amber-500/20 to-red-500/20 border-red-500/40 text-center py-4 animate-pulse">
          <div className="text-2xl font-black text-red-400">⚡ РЕШАЮЩИЙ ВОПРОС</div>
          <div className="text-white/60 text-sm mt-1">Счёт 11:11 — кто ответит, тот и победит</div>
        </div>
      )}

      {/* ═══ Main grid (live) ═══ */}
      {!isPreStart && !isFinished && (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* ─── LEFT COLUMN: Stage ─── */}
        <div className="space-y-6">
          {/* TIMER & PHASE */}
          <div key={phase} className="card text-center py-10 relative overflow-hidden animate-phase-reveal">
            {(phase === 'reading' || phase === 'answering') && (
              <>
                <div className={`text-[120px] font-black font-mono leading-none ${ps.color} ${timerSeconds <= 5 && phase === 'answering' ? 'animate-pulse' : ''}`}>
                  {timerSeconds}
                </div>
                <div className={`text-xl ${ps.color} font-semibold mt-2`}>{ps.label}</div>
              </>
            )}
            {phase === 'judging' && (
              <>
                <div className="text-6xl">⚖️</div>
                <div className="text-2xl text-amber-400 font-bold mt-3">Судейство</div>
                <div className="text-white/40 text-sm mt-2">
                  {allJudged ? 'Все ответы оценены' : `${currentAnswers.filter((a: any) => !a.judged).length} ждут решения`}
                </div>
              </>
            )}
            {phase === 'idle' && tournament.status === 'LIVE' && (
              <>
                <div className="text-5xl mb-3">⏳</div>
                <div className="text-xl text-white/60">
                  {progress.remainingQuestions === 0 ? 'Все вопросы сыграны' : `Готов к вопросу ${progress.currentQuestionNumber + 1} из ${progress.totalQuestions}`}
                </div>
                {progress.remainingQuestions > 0 && (
                  <div className="text-white/30 text-sm mt-2">
                    Осталось {progress.remainingQuestions} {progress.remainingQuestions === 1 ? 'вопрос' : progress.remainingQuestions < 5 ? 'вопроса' : 'вопросов'}
                  </div>
                )}
                {canLaunchNext && (
                  <button onClick={doLaunchQuestion} disabled={busy === 'launch'} className="btn-primary mt-6 text-lg px-8">
                    ▶ Запустить вопрос {progress.currentQuestionNumber + 1}
                  </button>
                )}
                {progress.remainingQuestions === 0 && (
                  <button onClick={doFinish} disabled={busy === 'finish'} className="btn-primary mt-6 text-lg px-8 bg-accent-500/20 border-accent-500/40 text-accent-400 hover:bg-accent-500/30">
                    🏁 Завершить турнир
                  </button>
                )}
              </>
            )}
            {phase === 'idle' && tournament.status !== 'LIVE' && (
              <>
                <div className="text-5xl mb-3">🎯</div>
                <div className="text-xl text-white/60">{tournament.status === 'FINISHED' ? 'Турнир завершён' : 'Турнир ещё не запущен'}</div>
              </>
            )}
          </div>

          {/* QUESTION CARD */}
          {currentQuestion && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white/40 text-xs uppercase tracking-wider">Вопрос {progress.currentQuestionNumber}</div>
                <div className="flex gap-1">
                  {currentQuestion.localizations.map((l: any) => (
                    <button key={l.language}
                      onClick={() => setSelectedLang(l.language)}
                      className={`px-2 py-0.5 rounded text-xs font-mono uppercase ${selectedLang === l.language ? 'bg-brand-500/20 text-brand-400' : 'text-white/30 hover:text-white/60'}`}>
                      {l.language}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-white text-xl leading-relaxed mb-4">{loc?.questionText}</div>
              {loc?.correctAnswer && (
                <div className="border-t border-white/[0.06] pt-3 mt-3">
                  <div className="text-green-400/60 text-xs uppercase tracking-wider mb-1">Правильный ответ</div>
                  <div className="text-green-400 text-lg font-semibold">{loc.correctAnswer}</div>
                </div>
              )}
            </div>
          )}

          {/* ANSWERS */}
          {currentAnswers.length > 0 && (
            <div>
              <div className="section-title mb-3 flex items-center justify-between">
                <span>Ответы игроков · {currentAnswers.length}</span>
                {hasUnjudged && <span className="text-amber-400 text-xs">⚠️ Нужно оценить</span>}
              </div>
              <div className="space-y-2">
                {currentAnswers.map((a: any) => {
                  const isMatch = loc?.correctAnswer && a.answerText?.toLowerCase().trim() === loc.correctAnswer.toLowerCase().trim();
                  const borderClass = a.judged
                    ? (a.decision === 'ACCEPTED' ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5')
                    : (isMatch ? 'border-green-500/20 bg-green-500/[0.02]' : 'border-white/[0.06]');
                  return (
                    <div key={a.id} className={`card flex items-center gap-3 animate-answer-in ${borderClass}`}>
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 text-sm font-bold shrink-0">
                        {a.nickname[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span className="text-white font-semibold">{a.nickname}</span>
                          {a.flagCode && <span>{a.flagCode.toUpperCase()}</span>}
                          {isMatch && !a.judged && <span className="text-green-400">AI: совпадает</span>}
                        </div>
                        <div className="text-white text-base mt-0.5 truncate">{a.answerText || <em className="text-white/30">пусто</em>}</div>
                      </div>
                      {a.judged ? (
                        <div className={`px-3 py-2 rounded-xl text-sm font-bold shrink-0 ${a.decision === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {a.decision === 'ACCEPTED' ? '✓' : '✗'}
                        </div>
                      ) : (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => doJudge(a.id, 'ACCEPTED')} disabled={busy === 'judge-' + a.id}
                            className="w-11 h-11 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xl font-bold disabled:opacity-40">✓</button>
                          <button onClick={() => doJudge(a.id, 'REJECTED')} disabled={busy === 'judge-' + a.id}
                            className="w-11 h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xl font-bold disabled:opacity-40">✗</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN: Scoreboard ─── */}
        <div>
          <div className="section-title mb-3">Счёт · {participants.length}</div>
          <div className="space-y-2">
            {participants.map((p: any, idx: number) => {
              const nearWin = p.scoreUser >= 11;
              const nearLose = p.scoreSystem >= 11;
              const finished = ['WON', 'LOST', 'FINISHED'].includes(p.matchStatus);
              const isWinner = p.matchStatus === 'WON';
              const isLoser = p.matchStatus === 'LOST';
              return (
                <div key={p.id} className={`card py-3 flex items-center gap-3 ${isWinner ? 'border-accent-500/60 bg-accent-500/10 ring-2 ring-accent-500/30' : isLoser ? 'border-red-500/40 bg-red-500/5 opacity-60' : nearWin ? 'border-green-500/40 bg-green-500/5' : nearLose ? 'border-red-500/40 bg-red-500/5' : ''}`}>
                  <span className="text-white/30 text-xs font-mono w-5 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">
                      {p.nickname} {p.flagCode && <span className="text-xs text-white/40">{p.flagCode.toUpperCase()}</span>}
                    </div>
                    {finished && (
                      <div className={`text-[10px] font-bold uppercase ${p.matchStatus === 'WON' ? 'text-green-400' : p.matchStatus === 'LOST' ? 'text-red-400' : 'text-white/40'}`}>
                        {p.matchStatus === 'WON' ? '🏆 Победа' : p.matchStatus === 'LOST' ? 'Поражение' : 'Завершён'}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm">
                      <span className={`font-bold ${nearWin ? 'text-green-400' : 'text-white'}`}>{p.scoreUser}</span>
                      <span className="text-white/30 mx-1">:</span>
                      <span className={`font-bold ${nearLose ? 'text-red-400' : 'text-white/60'}`}>{p.scoreSystem}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {participants.length === 0 && <div className="card py-6 text-center text-white/30 text-sm">Нет активных игроков</div>}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
