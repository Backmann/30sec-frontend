import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'https://30sec.org';

interface UseSocketOptions {
  tournamentId: string;
  token?: string | null;
  isAdmin?: boolean;
}

interface GameState {
  question: {
    orderIndex: number;
    category: string;
    localizations: { language: string; questionText: string }[];
  } | null;
  timerSeconds: number;
  isLocked: boolean;
  scores: Map<string, { scoreUser: number; scoreSystem: number; matchStatus: string }>;
  answers: { answerId: string; userId: string; nickname: string; answerText: string }[];
  lastJudgement: {
    userId: string;
    decision: string;
    correctAnswer: string;
    scoreUser: number;
    scoreSystem: number;
    matchStatus: string;
  } | null;
  tournamentStarted: boolean;
  tournamentFinished: boolean;
  reactions: { questionId: string; reactions: any[] } | null;
  connected: boolean;
}

export function useSocket({ tournamentId, token, isAdmin }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<GameState>({
    question: null,
    timerSeconds: 30,
    isLocked: false,
    scores: new Map(),
    answers: [],
    lastJudgement: null,
    tournamentStarted: false,
    tournamentFinished: false,
    reactions: null,
    connected: false,
  });

  useEffect(() => {
    const socket = io(WS_URL, {
      auth: { token: token || undefined },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 WS connected');
      setState((s) => ({ ...s, connected: true }));

      // Join tournament room
      socket.emit('join_tournament', { tournamentId });

      // Join admin room if admin
      if (isAdmin) {
        socket.emit('join_admin', { tournamentId });
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 WS disconnected');
      setState((s) => ({ ...s, connected: false }));
    });

    // ─── Tournament events ──────────────────────
    socket.on('tournament_started', (data) => {
      console.log('🏆 Tournament started:', data);
      setState((s) => ({ ...s, tournamentStarted: true }));
    });

    socket.on('tournament_finished', () => {
      console.log('🏁 Tournament finished');
      setState((s) => ({ ...s, tournamentFinished: true }));
    });

    // ─── Question events ────────────────────────
    socket.on('question_started', (data) => {
      console.log('❓ Question started:', data);
      setState((s) => ({
        ...s,
        question: {
          orderIndex: data.orderIndex,
          category: data.category,
          localizations: data.localizations,
        },
        timerSeconds: data.timerSeconds || 30,
        isLocked: false,
        answers: [],
        lastJudgement: null,
      }));
    });

    socket.on('timer_tick', (data) => {
      setState((s) => ({ ...s, timerSeconds: data.secondsLeft }));
    });

    socket.on('question_locked', () => {
      console.log('🔒 Question locked');
      setState((s) => ({ ...s, isLocked: true, timerSeconds: 0 }));
    });

    // ─── Answer events (admin) ──────────────────
    socket.on('answer_submitted', (data) => {
      console.log('📝 Answer submitted:', data);
      setState((s) => ({
        ...s,
        answers: [...s.answers, data],
      }));
    });

    socket.on('all_answers_submitted', () => {
      console.log('✅ All answers submitted');
    });

    // ─── Score & Judgement events ────────────────
    socket.on('score_updated', (data) => {
      console.log('📊 Score updated:', data);
      setState((s) => {
        const newScores = new Map(s.scores);
        newScores.set(data.userId, {
          scoreUser: data.scoreUser,
          scoreSystem: data.scoreSystem,
          matchStatus: data.matchStatus,
        });
        return { ...s, scores: newScores };
      });
    });

    socket.on('judgement_made', (data) => {
      console.log('⚖️ Judgement made:', data);
      setState((s) => ({ ...s, lastJudgement: data }));
    });

    // ─── Match events ───────────────────────────
    socket.on('match_finished', (data) => {
      console.log('🏁 Match finished:', data);
      setState((s) => {
        const newScores = new Map(s.scores);
        newScores.set(data.userId, {
          scoreUser: data.finalScoreUser,
          scoreSystem: data.finalScoreSystem,
          matchStatus: data.matchStatus,
        });
        return { ...s, scores: newScores };
      });
    });

    // ─── Reactions ──────────────────────────────
    socket.on('reactions_updated', (data) => {
      setState((s) => ({ ...s, reactions: data }));
    });

    return () => {
      socket.emit('leave_tournament', { tournamentId });
      socket.disconnect();
    };
  }, [tournamentId, token, isAdmin]);

  return { ...state, socket: socketRef.current };
}
