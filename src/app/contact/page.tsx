'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { detectLocale, type Locale } from '@/lib/i18n';

const CONTENT: Record<string, any> = {
  ru: {
    title: 'Контакт',
    intro: 'Свяжитесь с нами по любым вопросам — техническим, юридическим, обратной связи.',
    sections: [
      { h: 'Общие вопросы и обратная связь', email: 'contact@30sec.org' },
      { h: 'Защита данных и GDPR', email: 'contact@30sec.org', note: 'Запросы на доступ, исправление или удаление данных' },
      { h: 'Сообщения о багах', email: 'contact@30sec.org', note: 'Опишите баг как можно подробнее: что делали, что ожидали, что произошло' },
      { h: 'Юридические вопросы', email: 'contact@30sec.org' },
      { h: 'Информация и новости', email: 'info@30sec.org', note: 'Рассылки и общая информация о проекте' }
    ],
    response: 'Мы стараемся ответить в течение 7 рабочих дней.',
    legal: 'Этот проект работает как некоммерческое хобби в стадии закрытого бета-тестирования.'
  },
  en: {
    title: 'Contact',
    intro: 'Get in touch with us for any questions — technical, legal, feedback.',
    sections: [
      { h: 'General inquiries and feedback', email: 'contact@30sec.org' },
      { h: 'Data protection and GDPR', email: 'contact@30sec.org', note: 'Requests for data access, correction or deletion' },
      { h: 'Bug reports', email: 'contact@30sec.org', note: 'Describe the bug in detail: what you did, what you expected, what happened' },
      { h: 'Legal matters', email: 'contact@30sec.org' },
      { h: 'Information and news', email: 'info@30sec.org', note: 'Newsletters and general project information' }
    ],
    response: 'We aim to respond within 7 business days.',
    legal: 'This project operates as a non-commercial hobby in closed beta.'
  },
  de: {
    title: 'Kontakt',
    intro: 'Kontaktieren Sie uns bei allen Fragen — technisch, rechtlich, Feedback.',
    sections: [
      { h: 'Allgemeine Anfragen und Feedback', email: 'contact@30sec.org' },
      { h: 'Datenschutz und DSGVO', email: 'contact@30sec.org', note: 'Anfragen zu Datenzugriff, -korrektur oder -löschung' },
      { h: 'Fehlermeldungen', email: 'contact@30sec.org', note: 'Beschreiben Sie den Fehler ausführlich: was Sie taten, was Sie erwarteten, was geschah' },
      { h: 'Rechtliche Fragen', email: 'contact@30sec.org' },
      { h: 'Informationen und Neuigkeiten', email: 'info@30sec.org', note: 'Newsletter und allgemeine Projektinformationen' }
    ],
    response: 'Wir bemühen uns, innerhalb von 7 Werktagen zu antworten.',
    legal: 'Dieses Projekt wird als nicht-kommerzielles Hobby in geschlossener Beta-Phase betrieben.'
  }
};

export default function ContactPage() {
  const [locale, setLocale] = useState<Locale>('ru');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setLocale(detectLocale()); setMounted(true); }, []);
  if (!mounted) return null;

  const c = CONTENT[locale] || CONTENT.ru;

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-white/40 hover:text-white text-sm">← 30sec.</Link>
          <div className="flex gap-1.5">
            {(['ru', 'en', 'de'] as const).map(l => (
              <button key={l} onClick={() => setLocale(l)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase ${locale === l ? 'bg-brand-500/15 text-brand-400' : 'text-white/40 hover:text-white/70'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{c.title}</h1>
        <p className="text-white/60 mb-10 text-sm leading-relaxed">{c.intro}</p>

        <div className="space-y-3">
          {c.sections.map((s: any, i: number) => (
            <div key={i} className="card">
              <div className="text-sm font-semibold text-white">{s.h}</div>
              <a href={`mailto:${s.email}`} className="text-brand-400 hover:text-brand-300 text-sm font-mono mt-1 inline-block">{s.email}</a>
              {s.note && <div className="text-white/40 text-xs mt-1.5">{s.note}</div>}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-white/40 text-xs">{c.response}</div>

        <div className="mt-12 pt-6 border-t border-white/[0.06] text-xs text-white/30 text-center">
          {c.legal}
        </div>
      </main>
    </div>
  );
}
