'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { detectLocale, getTranslation } from '@/lib/i18n';

export default function GamePage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const router = useRouter();
  const { user, loadUser } = useAuth();
  const locale = detectLocale();
  const t = getTranslation(locale);

  const [tournament, setTournament] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [myJudgement, setMyJudgement] = useState<any>(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('accessToken'));
    }
    loadUser();
  }, []);

  const ws = useSocket({ tournamentId, token });

  useEffect(() => { loadTournament(); }, []);

  useEffect(() => {
    if (ws.scores.size > 0) loadTournament();
  }, [ws.scores]);

  useEffect(() => {
    if (ws.lastJudgement && user && ws.lastJudgement.userId === user.id) {
      setMyJudgement(ws.lastJudgement);
      setParticipant((prev: any) => prev ? {
        ...prev,
        currentScoreUser: ws.lastJudgement.scoreUser,
        currentScoreSystem: ws.lastJudgement.scoreSystem,
        matchStatus: ws.lastJudgement.matchStatus,
      } : prev);
    }
  }, [ws.lastJudgement, user]);

  useEffect(() => {
    if (ws.question) {
      setAnswer('');
      setSubmitted(false);
      setMyJudgement(null);
      setError('');
    }
  }, [ws.question]);

  const loadTournament = async () => {
    try {
      const data = await api.getTournament(tournamentId);
      setTournament(data);
      if (user) {
        const myPart = data.participants?.find((p: any) => p.userId === user.id);
        setParticipant(myPart || null);
      }
    } catch {}
  };

  const getQuestionText = () => {
    if (ws.question?.localizations) {
      const loc = ws.question.localizations.find((l: any) => l.language === locale)
        || ws.question.localizations[0];
      return { text: loc?.questionText || '', index: ws.question.orderIndex };
    }
    if (tournament?.tournamentQuestions) {
      const unused = tournament.tournamentQuestions.find((tq: any) => !tq.isUsed);
      if (unused?.question?.localizations) {
        const loc = unused.question.localizations.find((l: any) => l.language === locale)
          || unused.question.localizations[0];
        return { text: loc?.questionText || '', index: unused.orderIndex };
      }
    }
    return null;
  };

  const handleJoin = async () => {
    try {
      await api.joinTournament(tournamentId);
      await loadTournament();
    } catch (err: any) { setError(err.message); }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    const qd = getQuestionText();
    if (!qd) return;
    const tq = tournament?.tournamentQuestions?.find((q: any) => q.orderIndex === qd.index);
    if (!tq) return;
    try {
      await api.submitAnswer(tournamentId, tq.questionId, answer.trim());
      setSubmitted(true);
    } catch (err: any) { setError(err.message); }
  };

  useEffect(() => {
    if (ws.timerSeconds === 0 && !submitted && answer.trim()) handleSubmit();
  }, [ws.timerSeconds]);

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40 animate-pulse text-xl">{t.common.loading}</div>
      </div>
    );
  }

  const isLive = tournament.status === 'LIVE';
  const isFinished = tournament.status === 'FINISHED' || ws.tournamentFinished;
  const isJoined = !!participant;
  const matchOver = participant && ['WON', 'LOST', 'FINISHED'].includes(participant.matchStatus);
  const questionData = getQuestionText();
  const hasQuestion = !!questionData || !!ws.question;
  const timerSeconds = ws.timerSeconds;
  const isLocked = ws.isLocked;
  const timerColor = timerSeconds <= 5 ? 'text-red-400' : timerSeconds <= 10 ? 'text-accent-400' : 'text-brand-400';
  const timerPulse = timerSeconds <= 5 ? 'animate-pulse' : '';

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/5 bg-dark-800/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')}
            className="text-white/40 hover:text-white text-sm transition-colors">
            ← {t.common.back}
          </button>
          <h2 className="text-white font-semibold">{tournament.title}</h2>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${ws.connected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`}
              title={ws.connected ? 'Live' : 'Reconnecting...'} />
            {isLive && !isFinished && <span className="badge-live">● LIVE</span>}
            {isFinished && <span className="badge-finished">{t.tournament.finished}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {isJoined && (
          <div className="card-glow mb-8">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-xs uppercase text-white/40 mb-1">{t.game.you}</div>
                <div className="score-player">{participant.currentScoreUser}</div>
              </div>
              <div className="text-white/20 text-4xl font-light">:</div>
              <div className="text-center">
                <div className="text-xs uppercase text-white/40 mb-1">{t.game.system}</div>
                <div className="score-system">{participant.currentScoreSystem}</div>
              </div>
            </div>
            {matchOver && (
              <div className="mt-6 text-center animate-slide-up">
                <div className={`text-3xl font-bold mb-2 ${
                  participant.matchStatus === 'WON' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {participant.matchStatus === 'WON' ? t.game.won : t.game.lost}
                </div>
                <button onClick={() => router.push('/dashboard')} className="btn-secondary mt-4">{t.common.back}</button>
              </div>
            )}
          </div>
        )}

        {isLive && !isJoined && !isFinished && (
          <div className="card text-center mb-8 animate-fade-in">
            <p className="text-white/60 mb-4">Турнир идёт!</p>
            <button onClick={handleJoin} className="btn-primary px-10">{t.tournament.join}</button>
          </div>
        )}

        {isLive && isJoined && !matchOver && hasQuestion && (
          <div className="card-glow mb-8 animate-slide-up">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/40">{t.game.timeLeft}</span>
                <span className={`text-3xl font-mono font-bold ${timerColor} ${timerPulse}`}>{timerSeconds}s</span>
              </div>
              <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  timerSeconds <= 5 ? 'bg-red-500' : timerSeconds <= 10 ? 'bg-accent-500' : 'bg-brand-500'
                }`} style={{ width: `${(timerSeconds / 30) * 100}%` }} />
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs uppercase text-white/30">{t.game.question} #{(questionData?.index ?? 0) + 1}</span>
              </div>
              <p className="text-2xl text-white font-medium leading-relaxed">{questionData?.text || ''}</p>
            </div>

            {myJudgement && (
              <div className={`rounded-xl p-5 mb-4 text-center animate-slide-up ${
                myJudgement.decision === 'ACCEPTED' ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className={`text-2xl font-bold mb-1 ${myJudgement.decision === 'ACCEPTED' ? 'text-green-400' : 'text-red-400'}`}>
                  {myJudgement.decision === 'ACCEPTED' ? '✓ ' + t.game.correct : '✗ ' + t.game.wrong}
                </div>
                <div className="text-white/50 text-sm">
                  Ответ: <span className="text-white font-semibold">{myJudgement.correctAnswer}</span>
                </div>
              </div>
            )}

            {!submitted && !isLocked && !myJudgement ? (
              <div className="flex gap-3">
                <input type="text" value={answer} onChange={(e) => setAnswer(e.target.value.slice(0, 50))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className="input-field flex-1 text-lg" placeholder={t.game.answer} maxLength={50} autoFocus />
                <button onClick={handleSubmit} disabled={!answer.trim()} className="btn-accent px-8 text-lg">{t.game.submit}</button>
              </div>
            ) : !myJudgement ? (
              <div className="bg-dark-700 rounded-xl p-5 text-center animate-fade-in">
                <p className="text-white/50 text-sm mb-1">Ваш ответ:</p>
                <p className="text-white text-2xl font-semibold">{answer}</p>
                <p className="text-white/30 text-sm mt-3 animate-pulse">{t.game.waiting}</p>
              </div>
            ) : null}

            {isLocked && !submitted && !myJudgement && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center animate-shake">
                <p className="text-red-400 font-bold text-lg">Время вышло!</p>
              </div>
            )}
          </div>
        )}

        {isLive && isJoined && !matchOver && !hasQuestion && !isFinished && (
          <div className="card text-center py-12 animate-fade-in">
            <div className="text-5xl mb-4 animate-pulse-slow">⏳</div>
            <p className="text-white/50 text-lg">Ожидание вопроса...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
            {error}
            <button onClick={() => setError('')} className="ml-3 text-red-300 hover:text-white">✕</button>
          </div>
        )}

        <section className="mt-8">
          <h3 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
            {t.nav.leaderboard}
            {ws.connected && <span className="text-xs text-green-400/60 font-normal">● live</span>}
          </h3>
          <div className="card">
            {tournament.participants?.length === 0 ? (
              <p className="text-white/30 text-center py-4">Нет участников</p>
            ) : (
              <div className="space-y-1">
                {tournament.participants
                  ?.sort((a: any, b: any) => b.currentScoreUser - a.currentScoreUser)
                  .map((p: any, idx: number) => {
                    const wsScore = ws.scores.get(p.userId);
                    const scoreUser = wsScore?.scoreUser ?? p.currentScoreUser;
                    const scoreSystem = wsScore?.scoreSystem ?? p.currentScoreSystem;
                    const status = wsScore?.matchStatus ?? p.matchStatus;
                    const isMe = user && p.userId === user.id;
                    return (
                      <div key={p.id} className={`flex items-center justify-between py-3 px-3 rounded-lg ${isMe ? 'bg-brand-600/10' : ''}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-white/30 text-sm w-6 font-mono">{idx + 1}</span>
                          <span className={`font-medium ${isMe ? 'text-brand-400' : 'text-white'}`}>
                            {p.user?.profile?.nickname || 'unknown'}
                          </span>
                          {status === 'WON' && <span className="text-green-400">🏆</span>}
                        </div>
                        <div className="flex items-center gap-2 font-mono font-bold">
                          <span className="text-brand-400 text-lg">{scoreUser}</span>
                          <span className="text-white/20">:</span>
                          <span className="text-red-400 text-lg">{scoreSystem}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
