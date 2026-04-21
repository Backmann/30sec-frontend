'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import ImageLightbox from '@/components/ImageLightbox';

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [results, setResults] = useState<any>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<any[] | null>(null);
  const [lightboxStart, setLightboxStart] = useState(0);

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

  const vote = async (questionId: string) => {
    if (!token) {
      alert('Войдите чтобы проголосовать');
      router.push('/login');
      return;
    }
    setVoting(questionId);
    try {
      const res = await api.castVote(tournamentId, questionId);
      setMyVote(res.voted ? questionId : null);
      await load();
    } catch (e: any) {
      alert('Ошибка: ' + (e.message || ''));
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
      Турнир не найден
    </div>
  );

  const maxVotes = Math.max(1, ...results.items.map((i: any) => i.votes));

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-white/40 hover:text-white text-sm mb-4">← На главную</button>

        <div className="card-glow mb-6 text-center py-8 px-6">
          <div className="text-4xl mb-2">⭐</div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Лучший вопрос турнира</h1>
          <div className="text-white/50 text-sm">{results.tournamentTitle}</div>
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap text-xs">
            <div className="text-white/40">Всего голосов: <span className="text-white font-bold">{results.totalVotes}</span></div>
            {results.votingOpen ? (
              <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                ✓ Голосование открыто · осталось {results.hoursLeft}ч
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
                Голосование закрыто
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {results.items.map((item: any, idx: number) => {
            const loc = item.localizations?.find((l: any) => l.language === 'ru') || item.localizations?.[0];
            const isMyVote = myVote === item.questionId;
            const percent = results.totalVotes > 0 ? Math.round((item.votes / results.totalVotes) * 100) : 0;
            const isLeader = idx === 0 && item.votes > 0;
            return (
              <div key={item.questionId} className={`card p-5 ${isMyVote ? 'border-brand-500/50 bg-brand-500/5' : isLeader ? 'border-accent-500/40 bg-accent-500/5' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-mono text-white/40 text-sm">
                    {isLeader ? '🏆' : `#${idx + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold mb-1">{loc?.questionText}</div>
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
                        {item.creator ? <>Автор: <span className="text-white/70 font-medium">{item.creator.nickname}</span> {item.creator.flagCode && <span className="ml-1">{item.creator.flagCode}</span>}</> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">{item.votes} {item.votes === 1 ? 'голос' : item.votes < 5 ? 'голоса' : 'голосов'}</div>
                          {percent > 0 && <div className="text-[10px] text-white/30">{percent}%</div>}
                        </div>
                        {results.votingOpen && token && (
                          <button
                            onClick={() => vote(item.questionId)}
                            disabled={voting === item.questionId}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0 ${isMyVote ? 'bg-brand-500 text-white' : 'bg-white/5 hover:bg-brand-500/20 text-white/70 hover:text-brand-400 border border-white/10 hover:border-brand-500/30'}`}
                          >
                            {voting === item.questionId ? '...' : isMyVote ? '✓ Ваш голос' : '⭐ Голосовать'}
                          </button>
                        )}
                      </div>
                    </div>
                    {item.votes > 0 && (
                      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isLeader ? 'bg-accent-500' : 'bg-brand-500'}`} style={{ width: `${(item.votes / maxVotes) * 100}%` }} />
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
            Нет сыгранных вопросов в этом турнире
          </div>
        )}
      </div>

      {lightboxImages && <ImageLightbox images={lightboxImages} startIndex={lightboxStart} onClose={() => setLightboxImages(null)} />}
    </div>
  );
}
