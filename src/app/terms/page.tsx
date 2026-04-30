'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { detectLocale, type Locale } from '@/lib/i18n';

const CONTENT: Record<string, any> = {
  ru: {
    title: 'Условия использования',
    lastUpdated: 'Последнее обновление: 25 апреля 2026',
    effective: 'Дата вступления в силу: 25 апреля 2026',
    sections: [
      {
        h: '1. Общие положения',
        p: 'Используя сервис 30sec.org, вы соглашаетесь с настоящими условиями. Сервис предоставляется как есть, на стадии закрытого бета-тестирования. Мы оставляем за собой право изменять функциональность, прерывать работу и обновлять условия.'
      },
      {
        h: '2. Описание сервиса',
        p: '30sec.org — игровая платформа для интеллектуальных турниров. Игроки отвечают на вопросы, голосуют за лучшие, получают рейтинг и достижения. Сервис в данный момент работает как некоммерческий хобби-проект в режиме closed beta.'
      },
      {
        h: '3. Регистрация и аккаунт',
        bullets: [
          'Для регистрации необходимо быть старше 16 лет',
          'Один человек — один аккаунт. Множественные аккаунты запрещены',
          'Вы несёте ответственность за конфиденциальность вашего пароля',
          'При обнаружении несанкционированного доступа немедленно сообщите нам'
        ]
      },
      {
        h: '4. Правила поведения',
        p: 'Запрещено:',
        bullets: [
          'Оскорбления, угрозы, дискриминация других игроков',
          'Использование ботов, скриптов, автоматизации',
          'Создание контента (вопросов) сексуального, экстремистского или иного незаконного характера',
          'Попытки взлома, эксплуатации уязвимостей, DDoS',
          'Реклама, спам, фишинг',
          'Нарушение авторских прав в загружаемом контенте',
          'Выдача себя за другое лицо'
        ]
      },
      {
        h: '5. Контент пользователей',
        bullets: [
          'Загружая контент (вопросы, изображения, аватар, биография), вы заявляете что у вас есть права на его публикацию',
          'Вы предоставляете нам неисключительную лицензию на отображение и обработку контента в рамках сервиса',
          'Мы оставляем право удалить любой контент нарушающий правила без предварительного уведомления',
          'Контент пользователей не отражает позицию администрации'
        ]
      },
      {
        h: '6. Модерация и санкции',
        bullets: [
          'Администрация модерирует контент и поведение игроков',
          'За нарушения возможны: предупреждение, временная блокировка, перманентная блокировка аккаунта, удаление контента',
          'Решения модерации не подлежат пересмотру в одностороннем порядке'
        ]
      },
      {
        h: '7. Закрытое бета-тестирование',
        bullets: [
          'Сервис находится в активной разработке',
          'Возможны технические сбои, потеря данных, изменения функционала',
          'Игровая статистика и рейтинги могут быть сброшены при необходимости',
          'Мы оставляем право в любой момент закрыть бета-тест и/или весь проект'
        ]
      },
      {
        h: '8. Интеллектуальная собственность',
        bullets: [
          'Платформа 30sec.org, дизайн, логотип, исходный код принадлежат владельцу проекта',
          'Концепция игры (отвечать на вопросы за 30 секунд, голосование за лучший вопрос) свободна для использования другими',
          'Изображения и тексты вопросов — права остаются за их авторами'
        ]
      },
      {
        h: '9. Отказ от гарантий',
        p: 'Сервис предоставляется КАК ЕСТЬ без каких-либо гарантий — явных или подразумеваемых. Мы не гарантируем непрерывную работу, точность данных, отсутствие ошибок. В максимальной степени допустимой законом, мы не несём ответственности за прямой или косвенный ущерб от использования сервиса.'
      },
      {
        h: '10. Удаление аккаунта',
        bullets: [
          'Вы можете удалить аккаунт в любой момент через настройки профиля',
          'Удаление приводит к анонимизации данных в течение 30 дней',
          'Игровая история сохраняется в анонимном виде для целостности рейтинга',
          'Мы можем удалить ваш аккаунт за грубые нарушения правил без возврата'
        ]
      },
      {
        h: '11. Изменения условий',
        p: 'Мы можем обновлять эти условия. О существенных изменениях вы будете уведомлены по email или через сайт. Продолжение использования сервиса после изменений означает согласие с новыми условиями.'
      },
      {
        h: '12. Применимое право',
        p: 'Настоящие условия регулируются правом Федеративной Республики Германии. Все споры подлежат рассмотрению в компетентных судах Германии.'
      },
      {
        h: '13. Контакт',
        p: 'По всем вопросам: contact@30sec.org'
      }
    ]
  },
  en: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated: April 25, 2026',
    effective: 'Effective date: April 25, 2026',
    sections: [
      {
        h: '1. General provisions',
        p: 'By using 30sec.org, you agree to these terms. The service is provided as is, in closed beta. We reserve the right to modify functionality, interrupt operation and update terms.'
      },
      {
        h: '2. Service description',
        p: '30sec.org is a gaming platform for intellectual tournaments. Players answer questions, vote for the best ones, earn rankings and achievements. Currently operates as a non-commercial hobby project in closed beta.'
      },
      {
        h: '3. Registration and account',
        bullets: [
          'You must be 16 or older to register',
          'One person — one account. Multiple accounts are prohibited',
          'You are responsible for your password confidentiality',
          'Notify us immediately of unauthorized access'
        ]
      },
      {
        h: '4. Code of conduct',
        p: 'Prohibited:',
        bullets: [
          'Insults, threats, discrimination of other players',
          'Use of bots, scripts, automation',
          'Creating content (questions) of sexual, extremist or otherwise illegal nature',
          'Hacking attempts, exploiting vulnerabilities, DDoS',
          'Advertising, spam, phishing',
          'Copyright infringement in uploaded content',
          'Impersonation'
        ]
      },
      {
        h: '5. User content',
        bullets: [
          'By uploading content (questions, images, avatar, bio) you confirm you have rights to publish it',
          'You grant us a non-exclusive license to display and process content within the service',
          'We reserve the right to remove any content violating rules without prior notice',
          'User content does not reflect the position of administration'
        ]
      },
      {
        h: '6. Moderation and sanctions',
        bullets: [
          'Administration moderates content and player behavior',
          'Possible sanctions: warning, temporary or permanent ban, content removal',
          'Moderation decisions are final'
        ]
      },
      {
        h: '7. Closed beta testing',
        bullets: [
          'The service is under active development',
          'Technical issues, data loss, feature changes are possible',
          'Game statistics and rankings may be reset if necessary',
          'We reserve the right to close the beta or entire project at any time'
        ]
      },
      {
        h: '8. Intellectual property',
        bullets: [
          '30sec.org platform, design, logo, source code belong to the project owner',
          'The game concept (30-second answers, voting for best question) is free for others to use',
          'Question images and texts — rights remain with their authors'
        ]
      },
      {
        h: '9. Disclaimer of warranties',
        p: 'The service is provided AS IS without any warranties — express or implied. We do not guarantee continuous operation, data accuracy, absence of errors. To the maximum extent permitted by law, we are not liable for direct or indirect damages from using the service.'
      },
      {
        h: '10. Account deletion',
        bullets: [
          'You can delete your account anytime through profile settings',
          'Deletion leads to data anonymization within 30 days',
          'Game history is kept in anonymous form for ranking integrity',
          'We may delete your account for serious rule violations without refund'
        ]
      },
      {
        h: '11. Changes to terms',
        p: 'We may update these terms. Significant changes will be communicated via email or site notification. Continued use after changes means agreement with new terms.'
      },
      {
        h: '12. Governing law',
        p: 'These terms are governed by the law of the Federal Republic of Germany. All disputes are subject to the competent courts of Germany.'
      },
      {
        h: '13. Contact',
        p: 'For all inquiries: contact@30sec.org'
      }
    ]
  },
  de: {
    title: 'Nutzungsbedingungen',
    lastUpdated: 'Zuletzt aktualisiert: 25. April 2026',
    effective: 'Gültig ab: 25. April 2026',
    sections: [
      {
        h: '1. Allgemeine Bestimmungen',
        p: 'Durch die Nutzung von 30sec.org erklären Sie Ihr Einverständnis mit diesen Bedingungen. Der Dienst wird wie er ist in geschlossener Beta-Phase angeboten. Wir behalten uns das Recht vor, die Funktionalität zu ändern, den Betrieb zu unterbrechen und die Bedingungen zu aktualisieren.'
      },
      {
        h: '2. Beschreibung des Dienstes',
        p: '30sec.org ist eine Spieleplattform für Intelligenzturniere. Spieler beantworten Fragen, stimmen für die besten ab, erhalten Ranglisten und Erfolge. Derzeit als nicht-kommerzielles Hobbyprojekt in geschlossener Beta-Phase betrieben.'
      },
      {
        h: '3. Registrierung und Konto',
        bullets: [
          'Mindestalter zur Registrierung: 16 Jahre',
          'Eine Person — ein Konto. Mehrfachkonten sind verboten',
          'Sie sind für die Vertraulichkeit Ihres Passworts verantwortlich',
          'Bei unbefugtem Zugriff benachrichtigen Sie uns umgehend'
        ]
      },
      {
        h: '4. Verhaltensregeln',
        p: 'Verboten:',
        bullets: [
          'Beleidigungen, Drohungen, Diskriminierung anderer Spieler',
          'Verwendung von Bots, Skripten, Automatisierung',
          'Erstellung von Inhalten (Fragen) sexueller, extremistischer oder anderweitig illegaler Art',
          'Hacking-Versuche, Ausnutzung von Schwachstellen, DDoS',
          'Werbung, Spam, Phishing',
          'Verletzung von Urheberrechten in hochgeladenen Inhalten',
          'Identitätsbetrug'
        ]
      },
      {
        h: '5. Nutzerinhalte',
        bullets: [
          'Beim Hochladen von Inhalten (Fragen, Bilder, Avatar, Bio) bestätigen Sie, dass Sie zur Veröffentlichung berechtigt sind',
          'Sie gewähren uns eine nicht-exklusive Lizenz zur Anzeige und Verarbeitung der Inhalte im Rahmen des Dienstes',
          'Wir behalten uns das Recht vor, regelwidrige Inhalte ohne Vorankündigung zu entfernen',
          'Nutzerinhalte spiegeln nicht die Meinung der Administration wider'
        ]
      },
      {
        h: '6. Moderation und Sanktionen',
        bullets: [
          'Die Administration moderiert Inhalte und Spielerverhalten',
          'Mögliche Sanktionen: Verwarnung, temporäre oder dauerhafte Sperre, Entfernung von Inhalten',
          'Moderationsentscheidungen sind endgültig'
        ]
      },
      {
        h: '7. Geschlossener Beta-Test',
        bullets: [
          'Der Dienst befindet sich in aktiver Entwicklung',
          'Technische Störungen, Datenverlust, Funktionsänderungen sind möglich',
          'Spielstatistiken und Ranglisten können bei Bedarf zurückgesetzt werden',
          'Wir behalten uns das Recht vor, die Beta oder das gesamte Projekt jederzeit zu beenden'
        ]
      },
      {
        h: '8. Geistiges Eigentum',
        bullets: [
          'Die Plattform 30sec.org, Design, Logo, Quellcode gehören dem Projektinhaber',
          'Das Spielkonzept (30-Sekunden-Antworten, Abstimmung für beste Frage) ist frei verwendbar',
          'Fragen-Bilder und -Texte — Rechte verbleiben bei den Autoren'
        ]
      },
      {
        h: '9. Haftungsausschluss',
        p: 'Der Dienst wird WIE ER IST ohne jegliche Gewährleistung bereitgestellt — weder ausdrücklich noch stillschweigend. Wir garantieren keinen kontinuierlichen Betrieb, keine Datengenauigkeit, keine Fehlerfreiheit. Im gesetzlich maximal zulässigen Umfang haften wir nicht für direkte oder indirekte Schäden durch die Nutzung des Dienstes.'
      },
      {
        h: '10. Kontolöschung',
        bullets: [
          'Sie können Ihr Konto jederzeit über die Profileinstellungen löschen',
          'Löschung führt zu Anonymisierung der Daten innerhalb von 30 Tagen',
          'Spielverlauf wird anonymisiert für Ranking-Integrität gespeichert',
          'Wir können Ihr Konto bei schweren Regelverstößen ohne Erstattung löschen'
        ]
      },
      {
        h: '11. Änderungen der Bedingungen',
        p: 'Wir können diese Bedingungen aktualisieren. Wesentliche Änderungen werden per E-Mail oder Benachrichtigung mitgeteilt. Fortgesetzte Nutzung nach Änderungen bedeutet Zustimmung.'
      },
      {
        h: '12. Anwendbares Recht',
        p: 'Diese Bedingungen unterliegen dem Recht der Bundesrepublik Deutschland. Alle Streitigkeiten unterliegen den zuständigen Gerichten Deutschlands.'
      },
      {
        h: '13. Kontakt',
        p: 'Bei allen Fragen: contact@30sec.org'
      }
    ]
  }
};

export default function TermsPage() {
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
