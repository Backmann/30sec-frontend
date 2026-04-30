'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { detectLocale, Locale } from '@/lib/i18n';

const CATEGORIES_BY_LOCALE: Record<Locale, { value: string; label: string; desc: string }[]> = {
  ru: [
    { value: 'bug', label: '🐛 Баг', desc: 'Что-то работает не так' },
    { value: 'suggestion', label: '💡 Предложение', desc: 'Идея для улучшения' },
    { value: 'question', label: '❓ Вопрос', desc: 'Не понимаю как работает' },
    { value: 'other', label: '💬 Другое', desc: 'Любые мысли' },
  ],
  en: [
    { value: 'bug', label: '🐛 Bug', desc: 'Something is not working' },
    { value: 'suggestion', label: '💡 Suggestion', desc: 'Idea for improvement' },
    { value: 'question', label: '❓ Question', desc: 'I don\'t understand how it works' },
    { value: 'other', label: '💬 Other', desc: 'Any thoughts' },
  ],
  de: [
    { value: 'bug', label: '🐛 Bug', desc: 'Etwas funktioniert nicht' },
    { value: 'suggestion', label: '💡 Vorschlag', desc: 'Idee zur Verbesserung' },
    { value: 'question', label: '❓ Frage', desc: 'Ich verstehe nicht, wie es funktioniert' },
    { value: 'other', label: '💬 Sonstiges', desc: 'Beliebige Gedanken' },
  ],
};

const FB_STR: Record<Locale, {
  reportProblem: string;
  feedback: string;
  feedbackTitle: string;
  thanks: string;
  receivedMsg: string;
  introText: string;
  messageType: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  emailLabel: string;
  emailHint: string;
  sendingFrom: string;
  sending: string;
  send: string;
  errSubjectShort: string;
  errMessageShort: string;
  errEmailRequired: string;
  errSendFailed: string;
}> = {
  ru: {
    reportProblem: 'Сообщить о проблеме',
    feedback: 'Обратная связь',
    feedbackTitle: 'Обратная связь',
    thanks: 'Спасибо!',
    receivedMsg: 'Мы получили ваше сообщение.',
    introText: 'Помогите сделать 30sec лучше. Опишите что произошло — мы обязательно прочитаем.',
    messageType: 'Тип сообщения',
    subjectLabel: 'Тема',
    subjectPlaceholder: 'Кратко: что произошло?',
    messageLabel: 'Сообщение',
    messagePlaceholder: 'Подробно опишите: что делали, что ожидали, что произошло. Чем больше деталей — тем лучше.',
    emailLabel: 'Email',
    emailHint: '(чтобы мы могли ответить)',
    sendingFrom: 'Отправляется от имени',
    sending: 'Отправляем...',
    send: 'Отправить',
    errSubjectShort: 'Тема: минимум 3 символа',
    errMessageShort: 'Сообщение: минимум 10 символов',
    errEmailRequired: 'Укажите email чтобы мы могли ответить',
    errSendFailed: 'Не удалось отправить',
  },
  en: {
    reportProblem: 'Report a problem',
    feedback: 'Feedback',
    feedbackTitle: 'Feedback',
    thanks: 'Thank you!',
    receivedMsg: 'We received your message.',
    introText: 'Help make 30sec better. Describe what happened — we will read it for sure.',
    messageType: 'Message type',
    subjectLabel: 'Subject',
    subjectPlaceholder: 'In short: what happened?',
    messageLabel: 'Message',
    messagePlaceholder: 'Describe in detail: what you were doing, what you expected, what happened. The more details — the better.',
    emailLabel: 'Email',
    emailHint: '(so we can reply)',
    sendingFrom: 'Sending as',
    sending: 'Sending...',
    send: 'Send',
    errSubjectShort: 'Subject: minimum 3 characters',
    errMessageShort: 'Message: minimum 10 characters',
    errEmailRequired: 'Please provide an email so we can reply',
    errSendFailed: 'Could not send',
  },
  de: {
    reportProblem: 'Problem melden',
    feedback: 'Feedback',
    feedbackTitle: 'Feedback',
    thanks: 'Danke!',
    receivedMsg: 'Wir haben deine Nachricht erhalten.',
    introText: 'Hilf, 30sec besser zu machen. Beschreibe, was passiert ist — wir werden es lesen.',
    messageType: 'Nachrichtentyp',
    subjectLabel: 'Betreff',
    subjectPlaceholder: 'Kurz: was ist passiert?',
    messageLabel: 'Nachricht',
    messagePlaceholder: 'Beschreibe ausführlich: was du getan hast, was du erwartet hast, was passiert ist. Je mehr Details — desto besser.',
    emailLabel: 'E-Mail',
    emailHint: '(damit wir antworten können)',
    sendingFrom: 'Gesendet als',
    sending: 'Senden...',
    send: 'Senden',
    errSubjectShort: 'Betreff: mindestens 3 Zeichen',
    errMessageShort: 'Nachricht: mindestens 10 Zeichen',
    errEmailRequired: 'Bitte E-Mail angeben, damit wir antworten können',
    errSendFailed: 'Senden fehlgeschlagen',
  },
};

