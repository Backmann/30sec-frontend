'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm mb-8">
          ← На главную
        </Link>

        <h1 className="text-3xl font-display font-black text-white mb-2">Условия использования</h1>
        <p className="text-white/40 text-sm mb-8">Последнее обновление: 16 апреля 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Соглашение</h2>
            <p>
              Используя платформу <strong>30sec.org</strong>, вы соглашаетесь с этими условиями. Если вы не согласны — пожалуйста, не используйте сервис.
              Возраст пользователя: от 16 лет.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Описание сервиса</h2>
            <p>
              30sec.org — интеллектуальная онлайн-игра в формате турниров, где участники отвечают на вопросы за 30 секунд.
              Сервис предоставляется бесплатно и в познавательно-развлекательных целях.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Регистрация и аккаунт</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Вы обязаны предоставлять правдивую информацию при регистрации</li>
              <li>Один человек — один аккаунт. Множественные аккаунты могут быть заблокированы</li>
              <li>Вы несёте ответственность за сохранность пароля</li>
              <li>Запрещено передавать доступ к аккаунту третьим лицам</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Правила поведения</h2>
            <p>Запрещено:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Мошенничество, читинг, использование внешних источников во время турнира</li>
              <li>Оскорбления, угрозы, дискриминация других пользователей</li>
              <li>Спам, реклама без согласования</li>
              <li>Попытки взлома, DDoS, обход rate limiting</li>
              <li>Автоматизация действий с помощью ботов или скриптов</li>
              <li>Нарушение авторских прав при загрузке контента</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Контент пользователя</h2>
            <p>
              Вы сохраняете все права на контент, который загружаете (никнейм, комментарии, ответы).
              Размещая контент, вы предоставляете нам неисключительную лицензию на его отображение на платформе.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Модерация</h2>
            <p>
              Мы оставляем за собой право удалять контент и блокировать аккаунты, нарушающие эти условия, без предварительного уведомления.
              В случае бана средства не возвращаются (сервис бесплатный).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Ограничение ответственности</h2>
            <p>
              Сервис предоставляется «как есть». Мы не гарантируем бесперебойную работу, отсутствие ошибок или сохранность данных бессрочно.
              Максимальная ответственность ограничена суммой, уплаченной пользователем за последние 12 месяцев (для бесплатного сервиса — €0).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Прекращение использования</h2>
            <p>
              Вы можете удалить аккаунт в любой момент через настройки профиля.
              Мы можем прекратить предоставление сервиса с уведомлением за 30 дней.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Применимое право</h2>
            <p>Эти условия регулируются законодательством Германии. Все споры решаются в судах Германии.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Изменения</h2>
            <p>Мы можем изменять условия. Существенные изменения будут сопровождаться уведомлением по email за 14 дней.</p>
          </section>

          <section className="mt-8 pt-8 border-t border-white/10">
            <p className="text-white/40">
              Политика конфиденциальности: <Link href="/privacy" className="text-brand-400">30sec.org/privacy</Link>
            </p>
            <p className="text-white/40 mt-2">
              Связаться: <a href="mailto:info@30sec.org" className="text-brand-400">info@30sec.org</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
