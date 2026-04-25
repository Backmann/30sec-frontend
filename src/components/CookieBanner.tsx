'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { detectLocale, type Locale } from '@/lib/i18n';

const TEXTS: Record<Locale, any> = {
  ru: {
    title: 'Этот сайт использует cookies',
    body: 'Мы используем только необходимые (essential) cookies для работы авторизации и безопасности. Аналитики, рекламы или трекеров нет.',
    accept: 'Понятно',
    privacy: 'Подробнее в Политике конфиденциальности',
  },
  en: {
    title: 'This site uses cookies',
    body: 'We use only essential cookies for authentication and security. No analytics, ads or trackers.',
    accept: 'Got it',
    privacy: 'Learn more in our Privacy Policy',
  },
  de: {
    title: 'Diese Website verwendet Cookies',
    body: 'Wir verwenden nur essentielle Cookies für Authentifizierung und Sicherheit. Keine Analyse, Werbung oder Tracker.',
    accept: 'Verstanden',
    privacy: 'Mehr in unserer Datenschutzerklärung',
  },
};

const STORAGE_KEY = '30sec_cookie_consent_v1';

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const [locale, setLocale] = useState<Locale>('ru');

  useEffect(() => {
    setLocale(detectLocale());
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ acceptedAt: new Date().toISOString(), version: 1 }));
    setShow(false);
  };

  if (!show) return null;

  const t = TEXTS[locale] || TEXTS.ru;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-5 bg-dark-900/98 backdrop-blur-xl border-t border-brand-500/30 shadow-[0_-8px_32px_rgba(0,0,0,0.6)] animate-slide-up">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm">🍪 {t.title}</div>
          <div className="text-white/60 text-xs mt-1 leading-relaxed">{t.body}</div>
          <Link href="/privacy" className="text-brand-400 hover:text-brand-300 text-xs mt-1 inline-block">
            {t.privacy} →
          </Link>
        </div>
        <button onClick={accept} className="btn-primary text-sm whitespace-nowrap shrink-0">
          {t.accept}
        </button>
      </div>
    </div>
  );
}
