'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/store';

const CATEGORIES = [
  { value: 'bug', label: '🐛 Баг', desc: 'Что-то работает не так' },
  { value: 'suggestion', label: '💡 Предложение', desc: 'Идея для улучшения' },
  { value: 'question', label: '❓ Вопрос', desc: 'Не понимаю как работает' },
  { value: 'other', label: '💬 Другое', desc: 'Любые мысли' },
];

export default function FeedbackButton() {
  const { user } = useAuth();
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
    if (subject.trim().length < 3) { setError('Тема: минимум 3 символа'); return; }
    if (message.trim().length < 10) { setError('Сообщение: минимум 10 символов'); return; }
    if (!user && !email.trim()) { setError('Укажите email чтобы мы могли ответить'); return; }

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
      setError(e?.message || 'Не удалось отправить');
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
        title="Сообщить о проблеме"
        aria-label="Обратная связь"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        <span className="hidden sm:inline text-sm font-semibold">Обратная связь</span>
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
              <h3 className="text-lg font-bold text-white">Обратная связь</h3>
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
                  <div className="text-xl font-bold text-green-400 mb-2">Спасибо!</div>
                  <div className="text-white/50 text-sm">Мы получили ваше сообщение.</div>
                </div>
              ) : (
                <>
                  <div className="text-white/50 text-xs mb-4 leading-relaxed">
                    Помогите сделать 30sec лучше. Опишите что произошло — мы обязательно прочитаем.
                  </div>

                  {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Category */}
                  <div className="mb-4">
                    <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block">Тип сообщения</label>
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
                    <label className="input-label">Тема</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value.slice(0, 120))}
                      maxLength={120}
                      placeholder="Кратко: что произошло?"
                      className="input-field"
                      disabled={submitting}
                    />
                  </div>

                  {/* Message */}
                  <div className="mb-4">
                    <label className="input-label">
                      Сообщение <span className="text-white/30">({message.length}/3000)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value.slice(0, 3000))}
                      placeholder="Подробно опишите: что делали, что ожидали, что произошло. Чем больше деталей — тем лучше."
                      rows={6}
                      className="input-field resize-y min-h-[120px]"
                      disabled={submitting}
                    />
                  </div>

                  {/* Email (only if not logged in) */}
                  {!user && (
                    <div className="mb-4">
                      <label className="input-label">
                        Email <span className="text-white/40">(чтобы мы могли ответить)</span>
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
                      Отправляется от имени <span className="text-brand-400 font-mono">{user.email}</span>
                    </div>
                  )}

                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="btn-primary w-full text-center justify-center"
                  >
                    {submitting ? 'Отправляем...' : 'Отправить'}
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
