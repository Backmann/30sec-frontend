'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { detectLocale, type Locale } from '@/lib/i18n';

const LABELS: Record<Locale, { privacy: string; terms: string; contact: string; beta: string }> = {
  ru: { privacy: 'Конфиденциальность', terms: 'Условия', contact: 'Контакт', beta: 'Closed Beta' },
  en: { privacy: 'Privacy', terms: 'Terms', contact: 'Contact', beta: 'Closed Beta' },
  de: { privacy: 'Datenschutz', terms: 'AGB', contact: 'Kontakt', beta: 'Closed Beta' },
};

export default function Footer() {
  const [locale, setLocale] = useState<Locale>('ru');
  useEffect(() => { setLocale(detectLocale()); }, []);
  const l = LABELS[locale] || LABELS.ru;

  return (
    <footer className="border-t border-white/[0.05] mt-16 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-white/30">
          <span>© 2026 30sec.org</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono uppercase tracking-wider border border-amber-500/20">
            {l.beta}
          </span>
        </div>
        <nav className="flex items-center gap-4 text-white/40">
          <Link href="/privacy" className="hover:text-white/70 transition">{l.privacy}</Link>
          <Link href="/terms" className="hover:text-white/70 transition">{l.terms}</Link>
          <Link href="/contact" className="hover:text-white/70 transition">{l.contact}</Link>
        </nav>
      </div>
    </footer>
  );
}
