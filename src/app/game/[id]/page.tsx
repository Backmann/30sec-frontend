'use client';
import ImageLightbox from '@/components/ImageLightbox';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { detectLocale, getTranslation } from '@/lib/i18n';

function WaitingCountdown({ target }: { target: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (diff === 0) {
    return <div className="text-2xl font-mono text-green-400 font-bold">Уже началось!</div>;
  }
  return (
    <div className="text-3xl font-mono font-bold text-brand-400">
      {d > 0 && <span>{d}д </span>}
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const locale = detectLocale();
  const t = getTranslation(locale);

  const [tournament, setTournament] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [myJudgement, setMyJudgement] = useState<any>(null);
  const [answerImagesForReveal, setAnswerImagesForReveal] = useState<any[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [lightboxStart, setLightboxStart] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [restoredQId, setRestoredQId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') setToken(localStorage.getItem('accessToken'));
    loadUser();
  }, []);

  const ws = useSocket({ tournamentId, token });

  // Tournament-finished overlay: when admin ends tournament early (or it ends naturally),
  // immediately show a full-screen "Tournament finished" notice instead of leaving
  // the player frozen on the last question / waiting screen.
  const [showFinishedOverlay, setShowFinishedOverlay] = useState(false);
  useEffect(() => {
    if (ws.tournamentFinished && !showFinishedOverlay) {
      setShowFinishedOverlay(true);
    }
  }, [ws.tournamentFinished, showFinishedOverlay]);

  // Tournament just started — push the local tournament state from SCHEDULED → LIVE
  // and restore the live game state so the player sees the first question
  // without having to refresh the page manually.
  useEffect(() => {
    if (ws.tournamentStarted && tournament && tournament.status !== 'LIVE') {
      loadTournament();
      // re-run state restore so we pick up the current question if one is already running
      setStateLoaded(false);
    }
  }, [ws.tournamentStarted]);

  // Load tournament + restore game state on mount
  useEffect(() => { loadTournament(); }, []);
  useEffect(() => {
    if (user && tournament && !stateLoaded) {
      restoreGameState();
      setStateLoaded(true);
    }
  }, [user, tournament]);

  useEffect(() => { if (ws.scores.size > 0) loadTournament(); }, [ws.scores]);

  // Handle synchronized judgement reveal.
  // After server flushes all results, find ours in the revealed batch.
  // (Previously this used ws.lastJudgement, which now arrives only in admin
  // rooms — players see their result only at the synchronized reveal moment.)
  useEffect(() => {
    if (ws.revealedJudgements && user) {
      const mine = ws.revealedJudgements.judgements.find((j: any) => j.userId === user.id);
      if (mine) {
        // Project the correctAnswer from payload (it lives at the top level there)
        const j = { ...mine, correctAnswer: mine.correctAnswer || ws.revealedJudgements.correctAnswer };
        setMyJudgement(j);
        setParticipant((prev: any) => prev ? {
          ...prev, currentScoreUser: j.scoreUser,
          currentScoreSystem: j.scoreSystem,
          matchStatus: j.matchStatus,
        } : prev);
        // Fetch full game state to get answer images (revealed after judgement)
        api.getGameState(tournamentId).then((gs: any) => {
          if (gs?.currentQuestion?.answerImages) {
            setAnswerImagesForReveal(gs.currentQuestion.answerImages);
          }
        }).catch(() => {});
      }
    }
  }, [ws.revealedJudgements, user, tournamentId]);

  // Reset answer images on new question
  useEffect(() => {
    setAnswerImagesForReveal([]);
  }, [ws.question?.questionId]);

  // New question from WS: reset only if it's truly a NEW question (not restored)
  useEffect(() => {
    if (ws.question) {
      if (restoredQId && ws.question.questionId === restoredQId) {
        // This is restored question, don't reset
        setRestoredQId(null);
        return;
      }
      setAnswer(''); setSubmitted(false); setMyJudgement(null); setShowTimer(false);
    }
  }, [ws.question]);

  // Show timer when phase changes to answering
  useEffect(() => {
    if (ws.phase === 'answering') setShowTimer(true);
  }, [ws.phase]);

  // When locked and not submitted = auto-reject (backend handles)
  useEffect(() => {
    if (ws.isLocked && !submitted) setSubmitted(true);
  }, [ws.isLocked]);

  const loadTournament = async () => {
    try {
      const data = await api.getTournament(tournamentId);
      setTournament(data);
      setLoadError(null);
      if (user) {
        const myP = data.participants?.find((p: any) => p.userId === user.id);
        setParticipant(myP || null);
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Не удалось загрузить турнир');
    }
  };

  // Restore state after page refresh
  const restoreGameState = async () => {
    try {
      const gs = await api.getGameState(tournamentId);
      if (!gs || gs.status === 'NOT_FOUND') return;

      // Mark current question as restored so WS won't reset it
      if (gs.currentQuestion?.questionId) {
        setRestoredQId(gs.currentQuestion.questionId);
        setAnswerImagesForReveal(gs.currentQuestion.answerImages || []);
      }

      // Restore participant
      if (gs.myParticipant) {
        setParticipant((prev: any) => prev ? {
          ...prev,
          currentScoreUser: gs.myParticipant.scoreUser,
          currentScoreSystem: gs.myParticipant.scoreSystem,
          matchStatus: gs.myParticipant.matchStatus,
        } : prev);
      }

      // Restore answer state
      if (gs.myAnswer) {
        setAnswer(gs.myAnswer.answerText || '');
        setSubmitted(true);
        if (gs.myAnswer.judgement) {
          setMyJudgement({
            decision: gs.myAnswer.judgement.decision,
            correctAnswer: gs.currentQuestion?.localizations?.find((l: any) => l.language === locale)?.correctAnswer
              || gs.currentQuestion?.localizations?.[0]?.correctAnswer || '',
            userId: user?.id,
            scoreUser: gs.myParticipant?.scoreUser || 0,
            scoreSystem: gs.myParticipant?.scoreSystem || 0,
          });
        }
      }

      // Restore timer phase
      if (gs.phase === 'answering') {
        setShowTimer(true);
      }
    } catch (e) {
      console.error('Restore state error:', e);
    }
  };

  const handleJoin = async () => {
    try { await api.joinTournament(tournamentId); loadTournament(); } catch {}
  };

  const handleSubmit = async () => {
    if (submitted) return;
    const text = answer.trim();
    if (!text) return;
    setSubmitted(true);
    try {
      const qid = ws.question?.questionId;
      if (qid) await api.submitAnswer(tournamentId, qid, text);
    } catch (e) { console.error('Submit error:', e); }
  };

  const getQuestionText = () => {
    if (!ws.question?.localizations) return null;
    const loc = ws.question.localizations.find((l: any) => l.language === locale) || ws.question.localizations[0];
    return { text: loc?.questionText || '', index: ws.question.orderIndex };
  };

  if (loadError) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">🏁</div>
      <div className="text-xl text-white font-semibold mb-2">Турнир недоступен</div>
      <div className="text-white/50 text-sm mb-6 max-w-md">Возможно, турнир уже завершён или был удалён.</div>
      <div className="flex gap-3">
        <button onClick={() => router.push('/dashboard')} className="btn-primary">На главную</button>
        <button onClick={() => { setLoadError(null); loadTournament(); }} className="btn-ghost">Обновить</button>
      </div>
    </div>
  );
  if (!tournament) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const isLive = tournament.status === 'LIVE';
  const isWaiting = tournament.status === 'DRAFT' || tournament.status === 'SCHEDULED';
  const isFinished = tournament.status === 'FINISHED';
  const isJoined = !!participant;
  const isPlaying = participant && ['PLAYING','APPROVED'].includes(participant.matchStatus);
  const matchOver = participant && ['WON','LOST','FINISHED'].includes(participant.matchStatus);
  const myScore = tournament?.participants?.find((p: any) => p.userId === user?.id);
  const myWsScore = myScore ? ws.scores.get(myScore.userId) : null;
  const mySu = myWsScore?.scoreUser ?? myScore?.currentScoreUser ?? 0;
  const mySs = myWsScore?.scoreSystem ?? myScore?.currentScoreSystem ?? 0;
  const isDecisive = mySu === 11 && mySs === 11;
  const questionData = getQuestionText();
  const hasQuestion = !!questionData;
  const timerSeconds = ws.timerSeconds;
  const timerColor = timerSeconds <= 5 ? 'text-red-400' : timerSeconds <= 10 ? 'text-accent-400' : 'text-brand-400';

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="text-white/40 hover:text-white text-sm">{t.common.back}</button>
          <h2 className="text-white font-semibold">{tournament.title}</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${ws.connected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
            {isLive && <span className="badge-live">LIVE</span>}
            {isFinished && <span className="badge-finished">END</span>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Score */}
        {isJoined && (
          <div className="card-glow mb-6">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center"><div className="text-xs uppercase text-white/40 mb-1">{t.game.you}</div><div className="score-player">{participant.currentScoreUser}</div></div>
              <div className="text-white/20 text-4xl font-light">:</div>
              <div className="text-center"><div className="text-xs uppercase text-white/40 mb-1">{t.game.system}</div><div className="score-system">{participant.currentScoreSystem}</div></div>
            </div>
          </div>
        )}

        {/* Match over */}
        {matchOver && (
          <div className="card-glow text-center py-12 mb-6 animate-slide-up">
            <div className="text-6xl mb-4">{participant.matchStatus === 'WON' ? '🏆' : '😔'}</div>
            <div className={`text-4xl font-black mb-2 ${participant.matchStatus === 'WON' ? 'text-green-400' : 'text-red-400'}`}>
              {participant.matchStatus === 'WON' ? t.game.won : t.game.lost}
            </div>
            <div className="text-white/40 text-lg mb-1">{participant.currentScoreUser} : {participant.currentScoreSystem}</div>
            <button onClick={() => router.push('/dashboard')} className="btn-primary px-10 mt-6">{t.common.back}</button>
          </div>
        )}

        {/* Waiting for first question */}
        {isWaiting && isJoined && (
          <div className="card-glow mb-6 text-center py-10 animate-slide-up">
            <div className="text-5xl mb-3">⏳</div>
            <div className="text-2xl font-black text-white mb-2">Зал ожидания</div>
            <div className="text-white/60 text-sm mb-6 max-w-md mx-auto">
              Уже можно подключаться — админ запустит турнир, когда все игроки будут готовы
            </div>
            <div className="text-white/30 text-xs uppercase tracking-wider mb-2">Запланированное начало</div>
            {tournament.startAt && <WaitingCountdown target={tournament.startAt} />}
            <div className="mt-8 pt-6 border-t border-white/[0.05]">
              <div className="text-white/40 text-xs uppercase tracking-wider mb-3">Подключённые игроки</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {tournament.participants?.filter((p: any) => ['APPROVED','PLAYING'].includes(p.matchStatus)).map((p: any) => (
                  <div key={p.id} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80">
                    {p.user?.profile?.nickname || '?'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isWaiting && !isJoined && (
          <div className="card mb-6 text-center py-10 animate-slide-up">
            <div className="text-4xl mb-3">🚫</div>
            <div className="text-xl font-bold text-white mb-2">Вы не зарегистрированы</div>
            <div className="text-white/50 text-sm mb-4">Подайте заявку на главной странице</div>
            <button onClick={() => router.push('/dashboard')} className="btn-secondary text-sm">На главную</button>
          </div>
        )}

        {isLive && isPlaying && !matchOver && !hasQuestion && (
          <div className="card-glow text-center py-12 mb-6 animate-fade-in">
            <div className="text-5xl mb-6 animate-float">🎯</div>
            <h3 className="text-2xl font-bold text-white mb-4">Prepare!</h3>
            <div className="max-w-md mx-auto text-left space-y-3 text-white/50 text-sm">
              <div className="flex gap-3 items-start"><span className="text-brand-400 font-bold shrink-0">1.</span><span>Check your keyboard layout</span></div>
              <div className="flex gap-3 items-start"><span className="text-brand-400 font-bold shrink-0">2.</span><span>Read the question carefully</span></div>
              <div className="flex gap-3 items-start"><span className="text-brand-400 font-bold shrink-0">3.</span><span>Type your answer and press the button</span></div>
              <div className="flex gap-3 items-start"><span className="text-brand-400 font-bold shrink-0">4.</span><span>Timer starts after 15 seconds</span></div>
              <div className="flex gap-3 items-start"><span className="text-brand-400 font-bold shrink-0">5.</span><span>No answer = incorrect</span></div>
            </div>
            <p className="text-white/20 text-xs mt-8">Waiting for the host...</p>
            <div className="flex justify-center mt-4"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          </div>
        )}

        {/* Not joined */}
        {isLive && !isJoined && !isFinished && (
          <div className="card text-center mb-6"><p className="text-white/60 mb-4">{t.tournament.live}</p><button onClick={handleJoin} className="btn-primary px-10">{t.tournament.join}</button></div>
        )}

        {/* Decisive question banner — only when player is tied at 11:11 */}
        {isLive && isPlaying && !matchOver && hasQuestion && !myJudgement && isDecisive && (
          <div className="card mb-4 bg-gradient-to-r from-red-500/20 via-amber-500/20 to-red-500/20 border-red-500/40 text-center py-3 animate-pulse">
            <div className="text-xl sm:text-2xl font-black text-red-400">⚡ РЕШАЮЩИЙ ВОПРОС</div>
            <div className="text-xs text-white/60 mt-1">Всё решится сейчас</div>
          </div>
        )}

        {/* Question: input + button visible immediately */}
        {isLive && isPlaying && !matchOver && hasQuestion && !myJudgement && (
          <div className="card-glow mb-6 animate-slide-up">
            {showTimer && !submitted && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/40">{t.game.timeLeft}</span>
                  <span className={`text-3xl font-mono font-bold ${timerColor} ${timerSeconds <= 5 ? 'animate-pulse' : ''}`}>{timerSeconds}s</span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerSeconds <= 5 ? 'bg-red-500' : timerSeconds <= 10 ? 'bg-accent-500' : 'bg-brand-500'}`} style={{ width: `${(timerSeconds / 30) * 100}%` }} />
                </div>
              </div>
            )}
            <div className="mb-6">
              <span className="text-xs uppercase text-white/30">{t.game.question} #{(questionData?.index ?? 0) + 1}</span>
              <p className="text-xl sm:text-2xl text-white font-bold mt-2 leading-relaxed">{questionData?.text}</p>
              {ws.question?.questionImages && ws.question.questionImages.length > 0 && (
                <div className={`grid gap-2 mt-4 ${ws.question.questionImages.length === 1 ? 'grid-cols-1' : ws.question.questionImages.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {ws.question.questionImages.map((img: any, i: number) => (
                    <img key={img.id || i} src={img.url} alt="" onClick={() => { setLightboxStart(i); setLightboxOpen(true); }} className="w-full aspect-square object-cover rounded-xl border border-white/10 cursor-pointer hover:border-brand-400/60 transition" />
                  ))}
                </div>
              )}
            </div>
            {!submitted ? (
              <div>
                <input type="text" value={answer} onChange={e => setAnswer(e.target.value.slice(0, 50))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="input-field text-lg text-center font-semibold py-4" placeholder={t.game.answer} maxLength={50} autoFocus />
                <button onClick={handleSubmit} disabled={!answer.trim()} className="btn-primary w-full mt-3 text-center text-lg py-4">{t.game.submit}</button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl mb-3">✓</div>
                <p className="text-white/50 text-sm mb-1">Твой ответ принят</p>
                <p className="text-white text-2xl font-bold mb-4">{answer.trim() || '(нет ответа)'}</p>
                <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                  <span className="text-white/60 text-sm">Ждём остальных и раскрытия...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Judgement result — premium reveal */}
        {isLive && isPlaying && !matchOver && myJudgement && (
          <div
            className={`relative overflow-hidden mb-6 text-center py-12 animate-slide-up rounded-3xl border ${
              myJudgement.decision === 'ACCEPTED'
                ? 'bg-gradient-to-br from-green-500/[0.08] via-emerald-500/[0.04] to-transparent border-green-500/20'
                : 'bg-gradient-to-br from-amber-500/[0.04] via-rose-500/[0.03] to-transparent border-white/[0.08]'
            }`}
          >
            {/* Decorative accent ring */}
            <div
              className={`absolute -inset-px rounded-3xl pointer-events-none ${
                myJudgement.decision === 'ACCEPTED'
                  ? 'shadow-[0_0_60px_-15px_rgba(34,197,94,0.4)_inset]'
                  : ''
              }`}
            />
            {questionData && <p className="relative text-white/30 text-xs mb-4">{t.game.question} #{(questionData.index ?? 0) + 1}</p>}

            {myJudgement.decision === 'ACCEPTED' ? (
              <div className="relative">
                <div className="text-7xl mb-4 animate-bounce-once">🎯</div>
                <div className="text-3xl font-black mb-1 bg-gradient-to-r from-green-300 via-emerald-400 to-green-300 bg-clip-text text-transparent">
                  {t.game.correct}
                </div>
                <div className="text-green-400/60 text-xs uppercase tracking-[0.2em] font-semibold">
                  ★ верный ответ ★
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="text-5xl mb-4 opacity-80">💡</div>
                <div className="text-2xl font-bold mb-1 text-white/90">
                  Не в этот раз
                </div>
                <div className="text-white/40 text-xs">
                  Следующий вопрос — твой шанс
                </div>
              </div>
            )}

            <div className="relative mt-6 space-y-2">
              <div className="text-white/40 text-sm">
                Ваш ответ: <span className="text-white font-semibold">{answer.trim() || '(нет ответа)'}</span>
              </div>
              {myJudgement.correctAnswer && (
                <div className="text-white/40 text-sm">
                  Правильный ответ: <span className={myJudgement.decision === 'ACCEPTED' ? 'text-green-300 font-semibold' : 'text-amber-300 font-semibold'}>{myJudgement.correctAnswer}</span>
                </div>
              )}
              {answerImagesForReveal.length > 0 && (
                <div className={`grid gap-2 mt-4 ${answerImagesForReveal.length === 1 ? 'grid-cols-1' : answerImagesForReveal.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {answerImagesForReveal.map((img: any, i: number) => (
                    <div key={img.id || i} className="space-y-1">
                      <img src={img.url} alt="" className="w-full aspect-video object-cover rounded-xl border border-white/10" />
                      {img.caption && <div className="text-white/60 text-xs">{img.caption}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative mt-6 text-white/20 text-xs">
              <div className="flex justify-center mt-3"><div className="w-5 h-5 border-2 border-white/20 border-t-transparent rounded-full animate-spin" /></div>
              <p className="mt-2">Следующий вопрос...</p>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {tournament.participants && tournament.participants.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/50">{t.nav.leaderboard}</h3>
              <div className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
                <span className="text-white/50">игрок</span>
                <span className="text-white/20 mx-1">:</span>
                <span className="text-brand-400 font-semibold">30sec.</span>
              </div>
            </div>
            <div className="space-y-1">
              {tournament.participants.filter((p: any) => ['PLAYING','WON','LOST','FINISHED','APPROVED'].includes(p.matchStatus)).sort((a: any, b: any) => b.currentScoreUser - a.currentScoreUser).map((p: any, idx: number) => {
                const wsS = ws.scores.get(p.userId);
                const su = wsS?.scoreUser ?? p.currentScoreUser;
                const ss = wsS?.scoreSystem ?? p.currentScoreSystem;
                const isMe = user && p.userId === user.id;
                return (
                  <div key={idx} className={`flex items-center justify-between py-2 px-3 rounded-xl ${isMe ? 'bg-brand-500/5' : ''}`}>
                    <div className="flex items-center gap-2"><span className="text-white/20 text-xs font-mono w-5">{idx+1}</span><span className={`text-sm font-medium ${isMe ? 'text-brand-400' : 'text-white'}`}>{p.user?.profile?.nickname}</span></div>
                    <div className="font-mono text-sm font-bold"><span className="text-brand-400">{su}</span><span className="text-white/15 mx-1">:</span><span className="text-red-400">{ss}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      {lightboxOpen && ws.question?.questionImages && (
        <ImageLightbox images={ws.question.questionImages} startIndex={lightboxStart} onClose={() => setLightboxOpen(false)} />
      )}

      {/* Tournament-ended overlay (admin closed the tournament early or it ended). */}
      {showFinishedOverlay && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-dark-800 border border-white/10 rounded-3xl max-w-md w-full p-8 text-center animate-slide-up">
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-2xl font-black text-white mb-2">Турнир завершён</h2>
            <p className="text-white/50 text-sm mb-6">
              Ведущий завершил турнир. Спасибо за игру!
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push(`/watch/${tournamentId}`)}
                className="btn-primary w-full"
              >
                Посмотреть результаты
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-ghost w-full"
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
