'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm mb-8">
          ← На главную
        </Link>

        <h1 className="text-3xl font-display font-black text-white mb-2">Политика конфиденциальности</h1>
        <p className="text-white/40 text-sm mb-8">Последнее обновление: 16 апреля 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Кто мы</h2>
            <p>
              Платформа <strong>30sec.org</strong> — интеллектуальная онлайн-игра. Оператор данных соответствует требованиям GDPR (Регламент ЕС 2016/679).
              По всем вопросам конфиденциальности: <a href="mailto:info@30sec.org" className="text-brand-400">info@30sec.org</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Какие данные мы собираем</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Обязательные</strong>: email, пароль (хешированный), никнейм, имя, фамилия</li>
              <li><strong>Опциональные</strong>: телефон, страна, язык, дата рождения, аватар</li>
              <li><strong>Игровые</strong>: ответы в турнирах, статистика, рейтинг, история участия</li>
              <li><strong>Технические</strong>: IP-адрес, данные о браузере (для защиты от атак)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Зачем мы это собираем</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Для работы сервиса (регистрация, участие в турнирах)</li>
              <li>Для защиты аккаунта (аутентификация, rate limiting)</li>
              <li>Для отображения рейтинга и статистики игрокам</li>
              <li>Для отправки email-уведомлений о турнирах (можно отключить)</li>
              <li>Для отслеживания технических ошибок (Sentry)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. С кем мы делимся данными</h2>
            <p>Мы <strong>не продаём и не передаём</strong> ваши персональные данные третьим лицам. Исключения:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Hetzner</strong> (Германия) — хостинг серверов</li>
              <li><strong>Sentry</strong> (Германия) — мониторинг ошибок (только технические данные)</li>
              <li>Государственные органы по законному запросу</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Хранение данных</h2>
            <p>Все данные хранятся на серверах в Германии (ЕС). Пароли хешируются алгоритмом bcrypt. Ежедневные резервные копии хранятся 7 дней.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Ваши права (GDPR)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Право на доступ</strong>: скачать все ваши данные в настройках профиля</li>
              <li><strong>Право на исправление</strong>: изменить профиль в любой момент</li>
              <li><strong>Право на удаление</strong>: удалить аккаунт в настройках профиля</li>
              <li><strong>Право на ограничение обработки</strong>: отключить уведомления</li>
              <li><strong>Право на жалобу</strong>: в контролирующий орган вашей страны</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Cookies</h2>
            <p>Мы используем только необходимые cookies для аутентификации (JWT токены). Аналитических или рекламных cookies нет.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Изменения политики</h2>
            <p>При существенных изменениях мы уведомим вас по email. Дата последнего обновления указана в начале страницы.</p>
          </section>

          <section className="mt-8 pt-8 border-t border-white/10">
            <p className="text-white/40">Связаться с нами: <a href="mailto:info@30sec.org" className="text-brand-400">info@30sec.org</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
