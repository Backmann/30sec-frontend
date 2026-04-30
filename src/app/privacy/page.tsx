'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { detectLocale, type Locale } from '@/lib/i18n';

const CONTENT: Record<string, any> = {
  ru: {
    title: 'Политика конфиденциальности',
    lastUpdated: 'Последнее обновление: 25 апреля 2026',
    effective: 'Дата вступления в силу: 25 апреля 2026',
    sections: [
      {
        h: '1. Общая информация',
        p: 'Мы серьёзно относимся к защите ваших персональных данных. Эта политика описывает какие данные мы собираем, зачем, как храним и какие права у вас есть в отношении ваших данных в соответствии с GDPR (General Data Protection Regulation) и немецким законодательством (BDSG).'
      },
      {
        h: '2. Кто собирает данные',
        p: '30sec.org — игровая платформа на стадии закрытого бета-тестирования. На данный момент проект работает как некоммерческий хобби-проект. Контакт по вопросам данных: contact@30sec.org'
      },
      {
        h: '3. Какие данные мы собираем',
        bullets: [
          'При регистрации: email, пароль (хранится только в виде хеша argon2), никнейм',
          'Опционально в профиле: имя/фамилия, дата рождения, пол, страна, город, аватар, биография, телефон',
          'Согласия GDPR с временными метками (Terms, Privacy, маркетинг)',
          'Игровая статистика: ответы, голоса, история турниров, ранг, достижения',
          'Автоматически: IP-адрес, User-Agent (браузер, ОС, устройство), приблизительная геолокация по IP, временные метки активности'
        ]
      },
      {
        h: '4. Зачем мы собираем данные (правовая основа)',
        bullets: [
          'Email и пароль: для авторизации (Art. 6(1)(b) GDPR — выполнение договора)',
          'Профиль и игровая статистика: для предоставления услуги (Art. 6(1)(b))',
          'IP и активность: для безопасности и предотвращения злоупотреблений (Art. 6(1)(f) — законный интерес)',
          'Маркетинговые рассылки: только при явном согласии (Art. 6(1)(a))'
        ]
      },
      {
        h: '5. Как долго мы храним данные',
        bullets: [
          'Активный аккаунт: пока вы им пользуетесь',
          'После удаления аккаунта: личные данные удаляются в течение 30 дней',
          'Игровые результаты: анонимизируются (без email и имени) и сохраняются для целостности рейтинга',
          'IP-адреса в журналах безопасности: до 30 дней',
          'Резервные копии БД: до 30 дней с автоматической ротацией'
        ]
      },
      {
        h: '6. Третьи стороны (обработчики данных)',
        p: 'Для работы платформы мы используем следующие сервисы (data processors):',
        bullets: [
          'Hetzner Online GmbH (Германия) — хостинг серверов',
          'Cloudflare, Inc. (США) — DNS, CDN, защита от DDoS. Cloudflare обрабатывает данные согласно стандартным контрактным положениям EU',
          'Cloudflare R2 — хранение загруженных изображений',
          'Better Stack — мониторинг доступности',
          'Sentry — обнаружение ошибок приложения',
          'Если включён вход через Google — Google LLC (США) для OAuth'
        ]
      },
      {
        h: '7. Передача данных за пределы EU/EEA',
        p: 'Cloudflare и Sentry находятся в США. Передача данных осуществляется на основе Standard Contractual Clauses (SCC) одобренных Европейской Комиссией.'
      },
      {
        h: '8. Cookies и аналогичные технологии',
        bullets: [
          'Essential cookies (необходимые): accessToken, refreshToken для авторизации, Cloudflare cookies для безопасности — без них сайт не работает',
          'Не-essential cookies: на данный момент не используются',
          'Аналитика: на данный момент мы НЕ используем Google Analytics или подобные сервисы'
        ]
      },
      {
        h: '9. Ваши права (Art. 15-22 GDPR)',
        bullets: [
          'Право на доступ — узнать какие данные мы храним',
          'Право на исправление — изменить ваши данные в профиле',
          'Право на удаление — удалить аккаунт (через настройки профиля или письмом)',
          'Право на портативность — скачать свои данные в JSON формате',
          'Право на возражение — отказаться от обработки',
          'Право на отзыв согласия — отозвать согласие на маркетинг в любое время',
          'Право на жалобу — обратиться в надзорный орган по защите данных'
        ]
      },
      {
        h: '10. Безопасность',
        bullets: [
          'Пароли хешируются через argon2',
          'HTTPS-шифрование на всём сайте',
          'Rate limiting для защиты от brute-force',
          'Регулярные резервные копии',
          'Мониторинг подозрительной активности'
        ]
      },
      {
        h: '11. Дети',
        p: 'Сервис не предназначен для детей младше 16 лет. Мы не собираем сознательно данные несовершеннолетних. Если вы обнаружили что несовершеннолетний предоставил нам данные, свяжитесь с нами для удаления.'
      },
      {
        h: '12. Изменения политики',
        p: 'Мы можем обновлять эту политику. О существенных изменениях мы уведомим вас по email или через уведомление на сайте.'
      },
      {
        h: '13. Контакт',
        p: 'Вопросы и запросы по данным: contact@30sec.org. Жалобы можно подавать в надзорный орган: Landesbeauftragte für Datenschutz und Informationsfreiheit (LDI) в вашей федеральной земле.'
      }
    ]
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated: April 25, 2026',
    effective: 'Effective date: April 25, 2026',
    sections: [
      {
        h: '1. General information',
        p: 'We take the protection of your personal data seriously. This policy describes what data we collect, why, how we store it, and what rights you have regarding your data in accordance with GDPR (General Data Protection Regulation) and German law (BDSG).'
      },
      {
        h: '2. Who collects the data',
        p: '30sec.org is a gaming platform in closed beta. Currently the project operates as a non-commercial hobby project. Contact for data inquiries: contact@30sec.org'
      },
      {
        h: '3. What data we collect',
        bullets: [
          'On registration: email, password (stored only as argon2 hash), nickname',
          'Optionally in profile: first/last name, date of birth, gender, country, city, avatar, bio, phone',
          'GDPR consents with timestamps (Terms, Privacy, marketing)',
          'Game stats: answers, votes, tournament history, rank, achievements',
          'Automatically: IP address, User-Agent (browser, OS, device), approximate geolocation from IP, activity timestamps'
        ]
      },
      {
        h: '4. Why we collect data (legal basis)',
        bullets: [
          'Email and password: for authentication (Art. 6(1)(b) GDPR — contract performance)',
          'Profile and game stats: to provide the service (Art. 6(1)(b))',
          'IP and activity: for security and abuse prevention (Art. 6(1)(f) — legitimate interest)',
          'Marketing emails: only with explicit consent (Art. 6(1)(a))'
        ]
      },
      {
        h: '5. How long we keep data',
        bullets: [
          'Active account: as long as you use it',
          'After account deletion: personal data is deleted within 30 days',
          'Game results: anonymized (no email or name) and kept for ranking integrity',
          'IP addresses in security logs: up to 30 days',
          'Database backups: up to 30 days with automatic rotation'
        ]
      },
      {
        h: '6. Third parties (data processors)',
        p: 'We use the following services to run the platform:',
        bullets: [
          'Hetzner Online GmbH (Germany) — server hosting',
          'Cloudflare, Inc. (USA) — DNS, CDN, DDoS protection. Cloudflare processes data under EU Standard Contractual Clauses',
          'Cloudflare R2 — uploaded image storage',
          'Better Stack — uptime monitoring',
          'Sentry — application error tracking',
          'If Google login is used — Google LLC (USA) for OAuth'
        ]
      },
      {
        h: '7. Data transfers outside EU/EEA',
        p: 'Cloudflare and Sentry are in the USA. Data transfers happen under Standard Contractual Clauses (SCC) approved by the European Commission.'
      },
      {
        h: '8. Cookies and similar technologies',
        bullets: [
          'Essential cookies: accessToken, refreshToken for auth, Cloudflare security cookies — required for the site to work',
          'Non-essential cookies: currently not used',
          'Analytics: we currently do NOT use Google Analytics or similar'
        ]
      },
      {
        h: '9. Your rights (Art. 15-22 GDPR)',
        bullets: [
          'Right of access — know what data we hold',
          'Right to rectification — modify your data in profile',
          'Right to erasure — delete account (via profile settings or email)',
          'Right to data portability — download your data as JSON',
          'Right to object — opt out of processing',
          'Right to withdraw consent — revoke marketing consent anytime',
          'Right to lodge a complaint — contact data protection authority'
        ]
      },
      {
        h: '10. Security',
        bullets: [
          'Passwords hashed with argon2',
          'HTTPS encryption sitewide',
          'Rate limiting against brute-force',
          'Regular backups',
          'Suspicious activity monitoring'
        ]
      },
      {
        h: '11. Children',
        p: 'The service is not intended for children under 16. We do not knowingly collect data from minors. If you discover that a minor has provided us with data, contact us for removal.'
      },
      {
        h: '12. Changes to this policy',
        p: 'We may update this policy. Significant changes will be communicated via email or in-app notification.'
      },
      {
        h: '13. Contact',
        p: 'Questions and data requests: contact@30sec.org. Complaints may be filed with the supervisory authority: Landesbeauftragte für Datenschutz und Informationsfreiheit (LDI) in your federal state.'
      }
    ]
  },
  de: {
    title: 'Datenschutzerklärung',
    lastUpdated: 'Zuletzt aktualisiert: 25. April 2026',
    effective: 'Gültig ab: 25. April 2026',
    sections: [
      {
        h: '1. Allgemeine Informationen',
        p: 'Wir nehmen den Schutz Ihrer personenbezogenen Daten ernst. Diese Erklärung beschreibt, welche Daten wir erheben, wozu, wie wir sie speichern und welche Rechte Sie bezüglich Ihrer Daten gemäß DSGVO und BDSG haben.'
      },
      {
        h: '2. Wer erhebt die Daten',
        p: '30sec.org ist eine Spieleplattform in geschlossener Beta-Phase. Derzeit als nicht-kommerzielles Hobbyprojekt betrieben. Kontakt für Datenschutzanfragen: contact@30sec.org'
      },
      {
        h: '3. Welche Daten wir erheben',
        bullets: [
          'Bei Registrierung: E-Mail, Passwort (nur als argon2-Hash gespeichert), Nickname',
          'Optional im Profil: Vor-/Nachname, Geburtsdatum, Geschlecht, Land, Stadt, Avatar, Bio, Telefon',
          'DSGVO-Einwilligungen mit Zeitstempel (AGB, Datenschutz, Marketing)',
          'Spielstatistik: Antworten, Stimmen, Turnierverlauf, Rang, Erfolge',
          'Automatisch: IP-Adresse, User-Agent (Browser, OS, Gerät), ungefähre Geolokalisierung anhand der IP, Aktivitäts-Zeitstempel'
        ]
      },
      {
        h: '4. Warum wir Daten erheben (Rechtsgrundlage)',
        bullets: [
          'E-Mail und Passwort: zur Authentifizierung (Art. 6(1)(b) DSGVO — Vertragserfüllung)',
          'Profil und Spielstatistik: zur Bereitstellung des Dienstes (Art. 6(1)(b))',
          'IP und Aktivität: zur Sicherheit und Missbrauchsprävention (Art. 6(1)(f) — berechtigtes Interesse)',
          'Marketing-E-Mails: nur mit ausdrücklicher Einwilligung (Art. 6(1)(a))'
        ]
      },
      {
        h: '5. Wie lange wir Daten speichern',
        bullets: [
          'Aktives Konto: solange Sie es nutzen',
          'Nach Kontolöschung: personenbezogene Daten werden innerhalb von 30 Tagen gelöscht',
          'Spielergebnisse: anonymisiert (ohne E-Mail/Name) für Ranking-Integrität gespeichert',
          'IP-Adressen in Sicherheitsprotokollen: bis zu 30 Tage',
          'Datenbank-Backups: bis zu 30 Tage mit automatischer Rotation'
        ]
      },
      {
        h: '6. Dritte (Auftragsverarbeiter)',
        p: 'Wir nutzen folgende Dienste:',
        bullets: [
          'Hetzner Online GmbH (Deutschland) — Server-Hosting',
          'Cloudflare, Inc. (USA) — DNS, CDN, DDoS-Schutz. Verarbeitung gemäß EU-Standardvertragsklauseln',
          'Cloudflare R2 — Speicherung hochgeladener Bilder',
          'Better Stack — Verfügbarkeitsmonitoring',
          'Sentry — Anwendungsfehler-Tracking',
          'Bei Google-Login — Google LLC (USA) für OAuth'
        ]
      },
      {
        h: '7. Datenübermittlung außerhalb EU/EWR',
        p: 'Cloudflare und Sentry befinden sich in den USA. Übermittlung erfolgt auf Basis der von der EU-Kommission genehmigten Standardvertragsklauseln (SCC).'
      },
      {
        h: '8. Cookies und ähnliche Technologien',
        bullets: [
          'Essentielle Cookies: accessToken, refreshToken für Authentifizierung, Cloudflare-Sicherheitscookies — für den Betrieb erforderlich',
          'Nicht-essentielle Cookies: derzeit nicht verwendet',
          'Analyse: wir nutzen aktuell KEIN Google Analytics oder Vergleichbares'
        ]
      },
      {
        h: '9. Ihre Rechte (Art. 15-22 DSGVO)',
        bullets: [
          'Auskunftsrecht — welche Daten wir speichern',
          'Recht auf Berichtigung — Profildaten ändern',
          'Recht auf Löschung — Konto löschen (Einstellungen oder per Mail)',
          'Recht auf Datenübertragbarkeit — Daten als JSON herunterladen',
          'Widerspruchsrecht',
          'Widerruf der Einwilligung — jederzeit möglich',
          'Beschwerderecht bei der Datenschutzbehörde'
        ]
      },
      {
        h: '10. Sicherheit',
        bullets: [
          'Passwörter mit argon2 gehasht',
          'HTTPS-Verschlüsselung auf der gesamten Seite',
          'Rate-Limiting gegen Brute-Force',
          'Regelmäßige Backups',
          'Überwachung verdächtiger Aktivitäten'
        ]
      },
      {
        h: '11. Kinder',
        p: 'Der Dienst richtet sich nicht an Kinder unter 16 Jahren. Wir erheben wissentlich keine Daten von Minderjährigen. Sollten Sie davon Kenntnis erlangen, kontaktieren Sie uns zur Löschung.'
      },
      {
        h: '12. Änderungen dieser Richtlinie',
        p: 'Wir können diese Richtlinie aktualisieren. Wesentliche Änderungen teilen wir per E-Mail oder Benachrichtigung mit.'
      },
      {
        h: '13. Kontakt',
        p: 'Fragen und Datenanfragen: contact@30sec.org. Beschwerden bei der zuständigen Aufsichtsbehörde: Landesbeauftragte für Datenschutz und Informationsfreiheit (LDI) Ihres Bundeslandes.'
      }
    ]
  }
};

