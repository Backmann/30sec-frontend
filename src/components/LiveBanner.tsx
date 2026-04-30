'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { detectLocale, Locale } from '@/lib/i18n';

interface ActiveTournament {
  id: string;
  title: string;
  type: string;
  playersCount: number;
}

const STR: Record<Locale, { live: string; running: string; watch: string; hide: string }> = {
  ru: { live: 'LIVE', running: 'Идёт турнир — ',  watch: 'Смотреть →', hide: 'Скрыть' },
  en: { live: 'LIVE', running: 'Tournament running — ', watch: 'Watch →', hide: 'Hide' },
  de: { live: 'LIVE', running: 'Turnier läuft — ', watch: 'Zuschauen →', hide: 'Ausblenden' },
};

/**
 * Site-wide indicator that a tournament is happening right now.
 * Polls /api/tournaments/live/active every 30 seconds. When at least one
 * tournament is LIVE, renders a slim red bar at the very top of the page
 * with a single CTA — "Watch now". Anonymous viewers can click through.
 *
 * The banner hides itself on the watch/game pages of the live tournament
 * (so it doesn't shout at users who are already there) and on the OBS
 * /live/:id stream page (it would appear in the broadcast — embarrassing).
 */
export default function LiveBanner() {
  const [active, setActive] = useState<ActiveTournament[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [locale, setLocale] = useState<Locale>('ru');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { setLocale(detectLocale()); }, []);

  const t = STR[locale];

  useEffect(() => {
    let cancelled = false;
    const fetchActive = async () => {
      try {
        const res = await fetch('/api/tournaments/live/active', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setActive(Array.isArray(data) ? data : []);
      } catch {}
    };
    fetchActive();
    const iv = setInterval(fetchActive, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  if (dismissed || active.length === 0) return null;

  // Don't shout at users already inside the live experience.
  const tournament = active[0];
  const hideOnPaths = [
    `/watch/${tournament.id}`,
    `/game/${tournament.id}`,
    `/live/${tournament.id}`,
    `/admin/live/${tournament.id}`,
  ];
  if (hideOnPaths.some(p => pathname?.startsWith(p))) return null;

  const more = active.length - 1;

  return (
    <div className="sticky top-0 z-[55] w-full bg-gradient-to-r from-red-600/95 via-red-500/95 to-red-600/95 backdrop-blur-md border-b border-red-400/40 shadow-[0_4px_20px_-8px_rgba(239,68,68,0.5)] animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="relative inline-flex items-center justify-center shrink-0">
          <span className="absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        <div className="flex-1 min-w-0 text-white text-sm">
          <span className="font-bold uppercase tracking-wider text-[10px] mr-2">{t.live}</span>
          <span className="opacity-95">{t.running}</span>
          <span className="font-semibold truncate">{tournament.title}</span>
          {more > 0 && <span className="opacity-75 ml-1">(+{more})</span>}
        </div>
        <button
          onClick={() => router.push(`/watch/${tournament.id}`)}
          className="shrink-0 bg-white text-red-600 hover:bg-red-50 transition-colors px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
        >
          {t.watch}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t.hide}
          className="shrink-0 text-white/70 hover:text-white text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
