'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { detectLocale, getTranslation } from '@/lib/i18n';

const REACTIONS = [
  { code: 'like', emoji: '👍' },
  { code: 'think', emoji: '🤔' },
  { code: 'fire', emoji: '🔥' },
  { code: 'wow', emoji: '😮' },
];

export default function WatchPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const locale = detectLocale();
  const t = getTranslation(locale);

  const [liveState, setLiveState] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [myAnswerSaved, setMyAnswerSaved] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<{ code: string; count: number }[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);

  // After admin's synchronized reveal, briefly show correct answer to spectator
  // — same fairness moment as players. Auto-hides after 7 seconds so it doesn't
  // linger into the next question's reading phase.
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('accessToken'));
    }
    loadUser();
    loadLiveState();
    const interval = setInterval(loadLiveState, 4000);
    return () => clearInterval(interval);
  }, []);

  const ws = useSocket({ tournamentId, token });

  // Tournament-finished overlay: when the admin closes the tournament early,
  // immediately notify spectators instead of leaving them on a stale screen.
  const [showFinishedOverlay, setShowFinishedOverlay] = useState(false);
  useEffect(() => {
    if (ws.tournamentFinished && !showFinishedOverlay) {
      setShowFinishedOverlay(true);
    }
  }, [ws.tournamentFinished, showFinishedOverlay]);

  // Load live state from API
  const loadLiveState = async () => {
    try {
      const data = await api.getSpectatorLiveState(tournamentId);
      setLiveState(data);
    } catch {}
  };

  // Tournament just started — refresh live state immediately so spectator transitions
  // from "waiting" UI to live question without waiting for the next 4-second poll tick.
  useEffect(() => {
    if (ws.tournamentStarted) {
      loadLiveState();
    }
  }, [ws.tournamentStarted]);

  // Synchronized reveal arrives — pull the correct answer out of the payload
  // and show it to the spectator for 7 seconds. Same content moment players
  // see, so spectators stay in sync with the room.
  useEffect(() => {
    if (ws.revealedJudgements?.correctAnswer) {
      setRevealedAnswer(ws.revealedJudgements.correctAnswer);
      const timeout = setTimeout(() => setRevealedAnswer(null), 7000);
      return () => clearTimeout(timeout);
    }
  }, [ws.revealedJudgements]);

  // Reset the reveal banner when the next question starts
  useEffect(() => {
    if (ws.question?.questionId) setRevealedAnswer(null);
  }, [ws.question?.questionId]);

  // Load reactions when question changes
  useEffect(() => {
    if (ws.question && liveState) {
      const tq = findCurrentTQ();
      if (tq && tq !== currentQuestionId) {
        setCurrentQuestionId(tq);
        setMyAnswer('');
        setMyAnswerSaved(false);
        setSelectedReaction(null);
        loadReactions(tq);
      }
    }
  }, [ws.question, liveState]);

  // Update reactions from WebSocket
  useEffect(() => {
    if (ws.reactions) {
      setReactionCounts(ws.reactions.reactions);
    }
  }, [ws.reactions]);

  const findCurrentTQ = (): string | null => {
    if (!liveState?.currentQuestion) return null;
    // We need the question ID — extract from live state
    return liveState.currentQuestion?.questionId || null;
  };

  const loadReactions = async (questionId: string) => {
    try {
      const data = await api.getReactionTypes();
      // Load current reactions for this question
      // The reactions endpoint uses tournamentId + questionId
    } catch {}
  };

  // Get localized question text
  const getQuestionText = () => {
    // From WebSocket
    if (ws.question?.localizations) {
      const loc = ws.question.localizations.find((l: any) => l.language === locale)
        || ws.question.localizations[0];
      return { text: loc?.questionText || '', index: ws.question.orderIndex, category: ws.question.category };
    }
    // From live state
    if (liveState?.currentQuestion?.localizations) {
      const loc = liveState.currentQuestion.localizations.find((l: any) => l.language === locale)
        || liveState.currentQuestion.localizations[0];
      return { text: loc?.questionText || '', index: liveState.currentQuestion.orderIndex, category: liveState.currentQuestion.category };
    }
    return null;
  };

  // Save personal answer (spectator)
  const saveMyAnswer = async () => {
    if (!myAnswer.trim() || !currentQuestionId) return;
    try {
      await api.submitAnswer(tournamentId, currentQuestionId, myAnswer.trim());
      setMyAnswerSaved(true);
    } catch {
      // Might not be a participant — use spectator endpoint
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://30sec.org/api'}/spectator/answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            tournamentId,
            questionId: currentQuestionId,
            answerText: myAnswer.trim(),
          }),
        });
        if (res.ok) setMyAnswerSaved(true);
      } catch {}
    }
  };

  // Send reaction
  const sendReaction = async (code: string) => {
    if (!currentQuestionId || !token) return;
    try {
      await api.setReaction(tournamentId, currentQuestionId, code);
      setSelectedReaction(code);
    } catch {}
  };

  const timerSeconds = ws.timerSeconds;
  const isLocked = ws.isLocked;
  const questionData = getQuestionText();
  const timerColor = timerSeconds <= 5 ? 'text-red-400' : timerSeconds <= 10 ? 'text-accent-400' : 'text-brand-400';

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')}
            className="text-white/40 hover:text-white text-sm transition-colors flex items-center gap-1.5">
            ← {t.common.back}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">{liveState?.title || 'Tournament'}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/30 text-xs">👁 Spectator</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${ws.connected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
            {liveState?.status === 'LIVE' && <span className="badge-live text-[10px]">LIVE</span>}
            {liveState?.status === 'FINISHED' && <span className="badge-finished text-[10px]">END</span>}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* Tournament info bar */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-white/30">
                <span>👥 {liveState?.playersCount || 0} players</span>
                <span>📝 {liveState?.questionsProgress?.used || 0}/{liveState?.questionsProgress?.total || 0} questions</span>
              </div>
              {liveState?.status === 'LIVE' && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 text-xs font-semibold">LIVE</span>
                </div>
              )}
            </div>

            {/* Question card */}
            {questionData ? (
              <div className="card-glow animate-slide-up">
                {/* Timer */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/30 uppercase tracking-wider">{t.game.timeLeft}</span>
                    <span className={`text-2xl font-mono font-black ${timerColor} ${timerSeconds <= 5 ? 'animate-pulse' : ''}`}>
                      {timerSeconds}s
                    </span>
                  </div>
                  <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                      timerSeconds <= 5 ? 'bg-red-500' : timerSeconds <= 10 ? 'bg-accent-500' : 'bg-brand-500'
                    }`} style={{ width: `${(timerSeconds / 30) * 100}%` }} />
                  </div>
                </div>

                {/* Question */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] uppercase text-white/20 tracking-wider">
                      {t.game.question} #{(questionData.index ?? 0) + 1}
                    </span>
                    {questionData.category && <span className="badge-draft text-[10px]">{questionData.category}</span>}
                  </div>
                  <p className="text-xl sm:text-2xl text-white font-semibold leading-relaxed">
                    {questionData.text}
                  </p>
                </div>

                {/* Spectator personal answer */}
                {user && !isLocked && !myAnswerSaved && (
                  <div>
                    <p className="text-[10px] uppercase text-white/20 tracking-wider mb-2">Ваш ответ (для себя)</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={myAnswer}
                        onChange={(e) => setMyAnswer(e.target.value.slice(0, 100))}
                        onKeyDown={(e) => e.key === 'Enter' && saveMyAnswer()}
                        className="input-field flex-1 text-sm py-3"
                        placeholder="Что думаете?"
                        maxLength={100}
                      />
                      <button onClick={saveMyAnswer} disabled={!myAnswer.trim()}
                        className="btn-secondary text-sm px-5 py-2.5">
                        Сохранить
                      </button>
                    </div>
                  </div>
                )}

                {myAnswerSaved && (
                  <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-3 text-center animate-fade-in">
                    <span className="text-brand-400 text-sm">✓ Ваш ответ сохранён: <strong>{myAnswer}</strong></span>
                  </div>
                )}

                {isLocked && !myAnswerSaved && (
                  <div className="bg-white/[0.03] rounded-2xl p-3 text-center">
                    <span className="text-white/30 text-sm">Время вышло</span>
                  </div>
                )}

                {/* Synchronized correct-answer reveal — spectator sees this at the
                    SAME moment players see their pass/fail card. 7 seconds visibility. */}
                {revealedAnswer && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.10] via-emerald-500/[0.04] to-transparent p-4 text-center animate-fade-in">
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/70 mb-1">Правильный ответ</div>
                    <div className="text-lg font-bold text-white">{revealedAnswer}</div>
                    {myAnswerSaved && myAnswer && (
                      <div className="text-[11px] text-white/40 mt-2">
                        Ваш ответ был: <span className="text-white/70">{myAnswer}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : liveState?.status === 'LIVE' ? (
              <div className="card text-center py-16 animate-fade-in">
                <div className="text-5xl mb-4 animate-float">⏳</div>
                <p className="text-white/40 text-lg">Ожидание вопроса...</p>
                <p className="text-white/20 text-sm mt-1">Ведущий скоро запустит следующий вопрос</p>
              </div>
            ) : liveState?.status === 'FINISHED' ? (
              <div className="card text-center py-16 animate-fade-in">
                <div className="text-5xl mb-4">🏁</div>
                <p className="text-white text-xl font-bold">{t.game.matchEnd}</p>
              </div>
            ) : (
              <div className="card text-center py-16">
                <div className="text-5xl mb-4 opacity-30">🏆</div>
                <p className="text-white/30">Турнир ещё не начался</p>
              </div>
            )}

            {/* Reactions */}
            {questionData && user && (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-white/20 text-xs mr-1">Реакция:</span>
                {REACTIONS.map((r) => {
                  const count = reactionCounts.find((rc) => rc.code === r.code)?.count || 0;
                  const isSelected = selectedReaction === r.code;
                  return (
                    <button
                      key={r.code}
                      onClick={() => sendReaction(r.code)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm transition-all duration-300 ${
                        isSelected
                          ? 'bg-brand-500/20 border border-brand-500/30 scale-105'
                          : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:scale-105'
                      }`}
                    >
                      <span className="text-lg">{r.emoji}</span>
                      {count > 0 && <span className="text-white/40 text-xs font-mono">{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column — scoreboard */}
          <div className="space-y-5">
            {/* Scoreboard */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white/50 mb-4 flex items-center gap-2">
                {t.nav.leaderboard}
                {ws.connected && <span className="text-[10px] text-green-400/60">● live</span>}
              </h3>

              {liveState?.participants?.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-4">Нет участников</p>
              ) : (
                <div className="space-y-1.5">
                  {liveState?.participants
                    ?.sort((a: any, b: any) => b.scoreUser - a.scoreUser)
                    .map((p: any, idx: number) => {
                      const wsScore = ws.scores.get(p.odUserId);
                      const scoreUser = wsScore?.scoreUser ?? p.scoreUser;
                      const scoreSystem = wsScore?.scoreSystem ?? p.scoreSystem;
                      const status = wsScore?.matchStatus ?? p.matchStatus;
                      // Has this player answered the current live question?
                      // (Spectator avatar fills in synchronously without leaking the answer text.)
                      const isAnswering = ws.phase === 'answering' || ws.phase === 'reading';
                      const hasAnswered = isAnswering && p.userId && ws.answeredUserIds.has(p.userId);
                      const isWaitingForAnswer = isAnswering && !hasAnswered && !['WON','LOST','FINISHED'].includes(status);

                      return (
                        <div key={idx}
                          className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${
                            status === 'WON' ? 'bg-green-500/5' : ''
                          }`}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-white/20 text-xs font-mono w-5">{idx + 1}</span>
                            <div className={`relative w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors ${
                              hasAnswered ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40'
                              : isWaitingForAnswer ? 'bg-white/[0.04] text-white/30'
                              : 'bg-white/[0.04] text-white/30'
                            }`}>
                              {p.nickname?.[0]?.toUpperCase() || '?'}
                              {hasAnswered && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-500 rounded-full ring-2 ring-dark-900" />
                              )}
                            </div>
                            <div>
                              <span className="text-white text-sm font-medium">{p.nickname}</span>
                              {p.flagCode && (
                                <span className="text-white/20 text-[10px] ml-1.5">{p.flagCode.toUpperCase()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-sm font-bold">
                            <span className="text-brand-400">{scoreUser}</span>
                            <span className="text-white/15">:</span>
                            <span className="text-red-400">{scoreSystem}</span>
                            {status === 'WON' && <span className="ml-1">🏆</span>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Tournament info */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white/50 mb-3">Информация</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/30">Тип</span>
                  <span className="text-white/60">{liveState?.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30">Игроки</span>
                  <span className="text-white/60">{liveState?.playersCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30">Вопросы</span>
                  <span className="text-white/60">{liveState?.questionsProgress?.used || 0} / {liveState?.questionsProgress?.total || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30">Статус</span>
                  <span className={liveState?.status === 'LIVE' ? 'text-red-400 font-semibold' : 'text-white/60'}>
                    {liveState?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* How to play hint */}
            {!user && (
              <div className="card bg-brand-500/5 border-brand-500/10">
                <p className="text-brand-400/80 text-sm">
                  Войдите, чтобы сохранять свои ответы и ставить реакции
                </p>
                <button onClick={() => router.push('/auth/login')}
                  className="btn-primary text-xs px-4 py-2 mt-3 w-full text-center">
                  Войти →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Tournament-ended overlay (when admin closes the tournament early). */}
      {showFinishedOverlay && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-dark-800 border border-white/10 rounded-3xl max-w-md w-full p-8 text-center animate-slide-up">
            <div className="text-6xl mb-4">🏁</div>
            <h2 className="text-2xl font-black text-white mb-2">Турнир завершён</h2>
            <p className="text-white/50 text-sm mb-6">
              Спасибо что были с нами!
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowFinishedOverlay(false)}
                className="btn-primary w-full"
              >
                Посмотреть итоги
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
