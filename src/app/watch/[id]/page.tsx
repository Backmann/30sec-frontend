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

function pluralRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

/** Share menu — TG / WhatsApp / X / Copy link. Native API on mobile when available. */
function ShareButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Смотрю интеллектуальный турнир «${title}» на 30sec.org`;

  const native = () => {
    if (navigator.share) {
      navigator.share({ title, text: shareText, url }).catch(() => {});
    } else {
      setOpen(o => !o);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
    } catch {}
  };

  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="relative">
      <button
        onClick={native}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition text-xs text-white/70 hover:text-white"
        aria-label="Поделиться"
      >
        <span>↗</span>
        <span>Поделиться</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-dark-800 border border-white/10 rounded-2xl shadow-xl p-1.5 min-w-[180px] animate-fade-in">
            <a href={tgUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/80 hover:bg-white/5">
              <span className="text-base">✈️</span> Telegram
            </a>
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/80 hover:bg-white/5">
              <span className="text-base">💬</span> WhatsApp
            </a>
            <a href={xUrl} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/80 hover:bg-white/5">
              <span className="text-base">𝕏</span> X / Twitter
            </a>
            <div className="h-px bg-white/[0.06] my-1" />
            <button onClick={copy}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/80 hover:bg-white/5">
              <span className="text-base">{copied ? '✓' : '🔗'}</span>
              {copied ? 'Скопировано!' : 'Скопировать ссылку'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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

            {/* Tournament info bar — premium row with social proof + share */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-white/40">
                  <span className="text-base">👥</span>
                  <span><span className="text-white/70 font-semibold">{liveState?.playersCount || 0}</span> игроков</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-white/40">
                  <span className="text-base">📝</span>
                  <span><span className="text-white/70 font-semibold">{liveState?.questionsProgress?.used || 0}</span>/{liveState?.questionsProgress?.total || 0}</span>
                </span>
                {liveState?.spectatorCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-white/40">
                    <span className="text-base">👁</span>
                    <span><span className="text-emerald-400 font-semibold">{liveState.spectatorCount}</span> {pluralRu(liveState.spectatorCount, ['зритель','зрителя','зрителей'])}</span>
                  </span>
                )}
              </div>
              <ShareButton title={liveState?.title || 'Турнир 30sec'} />
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

                      return (
                        <div key={idx}
                          className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors ${
                            status === 'WON' ? 'bg-green-500/5' : ''
                          }`}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-white/20 text-xs font-mono w-5">{idx + 1}</span>
                            <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[10px] text-white/30 font-bold">
                              {p.nickname?.[0]?.toUpperCase() || '?'}
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

            {/* CTA for unauthenticated viewers — convert spectator → player */}
            {!user && (
              <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-500/[0.12] via-brand-500/[0.06] to-transparent p-5">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative">
                  <div className="text-2xl mb-2">🎯</div>
                  <h4 className="text-white font-bold text-base mb-1">Сыграй сам в следующем</h4>
                  <p className="text-white/50 text-xs leading-relaxed mb-4">
                    Регистрация бесплатная. Подавай заявку на турнир, получай очки рейтинга и ставь реакции на вопросы.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => router.push('/auth/register')}
                      className="btn-primary text-sm px-4 py-2 flex-1">
                      Создать аккаунт
                    </button>
                    <button onClick={() => router.push('/auth/login')}
                      className="btn-ghost text-sm px-4 py-2">
                      Войти
                    </button>
                  </div>
                </div>
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
