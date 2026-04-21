'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import io, { Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws').replace('/api', '') || 'wss://30sec.org';

export default function PublicLivePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tournamentId = params.id as string;
  const projectorMode = searchParams.get('mode') === 'projector';
  const showQR = searchParams.get('qr') !== '0';
  const watchUrl = typeof window !== 'undefined' ? `${window.location.origin}/watch/${tournamentId}` : '';
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState<string>('ru');
  const socketRef = useRef<Socket | null>(null);

  const fetchState = async () => {
    try {
      const data = await api.getPublicLive(tournamentId);
      setState(data);
      if (data?.currentQuestion?.localizations?.length && !data.currentQuestion.localizations.find((l: any) => l.language === selectedLang)) {
        setSelectedLang(data.currentQuestion.localizations[0].language);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    // Connect to WebSocket for realtime updates (no auth required for public)
    const socket = io(WS_URL, { path: '/socket.io', transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join_tournament', { tournamentId });
    const events = ['phase_changed', 'timer_tick', 'judgement_made', 'score_updated', 'question_launched', 'match_finished'];
    events.forEach(ev => socket.on(ev, () => fetchState()));
    return () => { socket.emit('leave_tournament', { tournamentId }); socket.disconnect(); };
  }, [tournamentId]);

  // Poll every second while active
  useEffect(() => {
    if (!state || state.phase === 'idle') return;
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, [state?.phase]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white/40">…</div>;
  if (!state) return <div className="min-h-screen flex items-center justify-center text-white/40">Трансляция недоступна</div>;

  const { tournament, progress, phase, timerSeconds, currentQuestion, participants } = state;
  const loc = currentQuestion?.localizations.find((l: any) => l.language === selectedLang) || currentQuestion?.localizations[0];
  const isDecisive = participants.some((p: any) => p.scoreUser === 11 && p.scoreSystem === 11);
  const winner = participants.find((p: any) => p.matchStatus === 'WON');
  const isFinished = tournament.status === 'FINISHED';

  const phaseStyle: any = {
    idle: { bg: 'bg-white/5', color: 'text-white/50', label: '' },
    reading: { bg: 'bg-blue-500/10', color: 'text-blue-400', label: 'ЧТЕНИЕ' },
    answering: { bg: 'bg-accent-500/10', color: 'text-accent-400', label: 'ОТВЕТ' },
    judging: { bg: 'bg-amber-500/10', color: 'text-amber-400', label: 'СУДЕЙСТВО' },
  };
  const ps = phaseStyle[phase] || phaseStyle.idle;

  return (
    <div className={`min-h-screen ${projectorMode ? 'p-12' : 'p-8'} flex flex-col relative`}>
      {/* QR code for spectators */}
      {showQR && !isFinished && watchUrl && (
        <div className="fixed bottom-6 right-6 card p-3 flex items-center gap-3 z-10 bg-black/60 backdrop-blur">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(watchUrl)}&size=100x100&bgcolor=0f1420&color=ffffff&qzone=1`} alt="QR" width="80" height="80" className="rounded-lg" />
          <div className="text-xs">
            <div className="text-white/40 uppercase tracking-wider mb-1">Смотреть</div>
            <div className="text-white/80 font-mono text-[11px]">30sec.org/watch</div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{tournament.title}</h1>
          <div className="text-white/40 text-sm mt-1">
            {!isFinished && `Вопрос ${progress.currentQuestionNumber} / ${progress.totalQuestions}`}
            {isFinished && 'Турнир завершён'}
          </div>
        </div>
        {!isFinished && ps.label && (
          <div className={`${ps.bg} ${ps.color} px-5 py-2 rounded-2xl font-bold tracking-wider`}>
            {ps.label}
          </div>
        )}
      </header>

      {/* FINISHED — winner or top-3 screen */}
      {isFinished && (
        <div className="flex-1 flex flex-col items-center justify-center">
          {winner ? (
            <>
              {/* Fireworks (emojis) */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {['🎉','✨','🎊','⭐','🌟','💫'].map((e, i) => (
                  <div key={i} className="absolute text-4xl animate-firework" style={{
                    left: `${10 + (i * 15) % 80}%`,
                    top: `${20 + (i * 23) % 60}%`,
                    animationDelay: `${i * 0.3}s`,
                  }}>{e}</div>
                ))}
              </div>
              <div className={`${projectorMode ? 'text-[200px]' : 'text-9xl'} mb-6 animate-bounce relative`}>🏆</div>
              <div className={`${projectorMode ? 'text-2xl' : 'text-lg'} text-white/40 mb-2 uppercase tracking-widest`}>Победитель</div>
              <div className={`${projectorMode ? 'text-9xl' : 'text-6xl'} font-black text-accent-400 mb-3 relative`}>{winner.nickname}</div>
              <div className={`${projectorMode ? 'text-5xl' : 'text-3xl'} text-white/60 font-mono`}>
                <span className="text-white">{winner.scoreUser}</span>
                <span className="text-white/30 mx-2">:</span>
                <span>{winner.scoreSystem}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-6">🏁</div>
              <div className="text-white/40 text-lg mb-6 uppercase tracking-widest">Итоги турнира</div>
              <div className="space-y-3 max-w-md w-full">
                {participants.slice(0, 3).map((p: any, idx: number) => (
                  <div key={p.id} className="card flex items-center gap-4 px-5 py-4">
                    <span className="text-3xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span className="text-2xl text-white font-bold flex-1">{p.nickname}</span>
                    <span className="font-mono text-xl font-bold">
                      <span className="text-white">{p.scoreUser}</span>
                      <span className="text-white/30 mx-1">:</span>
                      <span className="text-white/40">{p.scoreSystem}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ACTIVE — question + timer + scoreboard */}
      {!isFinished && (
        <div className="flex-1 flex flex-col gap-8">
          {/* DECISIVE banner */}
          {isDecisive && phase !== 'idle' && (
            <div className="card bg-gradient-to-r from-red-500/20 via-amber-500/20 to-red-500/20 border-red-500/40 text-center py-3 animate-pulse">
              <div className="text-2xl font-black text-red-400">⚡ РЕШАЮЩИЙ ВОПРОС</div>
            </div>
          )}

          {/* Timer + question */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {(phase === 'reading' || phase === 'answering') && (
              <div className={`${projectorMode ? 'text-[280px]' : 'text-[200px]'} font-black font-mono leading-none mb-8 ${ps.color} ${timerSeconds <= 5 && phase === 'answering' ? 'animate-pulse' : ''}`}>
                {timerSeconds}
              </div>
            )}
            {phase === 'judging' && (
              <>
                <div className="text-7xl mb-6">⚖️</div>
                <div className="text-3xl text-amber-400 font-semibold mb-8">Судейство</div>
              </>
            )}
            {phase === 'idle' && !isFinished && (
              <>
                <div className="text-6xl mb-6">⏳</div>
                <div className="text-2xl text-white/40">
                  {progress.remainingQuestions === 0 ? 'Все вопросы сыграны' : 'Готовимся к следующему вопросу'}
                </div>
              </>
            )}

            {currentQuestion && loc && (phase === 'reading' || phase === 'answering' || phase === 'judging') && (
              <div className={`card ${projectorMode ? 'max-w-6xl' : 'max-w-4xl'} w-full py-8 px-10 text-center`}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">Вопрос {progress.currentQuestionNumber}</div>
                <div className={`${projectorMode ? 'text-5xl' : 'text-3xl'} font-semibold leading-tight`}>{loc.questionText}</div>
                {currentQuestion.questionImages && currentQuestion.questionImages.length > 0 && (
                  <div className={`grid gap-3 mt-6 ${currentQuestion.questionImages.length === 1 ? 'grid-cols-1' : currentQuestion.questionImages.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {currentQuestion.questionImages.map((img: any, i: number) => (
                      <img key={img.id || i} src={img.url} alt="" className="w-full aspect-video object-cover rounded-xl border border-white/10" />
                    ))}
                  </div>
                )}
                {phase === 'judging' && currentQuestion.answerImages && currentQuestion.answerImages.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-green-400 mb-3">Правильный ответ</div>
                    <div className={`grid gap-3 ${currentQuestion.answerImages.length === 1 ? 'grid-cols-1' : currentQuestion.answerImages.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {currentQuestion.answerImages.map((img: any, i: number) => (
                        <div key={img.id || i} className="space-y-1">
                          <img src={img.url} alt="" className="w-full aspect-video object-cover rounded-xl border border-green-500/30" />
                          {img.caption && <div className="text-white/70 text-sm">{img.caption}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Judged answers during judging phase */}
            {phase === 'judging' && state.currentAnswers && state.currentAnswers.length > 0 && (
              <div className={`${projectorMode ? 'max-w-5xl' : 'max-w-3xl'} w-full mt-6 space-y-2`}>
                {state.currentAnswers.map((a: any) => (
                  <div key={a.id} className={`card flex items-center gap-3 py-3 px-5 ${a.decision === 'ACCEPTED' ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5 opacity-70'}`}>
                    <span className={`text-2xl ${a.decision === 'ACCEPTED' ? 'text-green-400' : 'text-red-400'}`}>{a.decision === 'ACCEPTED' ? '✓' : '✗'}</span>
                    <span className={`${projectorMode ? 'text-xl' : 'text-base'} text-white font-semibold`}>{a.nickname}</span>
                    {a.flagCode && <span className="text-white/40 text-xs uppercase">{a.flagCode}</span>}
                    <span className={`${projectorMode ? 'text-xl' : 'text-base'} text-white/70 flex-1 truncate`}>"{a.answerText || '(пусто)'}"</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scoreboard */}
          <div className="text-center text-xs uppercase tracking-[0.3em] text-white/30 font-mono mb-2">
            <span>игрок</span>
            <span className="mx-2">vs</span>
            <span className="text-brand-400 font-semibold">30sec.</span>
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            {participants.map((p: any) => {
              const nearWin = p.scoreUser >= 11;
              const nearLose = p.scoreSystem >= 11;
              return (
                <div key={p.id} className={`card flex items-center gap-4 px-5 py-3 ${nearWin ? 'border-green-500/40 bg-green-500/5' : nearLose ? 'border-red-500/40 bg-red-500/5' : ''}`}>
                  <div className="text-right">
                    <div className="text-white font-bold text-lg">
                      {p.nickname} {p.flagCode && <span className="text-white/40 text-xs uppercase ml-1">{p.flagCode}</span>}
                    </div>
                  </div>
                  <div className="font-mono text-2xl font-black">
                    <span className={nearWin ? 'text-green-400' : 'text-white'}>{p.scoreUser}</span>
                    <span className="text-white/30 mx-1">:</span>
                    <span className={nearLose ? 'text-red-400' : 'text-white/40'}>{p.scoreSystem}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
