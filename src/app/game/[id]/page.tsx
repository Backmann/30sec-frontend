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
  const [showTimer, setShowTimer] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [restoredQId, setRestoredQId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') setToken(localStorage.getItem('accessToken'));
    loadUser();
  }, []);

  const ws = useSocket({ tournamentId, token });

  // Load tournament + restore game state on mount
  useEffect(() => { loadTournament(); }, []);
  useEffect(() => {
    if (user && tournament && !stateLoaded) {
      restoreGameState();
      setStateLoaded(true);
    }
  }, [user, tournament]);

  useEffect(() => { if (ws.scores.size > 0) loadTournament(); }, [ws.scores]);

  // Handle judgement
  useEffect(() => {
    if (ws.lastJudgement && user && ws.lastJudgement.userId === user.id) {
      setMyJudgement(ws.lastJudgement);
      setParticipant((prev: any) => prev ? {
        ...prev, currentScoreUser: ws.lastJudgement.scoreUser,
        currentScoreSystem: ws.lastJudgement.scoreSystem,
        matchStatus: ws.lastJudgement.matchStatus,
      } : prev);
    }
  }, [ws.lastJudgement, user]);

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
      if (user) {
        const myP = data.participants?.find((p: any) => p.userId === user.id);
        setParticipant(myP || null);
      }
    } catch {}
  };

  // Restore state after page refresh
  const restoreGameState = async () => {
    try {
      const gs = await api.getGameState(tournamentId);
      if (!gs || gs.status === 'NOT_FOUND') return;

      // Mark current question as restored so WS won't reset it
      if (gs.currentQuestion?.questionId) {
        setRestoredQId(gs.currentQuestion.questionId);
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

  if (!tournament) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const isLive = tournament.status === 'LIVE';
  const isFinished = tournament.status === 'FINISHED';
  const isJoined = !!participant;
  const isPlaying = participant && ['PLAYING','APPROVED'].includes(participant.matchStatus);
  const matchOver = participant && ['WON','LOST','FINISHED'].includes(participant.matchStatus);
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
            </div>
            {!submitted ? (
              <div>
                <input type="text" value={answer} onChange={e => setAnswer(e.target.value.slice(0, 50))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className="input-field text-lg text-center font-semibold py-4" placeholder={t.game.answer} maxLength={50} autoFocus />
                <button onClick={handleSubmit} disabled={!answer.trim()} className="btn-primary w-full mt-3 text-center text-lg py-4">{t.game.submit}</button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-white/50 text-sm mb-2">Your answer:</p>
                <p className="text-white text-2xl font-bold mb-4">{answer.trim() || '(no answer)'}</p>
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-amber-400 text-sm">Checking...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Judgement result */}
        {isLive && isPlaying && !matchOver && myJudgement && (
          <div className="card-glow mb-6 text-center py-10 animate-slide-up">
            {questionData && <p className="text-white/30 text-xs mb-4">{t.game.question} #{(questionData.index ?? 0) + 1}</p>}
            <div className="text-6xl mb-4">{myJudgement.decision === 'ACCEPTED' ? '✅' : '❌'}</div>
            <div className={`text-2xl font-black mb-2 ${myJudgement.decision === 'ACCEPTED' ? 'text-green-400' : 'text-red-400'}`}>
              {myJudgement.decision === 'ACCEPTED' ? t.game.correct : t.game.wrong}
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-white/40 text-sm">Your answer: <span className="text-white font-semibold">{answer.trim() || '(no answer)'}</span></div>
              {myJudgement.correctAnswer && <div className="text-white/40 text-sm">Correct answer: <span className="text-green-400 font-semibold">{myJudgement.correctAnswer}</span></div>}
            </div>
            <div className="mt-6 text-white/20 text-xs">
              <div className="flex justify-center mt-3"><div className="w-5 h-5 border-2 border-white/20 border-t-transparent rounded-full animate-spin" /></div>
              <p className="mt-2">Next question...</p>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {tournament.participants && tournament.participants.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-white/50 mb-3">{t.nav.leaderboard}</h3>
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
    </div>
  );
}
