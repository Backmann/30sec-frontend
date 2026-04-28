'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Smart CTA for a tournament card.
 *
 * Implements a state matrix that picks ONE primary action based on:
 *   - tournament.status (DRAFT / SCHEDULED / LIVE / FINISHED)
 *   - my participant.matchStatus (PENDING / APPROVED / PLAYING / WON / LOST / FINISHED / REJECTED)
 *   - timing relative to tournament.startAt (the "5 min window" for entering the lobby)
 *
 * Goal: never show two equal-weight buttons. The component decides the user's
 * role in this tournament right now, and renders exactly the action that matches.
 */

const LOBBY_OPENS_MS = 5 * 60 * 1000; // 5 minutes before start

type Participant = {
  userId: string;
  matchStatus?: string;
  currentScoreUser?: number;
  currentScoreSystem?: number;
};

type Tournament = {
  id: string;
  status: 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'ARCHIVED';
  startAt?: string | null;
  endAt?: string | null;
  participants?: Participant[];
};

type User = { id: string; role?: string; emailVerifiedAt?: string | null };

interface Props {
  tr: Tournament;
  user: User | null;
  onApply?: (tournamentId: string) => void | Promise<void>;
  /** Compact mode for narrow card layouts (smaller text). */
  compact?: boolean;
}

function useNow(intervalMs: number = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs]);
  return now;
}

function formatCountdown(ms: number): { d: number; h: number; m: number; s: number } {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { d, h, m, s };
}

/** Big visible countdown for upcoming tournament header. */
export function TournamentCountdown({ target }: { target: string }) {
  const now = useNow(1000);
  const diff = Math.max(0, new Date(target).getTime() - now);
  if (diff <= 0) return <span className="text-green-400 text-sm font-semibold animate-pulse">Вот-вот стартует!</span>;
  const { d, h, m, s } = formatCountdown(diff);
  return (
    <div className="flex gap-2 text-center">
      {d > 0 && (
        <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5">
          <div className="text-lg font-black font-mono text-brand-400">{d}</div>
          <div className="text-[9px] text-white/25 uppercase">дн</div>
        </div>
      )}
      <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5">
        <div className="text-lg font-black font-mono text-brand-400">{String(h).padStart(2, '0')}</div>
        <div className="text-[9px] text-white/25 uppercase">час</div>
      </div>
      <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5">
        <div className="text-lg font-black font-mono text-accent-400">{String(m).padStart(2, '0')}</div>
        <div className="text-[9px] text-white/25 uppercase">мин</div>
      </div>
      <div className="bg-white/[0.04] rounded-xl px-2.5 py-1.5">
        <div className="text-lg font-black font-mono text-white/50">{String(s).padStart(2, '0')}</div>
        <div className="text-[9px] text-white/25 uppercase">сек</div>
      </div>
    </div>
  );
}

/**
 * The single-CTA decision component.
 *
 * State matrix (see chat for full discussion):
 *   SCHEDULED + no application + before start          → primary "Подать заявку"
 *   SCHEDULED + PENDING                                → info "Заявка на рассмотрении"
 *   SCHEDULED + APPROVED + > 5min to start             → info "Заявка одобрена. Старт в HH:MM"
 *   SCHEDULED + APPROVED + ≤ 5min to start             → primary pulsing "Войти в зал ожидания"
 *   SCHEDULED + REJECTED                               → info + secondary "Смотреть когда начнётся"
 *   LIVE      + APPROVED/PLAYING                       → primary "Войти в игру"
 *   LIVE      + WON/LOST/FINISHED                      → score banner + primary "Смотреть финал"
 *   LIVE      + no participant / REJECTED              → primary "Смотреть сейчас"
 *   FINISHED                                           → primary "Посмотреть результаты"
 *   isAdmin                                            → "Управлять турниром" / "Судить"
 */
