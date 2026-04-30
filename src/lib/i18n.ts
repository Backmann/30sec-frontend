export const translations = {
  ru: {
    common: { loading: 'Загрузка...', error: 'Ошибка', back: 'Назад', save: 'Сохранить', cancel: 'Отмена', or: 'или' },
    auth: {
      login: 'Войти', register: 'Регистрация', email: 'Email', password: 'Пароль',
      firstName: 'Имя', lastName: 'Фамилия', nickname: 'Псевдоним',
      noAccount: 'Нет аккаунта?', hasAccount: 'Уже есть аккаунт?',
      loginBtn: 'Войти', registerBtn: 'Создать аккаунт',
      nicknamePlaceholder: 'Только латинские буквы, цифры, _ и -',
    },
    nav: { home: 'Главная', tournaments: 'Турниры', leaderboard: 'Рейтинг', profile: 'Профиль', admin: 'Админ', logout: 'Выйти' },
    home: { welcome: 'Добро пожаловать', subtitle: '30 секунд. Один ответ. Ты готов?', play: 'Играть', watch: 'Смотреть' },
    game: {
      score: 'Счёт', you: 'Ты', system: 'Система', question: 'Вопрос',
      answer: 'Ваш ответ', submit: 'Ответить', timeLeft: 'Осталось',
      correct: 'Верно!', wrong: 'Не верно', waiting: 'Ожидание проверки...',
      won: 'Победа!', lost: 'Поражение', matchEnd: 'Матч завершён',
    },
    tournament: {
      join: 'Участвовать', live: 'LIVE', draft: 'Черновик', finished: 'Завершён',
      players: 'Игроки', questions: 'Вопросы', noTournaments: 'Нет турниров',
    },
    admin: {
      dashboard: 'Дашборд', tournaments: 'Турниры', questions: 'Вопросы',
      users: 'Пользователи', logs: 'Журнал', create: 'Создать',
      start: 'Запустить', finish: 'Завершить', judge: 'Оценить',
      accepted: 'Засчитать', rejected: 'Отклонить',
    },
  },
  de: {
    common: { loading: 'Laden...', error: 'Fehler', back: 'Zurück', save: 'Speichern', cancel: 'Abbrechen', or: 'oder' },
    auth: {
      login: 'Anmelden', register: 'Registrieren', email: 'E-Mail', password: 'Passwort',
      firstName: 'Vorname', lastName: 'Nachname', nickname: 'Spielername',
      noAccount: 'Kein Konto?', hasAccount: 'Bereits registriert?',
      loginBtn: 'Anmelden', registerBtn: 'Konto erstellen',
      nicknamePlaceholder: 'Nur lateinische Buchstaben, Zahlen, _ und -',
    },
    nav: { home: 'Start', tournaments: 'Turniere', leaderboard: 'Rangliste', profile: 'Profil', admin: 'Admin', logout: 'Abmelden' },
    home: { welcome: 'Willkommen', subtitle: '30 Sekunden. Eine Antwort. Bist du bereit?', play: 'Spielen', watch: 'Zuschauen' },
    game: {
      score: 'Punktestand', you: 'Du', system: 'System', question: 'Frage',
      answer: 'Deine Antwort', submit: 'Antworten', timeLeft: 'Verbleibend',
      correct: 'Richtig!', wrong: 'Falsch', waiting: 'Warte auf Bewertung...',
      won: 'Gewonnen!', lost: 'Verloren', matchEnd: 'Spiel beendet',
    },
    tournament: {
      join: 'Teilnehmen', live: 'LIVE', draft: 'Entwurf', finished: 'Beendet',
      players: 'Spieler', questions: 'Fragen', noTournaments: 'Keine Turniere',
    },
    admin: {
      dashboard: 'Dashboard', tournaments: 'Turniere', questions: 'Fragen',
      users: 'Benutzer', logs: 'Protokoll', create: 'Erstellen',
      start: 'Starten', finish: 'Beenden', judge: 'Bewerten',
      accepted: 'Akzeptieren', rejected: 'Ablehnen',
    },
  },
  en: {
    common: { loading: 'Loading...', error: 'Error', back: 'Back', save: 'Save', cancel: 'Cancel', or: 'or' },
    auth: {
      login: 'Login', register: 'Register', email: 'Email', password: 'Password',
      firstName: 'First name', lastName: 'Last name', nickname: 'Nickname',
      noAccount: 'No account?', hasAccount: 'Already have an account?',
      loginBtn: 'Sign in', registerBtn: 'Create account',
      nicknamePlaceholder: 'Latin letters, numbers, _ and - only',
    },
    nav: { home: 'Home', tournaments: 'Tournaments', leaderboard: 'Leaderboard', profile: 'Profile', admin: 'Admin', logout: 'Logout' },
    home: { welcome: 'Welcome', subtitle: '30 seconds. One answer. Are you ready?', play: 'Play', watch: 'Watch' },
    game: {
      score: 'Score', you: 'You', system: 'System', question: 'Question',
      answer: 'Your answer', submit: 'Submit', timeLeft: 'Time left',
      correct: 'Correct!', wrong: 'Wrong', waiting: 'Waiting for judgement...',
      won: 'You won!', lost: 'You lost', matchEnd: 'Match over',
    },
    tournament: {
      join: 'Join', live: 'LIVE', draft: 'Draft', finished: 'Finished',
      players: 'Players', questions: 'Questions', noTournaments: 'No tournaments',
    },
    admin: {
      dashboard: 'Dashboard', tournaments: 'Tournaments', questions: 'Questions',
      users: 'Users', logs: 'Logs', create: 'Create',
      start: 'Start', finish: 'Finish', judge: 'Judge',
      accepted: 'Accept', rejected: 'Reject',
    },
  },
};

export type Locale = keyof typeof translations;

export function getTranslation(locale: Locale) {
  return translations[locale] || translations.ru;
}

export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  const saved = localStorage.getItem('locale');
  if (saved && saved in translations) return saved as Locale;
  const browserLang = navigator.language.slice(0, 2);
  if (browserLang in translations) return browserLang as Locale;
  return 'ru';
}
