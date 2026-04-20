import { useEffect, useRef, useState } from 'react';
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
    questionId?: string;
    localizations: { language: string; questionText: string }[];
    questionImages?: any[];
  } | null;
  timerSeconds: number;
  isLocked: boolean;
  phase: string;
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
    question: null, timerSeconds: 30, isLocked: false, phase: 'waiting',
    scores: new Map(), answers: [], lastJudgement: null,
    tournamentStarted: false, tournamentFinished: false, reactions: null, connected: false,
  });

  useEffect(() => {
    const socket = io(WS_URL, { auth: { token: token || undefined }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState(s => ({ ...s, connected: true }));
      socket.emit('join_tournament', { tournamentId });
      if (isAdmin) socket.emit('join_admin', { tournamentId });
    });
    socket.on('disconnect', () => setState(s => ({ ...s, connected: false })));

    // Reconnect: restore game state
    socket.on('game_state_restore', (data) => {
      if (data.questionId) {
        setState(s => ({
          ...s,
          question: { orderIndex: data.orderIndex, category: 'LOGIC', questionId: data.questionId, localizations: data.localizations, questionImages: data.questionImages || [] },
          phase: data.phase, timerSeconds: data.timerSeconds, isLocked: data.phase === 'locked',
        }));
      }
    });

    socket.on('tournament_started', () => setState(s => ({ ...s, tournamentStarted: true })));
    socket.on('tournament_finished', () => setState(s => ({ ...s, tournamentFinished: true })));

    socket.on('question_started', (data) => {
      setState(s => ({
        ...s,
        question: { orderIndex: data.orderIndex, category: data.category, questionId: data.questionId, localizations: data.localizations, questionImages: data.questionImages || [] },
        timerSeconds: 0, isLocked: false, phase: data.phase || 'reading', answers: [], lastJudgement: null,
      }));
    });

    socket.on('phase_changed', (data) => setState(s => ({ ...s, phase: data.phase, timerSeconds: data.seconds })));
    socket.on('timer_tick', (data) => setState(s => ({ ...s, timerSeconds: data.secondsLeft, phase: data.phase || s.phase })));
    socket.on('question_locked', () => setState(s => ({ ...s, isLocked: true, timerSeconds: 0, phase: 'locked' })));

    socket.on('answer_submitted', (data) => setState(s => ({ ...s, answers: [...s.answers, data] })));

    socket.on('score_updated', (data) => {
      setState(s => {
        const m = new Map(s.scores);
        m.set(data.userId, { scoreUser: data.scoreUser, scoreSystem: data.scoreSystem, matchStatus: data.matchStatus });
        return { ...s, scores: m };
      });
    });

    socket.on('judgement_made', (data) => setState(s => ({ ...s, lastJudgement: data })));

    socket.on('match_finished', (data) => {
      setState(s => {
        const m = new Map(s.scores);
        m.set(data.userId, { scoreUser: data.finalScoreUser, scoreSystem: data.finalScoreSystem, matchStatus: data.matchStatus });
        return { ...s, scores: m };
      });
    });

    socket.on('reactions_updated', (data) => setState(s => ({ ...s, reactions: data })));

    return () => { socket.emit('leave_tournament', { tournamentId }); socket.disconnect(); };
  }, [tournamentId, token, isAdmin]);

  return { ...state, socket: socketRef.current };
}