export default function PrivacyPage() {
  const [locale, setLocale] = useState<Locale>('ru');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setLocale(detectLocale()); setMounted(true); }, []);
  if (!mounted) return null;

  const c = CONTENT[locale] || CONTENT.ru;

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{c.title}</h1>
        <div className="text-xs text-white/30 mb-8 space-y-0.5">
          <div>{c.lastUpdated}</div>
          <div>{c.effective}</div>
        </div>

        {locale !== 'ru' && (
          <div className="mb-8 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 px-4 py-3 text-xs text-amber-300/90 leading-relaxed">
            {locale === 'en' ? (
              <>
                <span className="font-semibold">Translation notice.</span> This English version is provided for convenience only. The Russian version is the legally binding one. In case of any discrepancy, the Russian version prevails.
              </>
            ) : (
              <>
                <span className="font-semibold">Übersetzungshinweis.</span> Diese deutsche Fassung dient nur der Information. Rechtlich verbindlich ist ausschließlich die russische Fassung. Bei Abweichungen gilt die russische Fassung.
              </>
            )}
          </div>
        )}

        <div className="space-y-7">
          {c.sections.map((s: any, i: number) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-white mb-2">{s.h}</h2>
              {s.p && <p className="text-white/70 leading-relaxed text-sm">{s.p}</p>}
              {s.bullets && (
                <ul className="space-y-1.5 mt-2">
                  {s.bullets.map((b: string, bi: number) => (
                    <li key={bi} className="text-white/70 text-sm leading-relaxed pl-4 relative">
                      <span className="absolute left-0 top-2 w-1 h-1 rounded-full bg-brand-500/60" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-white/[0.06] text-xs text-white/30">
          © 2026 30sec.org · contact@30sec.org
        </div>
      </main>
    </div>
  );
}