export default function TournamentCardCTA({ tr, user, onApply, compact = false }: Props) {
  const router = useRouter();
  const now = useNow(1000);

  const isAdmin = !!user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN');
  const my = user ? tr.participants?.find((p) => p.userId === user.id) : undefined;
  const ms = my?.matchStatus;

  const startMs = tr.startAt ? new Date(tr.startAt).getTime() : null;
  const msUntilStart = startMs !== null ? startMs - now : null;
  const lobbyOpen = msUntilStart !== null && msUntilStart <= LOBBY_OPENS_MS;

  const goGame = (e?: React.MouseEvent) => { e?.stopPropagation(); router.push(`/game/${tr.id}`); };
  const goWatch = (e?: React.MouseEvent) => { e?.stopPropagation(); router.push(`/watch/${tr.id}`); };
  const goAdmin = (e?: React.MouseEvent) => { e?.stopPropagation(); router.push(`/admin/live/${tr.id}`); };

  // ───── Admin shortcut (overrides player flow) ─────
  if (isAdmin) {
    if (tr.status === 'LIVE') {
      return (
        <button onClick={goAdmin} className="btn-primary w-full text-center text-sm">
          ⚙️ Судить турнир
        </button>
      );
    }
    if (tr.status === 'FINISHED') {
      return (
        <button onClick={goWatch} className="btn-secondary w-full text-center text-sm">
          Посмотреть результаты
        </button>
      );
    }
    return (
      <button onClick={goAdmin} className="btn-secondary w-full text-center text-sm">
        ⚙️ Управлять турниром
      </button>
    );
  }

  // ───── FINISHED ─────
  if (tr.status === 'FINISHED') {
    return (
      <button onClick={goWatch} className="btn-secondary w-full text-center text-sm">
        Посмотреть результаты
      </button>
    );
  }

  // ───── LIVE ─────
  if (tr.status === 'LIVE') {
    if (ms === 'WON' || ms === 'LOST' || ms === 'FINISHED') {
      const score = my ? `${my.currentScoreUser ?? 0}:${my.currentScoreSystem ?? 0}` : '';
      const palette =
        ms === 'WON' ? 'bg-green-500/10 border-green-500/20 text-green-400'
        : ms === 'LOST' ? 'bg-red-500/10 border-red-500/20 text-red-400'
        : 'bg-white/5 border-white/10 text-white/60';
      const label =
        ms === 'WON' ? `🏆 Победа! (${score})`
        : ms === 'LOST' ? `Поражение (${score})`
        : `Завершено (${score})`;
      return (
        <div className="space-y-2">
          <div className={`w-full text-center text-sm border rounded-2xl py-3 ${palette}`}>
            {label}
          </div>
          <button onClick={goWatch} className="btn-primary w-full text-center text-sm">
            Смотреть финал турнира
          </button>
        </div>
      );
    }
    if (ms === 'APPROVED' || ms === 'PLAYING') {
      return (
        <button onClick={goGame} className="btn-primary w-full text-center text-sm animate-pulse">
          🔴 Войти в игру
        </button>
      );
    }
    // Spectator (no participant or rejected)
    return (
      <button onClick={goWatch} className="btn-primary w-full text-center text-sm">
        🔴 Смотреть сейчас
      </button>
    );
  }

  // ───── SCHEDULED / DRAFT ─────
  if (!my) {
    // Logged in but email not yet verified — apply API will reject (EmailVerifiedGuard).
    // Show a clear info state instead of a button that just fails on click.
    if (user && !user.emailVerifiedAt) {
      return (
        <div className="space-y-2">
          <div className="w-full text-center text-sm bg-amber-500/10 border border-amber-500/20 rounded-2xl py-3 text-amber-300">
            ✉ Подтверди email чтобы играть
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); router.push('/profile'); }}
              className="btn-primary text-center text-xs py-2.5"
            >
              Подтвердить email
            </button>
            <button
              onClick={goWatch}
              className="btn-secondary text-center text-xs py-2.5"
            >
              Смотреть когда начнётся
            </button>
          </div>
        </div>
      );
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onApply?.(tr.id); }}
        className="btn-primary w-full text-center text-sm"
      >
        Подать заявку
      </button>
    );
  }

  if (ms === 'PENDING') {
    return (
      <div className="w-full text-center text-sm bg-amber-500/10 border border-amber-500/20 rounded-2xl py-3 text-amber-400">
        ⏳ Заявка на рассмотрении
      </div>
    );
  }

  if (ms === 'REJECTED') {
    return (
      <div className="space-y-2">
        <div className="w-full text-center text-sm bg-red-500/10 border border-red-500/20 rounded-2xl py-3 text-red-400">
          ✗ Заявка отклонена
        </div>
        <button onClick={goWatch} className="btn-secondary w-full text-center text-sm">
          Смотреть когда начнётся
        </button>
      </div>
    );
  }

  if (ms === 'APPROVED') {
    if (lobbyOpen) {
      return (
        <button onClick={goGame} className="btn-primary w-full text-center text-sm animate-pulse">
          🟢 Войти в зал ожидания
        </button>
      );
    }
    // Show the start time as a soft info-state — no button.
    const startStr = startMs
      ? new Date(startMs).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'скоро';
    return (
      <div className="space-y-1.5">
        <div className="w-full text-center text-sm bg-green-500/10 border border-green-500/20 rounded-2xl py-3 text-green-400">
          ✓ Заявка одобрена
        </div>
        <div className="text-center text-xs text-white/50">
          Старт {startStr}. Кнопка «Войти» появится за 5 минут до начала.
        </div>
      </div>
    );
  }

  // Fallback (shouldn't normally hit)
  return null;
}
