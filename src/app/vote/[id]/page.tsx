'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import ImageLightbox from '@/components/ImageLightbox';
import { detectLocale, Locale } from '@/lib/i18n';

const V_STR: Record<Locale, {
  voteWithdrawn: string;
  voteMoved: string;
  voteCounted: string;
  errorPrefix: string;
  tournamentNotFound: string;
  votingClosedTitle: string;
  votingClosedText: string;
  signInToVoteTitle: string;
  signInToVoteText: (hours: number) => string;
  signInButton: string;
  pickBestTitle: string;
  pickBestText: (hours: number) => string;
  toHome: string;
  pageTitle: string;
  howVotingWorks: string;
  rule1Before: string;
  rule1Bold: string;
  rule1After: string;
  rule2: string;
  rule3: string;
  rule4Before: string;
  rule4Bold: string;
  rule4After: string;
  rule5: string;
  votingWinner: string;
  currentLeader: string;
  coWinners: (n: number) => string;
  currentLeaders: (n: number) => string;
  voteWord: (n: number) => string;
  authorPrefix: string;
  questionsCount: string;
  totalVotes: string;
  withdrawTitle: string;
  giveVoteTitle: string;
  yourVote: string;
  giveVote: string;
  signInShort: string;
  noQuestionsPlayed: string;
  yourVoteFor: string;
  withdrawShort: string;
  withdraw: string;
}> = {
  ru: {
    voteWithdrawn: 'Голос отозван',
    voteMoved: 'Голос перенесён на другой вопрос',
    voteCounted: 'Ваш голос учтён!',
    errorPrefix: 'Ошибка: ',
    tournamentNotFound: 'Турнир не найден',
    votingClosedTitle: 'Голосование завершено',
    votingClosedText: 'Итоги ниже. Голосование было открыто в течение 48 часов после завершения турнира.',
    signInToVoteTitle: 'Войдите, чтобы проголосовать',
    signInToVoteText: (h) => `Голосование открыто ещё ${h}ч. Войдите и выберите самый впечатливший вопрос турнира.`,
    signInButton: 'Войти в аккаунт',
    pickBestTitle: 'Выберите лучший вопрос турнира',
    pickBestText: (h) => `Кликните «Отдать голос» на одном вопросе — у вас один голос на турнир, можно изменить до конца голосования (ещё ${h}ч).`,
    toHome: '← На главную',
    pageTitle: 'Лучший вопрос турнира',
    howVotingWorks: 'Как работает голосование',
    rule1Before: 'У каждого пользователя ',
    rule1Bold: 'один голос',
    rule1After: ' на турнир',
    rule2: 'Голос можно переносить между вопросами до конца голосования',
    rule3: 'Голосовать могут все: и игроки, и зрители',
    rule4Before: 'Голосование открыто ',
    rule4Bold: '48 часов',
    rule4After: ' после завершения турнира',
    rule5: 'Автор самого популярного вопроса получает признание сообщества',
    votingWinner: '🏆 Победитель голосования',
    currentLeader: 'Текущий лидер',
    coWinners: (n) => `🏆 Со-победители (${n})`,
    currentLeaders: (n) => `Текущие лидеры (${n})`,
    voteWord: (n) => n === 1 ? 'голос' : 'голос(ов)',
    authorPrefix: 'Автор: ',
    questionsCount: 'Вопросов: ',
    totalVotes: 'Всего голосов: ',
    withdrawTitle: 'Нажмите чтобы отозвать голос',
    giveVoteTitle: 'Отдать голос за этот вопрос',
    yourVote: '✓ Ваш голос',
    giveVote: 'Отдать голос',
    signInShort: '🔒 Войдите',
    noQuestionsPlayed: 'Нет сыгранных вопросов в этом турнире',
    yourVoteFor: 'Ваш голос отдан за',
    withdrawShort: 'Отозвать голос',
    withdraw: 'Отозвать',
  },
  en: {
    voteWithdrawn: 'Vote withdrawn',
    voteMoved: 'Vote moved to another question',
    voteCounted: 'Your vote is counted!',
    errorPrefix: 'Error: ',
    tournamentNotFound: 'Tournament not found',
    votingClosedTitle: 'Voting closed',
    votingClosedText: 'Results below. Voting was open for 48 hours after the tournament ended.',
    signInToVoteTitle: 'Sign in to vote',
    signInToVoteText: (h) => `Voting open for ${h}h more. Sign in and pick the most impressive question of the tournament.`,
    signInButton: 'Sign in',
    pickBestTitle: 'Pick the best question of the tournament',
    pickBestText: (h) => `Click "Vote" on one question — you have one vote per tournament, you can change it until voting closes (${h}h left).`,
    toHome: '← Home',
    pageTitle: 'Best question of the tournament',
    howVotingWorks: 'How voting works',
    rule1Before: 'Each user has ',
    rule1Bold: 'one vote',
    rule1After: ' per tournament',
    rule2: 'You can move your vote between questions until voting closes',
    rule3: 'Anyone can vote: players and spectators',
    rule4Before: 'Voting is open for ',
    rule4Bold: '48 hours',
    rule4After: ' after the tournament ends',
    rule5: 'The author of the most popular question earns community recognition',
    votingWinner: '🏆 Voting winner',
    currentLeader: 'Current leader',
    coWinners: (n) => `🏆 Co-winners (${n})`,
    currentLeaders: (n) => `Current leaders (${n})`,
    voteWord: (n) => n === 1 ? 'vote' : 'votes',
    authorPrefix: 'Author: ',
    questionsCount: 'Questions: ',
    totalVotes: 'Total votes: ',
    withdrawTitle: 'Click to withdraw vote',
    giveVoteTitle: 'Vote for this question',
    yourVote: '✓ Your vote',
    giveVote: 'Vote',
    signInShort: '🔒 Sign in',
    noQuestionsPlayed: 'No questions played in this tournament',
    yourVoteFor: 'Your vote is for',
    withdrawShort: 'Withdraw vote',
    withdraw: 'Withdraw',
  },
  de: {
    voteWithdrawn: 'Stimme zurückgezogen',
    voteMoved: 'Stimme zu einer anderen Frage verschoben',
    voteCounted: 'Deine Stimme zählt!',
    errorPrefix: 'Fehler: ',
    tournamentNotFound: 'Turnier nicht gefunden',
    votingClosedTitle: 'Abstimmung beendet',
    votingClosedText: 'Ergebnisse unten. Die Abstimmung war 48 Stunden nach Turnierende geöffnet.',
    signInToVoteTitle: 'Zum Abstimmen anmelden',
    signInToVoteText: (h) => `Abstimmung läuft noch ${h}h. Melde dich an und wähle die beeindruckendste Frage des Turniers.`,
    signInButton: 'Anmelden',
    pickBestTitle: 'Wähle die beste Frage des Turniers',
    pickBestText: (h) => `Klicke „Abstimmen" bei einer Frage — du hast eine Stimme pro Turnier und kannst sie bis Abstimmungsende ändern (noch ${h}h).`,
    toHome: '← Zur Startseite',
    pageTitle: 'Beste Frage des Turniers',
    howVotingWorks: 'So funktioniert die Abstimmung',
    rule1Before: 'Jeder Nutzer hat ',
    rule1Bold: 'eine Stimme',
    rule1After: ' pro Turnier',
    rule2: 'Du kannst deine Stimme zwischen Fragen verschieben, bis die Abstimmung endet',
    rule3: 'Alle können abstimmen: Spieler und Zuschauer',
    rule4Before: 'Die Abstimmung ist ',
    rule4Bold: '48 Stunden',
    rule4After: ' nach Turnierende geöffnet',
    rule5: 'Der Autor der beliebtesten Frage erhält Anerkennung der Community',
    votingWinner: '🏆 Sieger der Abstimmung',
    currentLeader: 'Aktueller Spitzenreiter',
    coWinners: (n) => `🏆 Mit-Sieger (${n})`,
    currentLeaders: (n) => `Aktuelle Spitzenreiter (${n})`,
    voteWord: (n) => n === 1 ? 'Stimme' : 'Stimmen',
    authorPrefix: 'Autor: ',
    questionsCount: 'Fragen: ',
    totalVotes: 'Stimmen gesamt: ',
    withdrawTitle: 'Klicken zum Zurückziehen',
    giveVoteTitle: 'Für diese Frage abstimmen',
    yourVote: '✓ Deine Stimme',
    giveVote: 'Abstimmen',
    signInShort: '🔒 Anmelden',
    noQuestionsPlayed: 'In diesem Turnier wurden keine Fragen gespielt',
    yourVoteFor: 'Deine Stimme geht an',
    withdrawShort: 'Stimme zurückziehen',
    withdraw: 'Zurückziehen',
  },
};

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const [locale, setLocale] = useState<Locale>('ru');
  useEffect(() => { setLocale(detectLocale()); }, []);
  const vt = V_STR[locale];
  const [results, setResults] = useState<any>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<any[] | null>(null);
  const [lightboxStart, setLightboxStart] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.getVoteResults(tournamentId);
      setResults(res);
      if (token) {
        try {
          const mv = await api.getMyVote(tournamentId);
          setMyVote(mv.questionId);
        } catch {}
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tournamentId, token]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const vote = async (questionId: string, questionText: string) => {
    if (!token) {
      router.push('/login?redirect=' + encodeURIComponent(`/vote/${tournamentId}`));
      return;
    }
    const wasVoted = myVote;
    setVoting(questionId);
    try {
      const res = await api.castVote(tournamentId, questionId);
      setMyVote(res.voted ? questionId : null);
      // Toast feedback
      if (!res.voted) {
        showToast(vt.voteWithdrawn);
      } else if (wasVoted && wasVoted !== questionId) {
        showToast(vt.voteMoved);
      } else {
        showToast(vt.voteCounted);
      }
      await load();
    } catch (e: any) {
      alert(vt.errorPrefix + (e.message || ''));
    }
    setVoting(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-white/20 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  if (!results) return (
    <div className="min-h-screen flex items-center justify-center text-white/60">
      {vt.tournamentNotFound}
    </div>
  );

  // Items sorted by match order (original orderIndex) — NOT by votes
  const itemsInMatchOrder = [...results.items].sort((a: any, b: any) => a.orderIndex - b.orderIndex);

  // For "top 3" section, we rank by votes
  const topRanked = [...results.items].filter((i: any) => i.votes > 0).sort((a: any, b: any) => b.votes - a.votes).slice(0, 3);

  // Find the user's chosen item for sticky bar
  const myVotedItem = myVote ? itemsInMatchOrder.find((i: any) => i.questionId === myVote) : null;
  const myVotedLoc = myVotedItem?.localizations?.find((l: any) => l.language === 'ru') || myVotedItem?.localizations?.[0];
  const myVotedIndex = myVotedItem ? itemsInMatchOrder.findIndex((i: any) => i.questionId === myVote) : -1;

  const maxVotes = Math.max(1, ...results.items.map((i: any) => i.votes));

  // Status message
  const getStatusMessage = () => {
    if (!results.votingOpen) {
      return {
        icon: '📊',
        title: vt.votingClosedTitle,
        text: vt.votingClosedText,
        bg: 'from-white/[0.02] to-transparent border-white/10',
      };
    }
    if (!token) {
      return {
        icon: '🔒',
        title: vt.signInToVoteTitle,
        text: vt.signInToVoteText(results.hoursLeft),
        bg: 'from-amber-500/10 to-transparent border-amber-500/30',
        action: { label: vt.signInButton, onClick: () => router.push('/login?redirect=' + encodeURIComponent(`/vote/${tournamentId}`)) },
      };
    }
    if (myVote) return null; // Sticky bar shows current vote
    return {
      icon: '⭐',
      title: vt.pickBestTitle,
      text: vt.pickBestText(results.hoursLeft),
      bg: 'from-brand-500/10 to-transparent border-brand-500/30',
    };
  };

  const status = getStatusMessage();

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-brand-500/95 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-2xl backdrop-blur animate-fade-in">
          ✓ {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-white/40 hover:text-white text-sm mb-4">{vt.toHome}</button>

        {/* Header */}
        <div className="card-glow mb-4 text-center py-6 px-6">
          <div className="text-3xl mb-1">⭐</div>
          <h1 className="text-xl sm:text-2xl font-black text-white mb-1">{vt.pageTitle}</h1>
          <div className="text-white/50 text-sm">{results.tournamentTitle}</div>
        </div>

        {/* Status card (when NOT voted) */}
        {status && (
          <div className={`card mb-4 bg-gradient-to-b ${status.bg}`}>
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0">{status.icon}</div>
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">{status.title}</div>
                <div className="text-white/60 text-sm">{status.text}</div>
                {status.action && (
                  <button onClick={status.action.onClick} className="btn-primary text-sm mt-3">
                    {status.action.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rules */}
        <div className="mb-4">
          <button onClick={() => setShowRules(!showRules)} className="text-white/40 hover:text-white text-xs flex items-center gap-1">
            <span>{showRules ? '▾' : '▸'}</span>
            <span>{vt.howVotingWorks}</span>
          </button>
          {showRules && (
            <div className="card mt-2 py-4 px-5 text-sm text-white/60 space-y-2 animate-slide-down">
              <div>• {vt.rule1Before}<span className="text-white font-medium">{vt.rule1Bold}</span>{vt.rule1After}</div>
              <div>• {vt.rule2}</div>
              <div>• {vt.rule3}</div>
              <div>• {vt.rule4Before}<span className="text-white font-medium">{vt.rule4Bold}</span>{vt.rule4After}</div>
              <div>• {vt.rule5}</div>
            </div>
          )}
        </div>

        {/* Winners / leaders */}
        {results.totalVotes > 0 && (() => {
          const maxV = Math.max(...results.items.map((i: any) => i.votes));
          const winners = maxV > 0 ? results.items.filter((i: any) => i.votes === maxV) : [];
          const isClosed = !results.votingOpen;
          if (winners.length === 0) return null;
          return (
            <div className="card mb-4 py-4 px-5 bg-gradient-to-b from-accent-500/10 to-transparent border-accent-500/30">
              <div className="text-[10px] uppercase tracking-[0.2em] text-accent-400 mb-3 flex items-center justify-between">
                <span>
                  {winners.length === 1
                    ? (isClosed ? vt.votingWinner : vt.currentLeader)
                    : (isClosed ? vt.coWinners(winners.length) : vt.currentLeaders(winners.length))}
                </span>
                <span className="text-white/40">{maxV} {vt.voteWord(maxV)}</span>
              </div>
              <div className="space-y-3">
                {winners.map((item: any) => {
                  const loc = item.localizations?.find((l: any) => l.language === 'ru') || item.localizations?.[0];
                  return (
                    <div key={item.questionId} className="flex items-start gap-3">
                      <div className="shrink-0 text-xl">🏆</div>
                      {item.questionImages?.length > 0 && (
                        <img src={item.questionImages[0].url} alt="" onClick={() => { setLightboxImages(item.questionImages); setLightboxStart(0); }} className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0 cursor-pointer hover:border-accent-400/60" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium leading-tight">{loc?.questionText}</div>
                        {loc?.correctAnswer && <div className="text-green-400/70 text-xs mt-0.5">→ {loc.correctAnswer}</div>}
                        {item.creator && (
                          <div className="text-white/40 text-[11px] mt-1">{vt.authorPrefix}<button onClick={(e) => { e.stopPropagation(); router.push(`/player/${item.creator.nickname}`); }} className="text-white/70 hover:text-brand-400 underline-offset-2 hover:underline">{item.creator.nickname}</button></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-white/40 mb-3 px-1">
          <div>{vt.questionsCount}<span className="text-white/70 font-semibold">{results.items.length}</span></div>
          <div>{vt.totalVotes}<span className="text-white/70 font-semibold">{results.totalVotes}</span></div>
        </div>

        {/* Questions — in match order */}
        <div className="space-y-3">
          {itemsInMatchOrder.map((item: any, idx: number) => {
            const loc = item.localizations?.find((l: any) => l.language === 'ru') || item.localizations?.[0];
            const isMyVote = myVote === item.questionId;
            const percent = results.totalVotes > 0 ? Math.round((item.votes / results.totalVotes) * 100) : 0;
            return (
              <div key={item.questionId} className={`card p-5 relative transition ${isMyVote ? 'border-brand-500/60 bg-brand-500/10 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10' : ''}`}>
                {/* Selected indicator */}
                {isMyVote && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/40 animate-fade-in">
                    ✓
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-mono text-sm ${isMyVote ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-white/40'}`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold mb-1 ${isMyVote ? 'text-white' : 'text-white'}`}>{loc?.questionText}</div>
                    {loc?.correctAnswer && (
                      <div className="text-green-400/70 text-sm">→ {loc.correctAnswer}</div>
                    )}
                    {item.questionImages?.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {item.questionImages.map((img: any, i: number) => (
                          <img key={i} src={img.url} alt="" onClick={() => { setLightboxImages(item.questionImages); setLightboxStart(i); }} className="w-20 h-20 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-brand-400/60" />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                      <div className="text-xs text-white/40">
                        {item.creator ? <>{vt.authorPrefix}<button onClick={() => router.push(`/player/${item.creator.nickname}`)} className="text-white/70 hover:text-brand-400 font-medium underline-offset-2 hover:underline">{item.creator.nickname}</button> {item.creator.flagCode && <span className="ml-1">{item.creator.flagCode.toUpperCase()}</span>}</> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">{item.votes}</div>
                          {percent > 0 && <div className="text-[10px] text-white/30">{percent}%</div>}
                        </div>
                        {results.votingOpen && (
                          <button
                            onClick={() => vote(item.questionId, loc?.questionText || '')}
                            disabled={voting === item.questionId}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 whitespace-nowrap ${
                              isMyVote
                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600'
                                : 'bg-white/5 hover:bg-brand-500/20 text-white/70 hover:text-brand-400 border border-white/10 hover:border-brand-500/30'
                            }`}
                            title={isMyVote ? vt.withdrawTitle : vt.giveVoteTitle}
                          >
                            {voting === item.questionId ? '...' : isMyVote ? vt.yourVote : token ? vt.giveVote : vt.signInShort}
                          </button>
                        )}
                      </div>
                    </div>
                    {item.votes > 0 && (
                      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isMyVote ? 'bg-brand-500' : 'bg-white/20'}`} style={{ width: `${(item.votes / maxVotes) * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {results.items.length === 0 && (
          <div className="card py-10 text-center text-white/40">
            {vt.noQuestionsPlayed}
          </div>
        )}
      </div>

      {/* Sticky bottom bar: shows current vote */}
      {myVotedItem && results.votingOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-dark-800/95 backdrop-blur-xl border-t border-brand-500/40 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
          <div className="max-w-4xl mx-auto p-3 sm:px-5 sm:py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 font-bold text-sm">✓</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-brand-400/80">{vt.yourVoteFor}</div>
              <div className="text-white text-sm truncate">
                <span className="text-white/40 font-mono text-xs mr-1">#{myVotedIndex + 1}</span>
                {myVotedLoc?.questionText}
              </div>
            </div>
            <button
              onClick={() => myVote && vote(myVote, myVotedLoc?.questionText || '')}
              className="text-white/50 hover:text-red-400 text-xs shrink-0 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition whitespace-nowrap"
              title={vt.withdrawShort}
            >
              {vt.withdraw}
            </button>
          </div>
        </div>
      )}

      {lightboxImages && <ImageLightbox images={lightboxImages} startIndex={lightboxStart} onClose={() => setLightboxImages(null)} />}
    </div>
  );
}