export default function FeedbackButton() {
  const { user } = useAuth();
  const [locale, setLocale] = useState<Locale>('ru');
  useEffect(() => { setLocale(detectLocale()); }, []);
  const fb = FB_STR[locale];
  const CATEGORIES = CATEGORIES_BY_LOCALE[locale];
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCategory('bug');
      setSubject('');
      setMessage('');
      setEmail('');
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const submit = async () => {
    setError(null);
    if (subject.trim().length < 3) { setError(fb.errSubjectShort); return; }
    if (message.trim().length < 10) { setError(fb.errMessageShort); return; }
    if (!user && !email.trim()) { setError(fb.errEmailRequired); return; }

    setSubmitting(true);
    try {
      await api.submitFeedback({
        category: category as any,
        subject: subject.trim(),
        message: message.trim(),
        email: !user ? email.trim() : undefined,
        url: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
      setSuccess(true);
      setTimeout(() => setOpen(false), 2000);
    } catch (e: any) {
      setError(e?.message || fb.errSendFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 sm:w-auto sm:h-11 sm:px-4 rounded-full bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 transition group"
        title={fb.reportProblem}
        aria-label={fb.feedback}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        <span className="hidden sm:inline text-sm font-semibold">{fb.feedback}</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-dark-800 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up"
          >
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-dark-800 z-10">
              <h3 className="text-lg font-bold text-white">{fb.feedbackTitle}</h3>
              <button
                onClick={() => !submitting && setOpen(false)}
                disabled={submitting}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center"
              >✕</button>
            </div>

            <div className="p-5">
              {success ? (
                <div className="text-center py-6 animate-fade-in">
                  <div className="text-5xl mb-3">✓</div>
                  <div className="text-xl font-bold text-green-400 mb-2">{fb.thanks}</div>
                  <div className="text-white/50 text-sm">{fb.receivedMsg}</div>
                </div>
              ) : (
                <>
                  <div className="text-white/50 text-xs mb-4 leading-relaxed">
                    {fb.introText}
                  </div>

                  {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Category */}
                  <div className="mb-4">
                    <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">{fb.messageType}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setCategory(c.value)}
                          className={`text-left p-3 rounded-xl border transition ${
                            category === c.value
                              ? 'bg-brand-500/10 border-brand-500/40 text-white'
                              : 'bg-white/[0.02] border-white/[0.06] text-white/70 hover:border-white/15'
                          }`}
                        >
                          <div className="font-semibold text-sm">{c.label}</div>
                          <div className="text-[10px] text-white/40 mt-0.5">{c.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="mb-4">
                    <label className="input-label">{fb.subjectLabel}</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value.slice(0, 120))}
                      maxLength={120}
                      placeholder={fb.subjectPlaceholder}
                      className="input-field"
                      disabled={submitting}
                    />
                  </div>

                  {/* Message */}
                  <div className="mb-4">
                    <label className="input-label">
                      {fb.messageLabel} <span className="text-white/30">({message.length}/3000)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value.slice(0, 3000))}
                      placeholder={fb.messagePlaceholder}
                      rows={6}
                      className="input-field resize-y min-h-[120px]"
                      disabled={submitting}
                    />
                  </div>

                  {/* Email (only if not logged in) */}
                  {!user && (
                    <div className="mb-4">
                      <label className="input-label">
                        {fb.emailLabel} <span className="text-white/40">{fb.emailHint}</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="input-field"
                        disabled={submitting}
                      />
                    </div>
                  )}

                  {user && (
                    <div className="text-xs text-white/40 mb-4 px-3 py-2 bg-white/[0.02] rounded-lg">
                      {fb.sendingFrom} <span className="text-brand-400 font-mono">{user.email}</span>
                    </div>
                  )}

                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="btn-primary w-full text-center justify-center"
                  >
                    {submitting ? fb.sending : fb.send}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
