'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { api } from '@/lib/api';
import { detectLocale, getTranslation } from '@/lib/i18n';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loadUser, logout } = useAuth();
  const locale = detectLocale();
  const t = getTranslation(locale);

  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [tournamentHistory, setTournamentHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'stats' | 'answers' | 'tournaments' | 'settings'>('stats');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ nickname: '', firstName: '', lastName: '', language: '', showRealName: false, dateOfBirth: '', gender: '', city: '', bio: '', phone: '' });
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    loadUser().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      api.getMyProfile().then(setProfile).catch(() => {});
      api.getMyAnswerHistory().then(setHistory).catch(() => {});
      api.getMyTournamentHistory().then(setTournamentHistory).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [loading, user]);

  useEffect(() => {
    if (profile?.profile) {
      setEditForm({
        nickname: profile.profile.nickname || '',
        firstName: profile.profile.firstName || '',
        lastName: profile.profile.lastName || '',
        language: profile.profile.language || 'ru',
        showRealName: profile.profile.showRealName || false,
        dateOfBirth: profile.profile.dateOfBirth ? String(profile.profile.dateOfBirth).split('T')[0] : '',
        gender: profile.profile.gender || '',
        city: profile.profile.city || '',
        bio: profile.profile.bio || '',
        phone: profile.profile.phone || '',
      });
    }
  }, [profile]);

  const saveProfile = async () => {
    try {
      await api.updateProfile(editForm);
      setSaveMsg('✓ Сохранено');
      setEditMode(false);
      api.getMyProfile().then(setProfile);
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveMsg('Ошибка: ' + err.message);
    }
  };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = profile?.playerStats;
  const rankInfo = stats?.rank;

  const tabs = [
    { id: 'stats', label: '📊 Статистика' },
    { id: 'answers', label: '📝 Ответы' },
    { id: 'tournaments', label: '🏆 Турниры' },
    { id: 'settings', label: '⚙️ Настройки' },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="border-b border-white/[0.06] bg-dark-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="text-white/40 hover:text-white text-sm transition-colors">← {t.common.back}</button>
          <h2 className="text-white font-semibold">{t.nav.profile}</h2>
          <div />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile header */}
        <div className="card-glow mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-3xl font-black text-white shrink-0">
              {profile?.profile?.nickname?.[0]?.toUpperCase() || '?'}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-brand-400">{profile?.profile?.nickname}</h1>
              {profile?.profile?.showRealName && (
                <p className="text-white/50 text-sm mt-0.5">{profile?.profile?.firstName} {profile?.profile?.lastName}</p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
                {profile?.profile?.countryCode && (
                  <span className="badge-draft">{profile.profile.flagCode?.toUpperCase()} {profile.profile.countryCode}</span>
                )}
                <span className="badge-draft">{user.role}</span>
                {profile?.emailVerifiedAt ? (
                  <span className="badge-finished">Email ✓</span>
                ) : (
                  <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20">Email не подтверждён</span>
                )}
              </div>
            </div>

            {/* Rank */}
            {rankInfo && (
              <div className="text-center shrink-0">
                <div className="text-4xl">{rankInfo.icon}</div>
                <div className="text-sm font-semibold text-white/60 mt-1">{rankInfo.title}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-sm whitespace-nowrap transition-all ${
                tab === tb.id ? 'bg-brand-500/10 text-brand-400 font-semibold' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* Stats tab */}
        {tab === 'stats' && stats && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Всего ответов', value: stats.totalAnswered, color: 'text-white' },
                { label: 'Правильных', value: stats.totalCorrect, color: 'text-green-400' },
                { label: 'Неправильных', value: stats.totalWrong, color: 'text-red-400' },
                { label: 'Точность', value: `${stats.accuracyPercent}%`, color: 'text-brand-400' },
                { label: 'Лучшая серия', value: stats.bestStreak, color: 'text-accent-400' },
                { label: 'Текущая серия', value: stats.currentStreak, color: 'text-accent-400' },
                { label: 'Побед 12:0', value: stats.wins12_0, color: 'text-green-400' },
                { label: 'Поражений 0:12', value: stats.losses0_12, color: 'text-red-400' },
              ].map((s, i) => (
                <div key={i} className="card text-center">
                  <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
                  <div className="text-white/30 text-[11px] mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Finals */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white/50 mb-3">Финалы</h3>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { label: 'Недельные', value: stats.weeklyFinals },
                  { label: 'Месячные', value: stats.monthlyFinals },
                  { label: 'Сезонные', value: stats.seasonFinals },
                  { label: 'Годовые', value: stats.yearlyFinals },
                ].map((f, i) => (
                  <div key={i}>
                    <div className="text-lg font-bold font-mono text-white/60">{f.value}</div>
                    <div className="text-[10px] text-white/25">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Answers tab */}
        {tab === 'answers' && history && (
          <div className="animate-fade-in space-y-2">
            {history.data?.length === 0 ? (
              <div className="card text-center py-12 text-white/30">Пока нет ответов</div>
            ) : history.data?.map((a: any) => (
              <div key={a.id} className="card flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-white/40 text-xs mb-1">
                    {a.question?.localizations?.find((l: any) => l.language === locale)?.questionText
                      || a.question?.localizations?.[0]?.questionText || '—'}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">"{a.answerText}"</span>
                    {a.decision === 'ACCEPTED' && <span className="text-green-400 text-xs font-semibold">✓</span>}
                    {a.decision === 'REJECTED' && <span className="text-red-400 text-xs font-semibold">✗</span>}
                    {!a.decision && <span className="text-white/20 text-xs">ожидание</span>}
                  </div>
                </div>
                <div className="text-white/20 text-[10px] font-mono shrink-0 ml-3">
                  {new Date(a.submittedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {history?.pagination?.totalPages > 1 && (
              <p className="text-center text-white/20 text-xs mt-4">Страница {history.pagination.page} из {history.pagination.totalPages}</p>
            )}
          </div>
        )}

        {/* Tournaments tab */}
        {tab === 'tournaments' && (
          <div className="animate-fade-in space-y-2">
            {tournamentHistory.length === 0 ? (
              <div className="card text-center py-12 text-white/30">Пока нет турниров</div>
            ) : tournamentHistory.map((tp: any) => (
              <div key={tp.id} className="card-hover flex items-center justify-between"
                onClick={() => router.push(`/game/${tp.tournament?.id}`)}>
                <div>
                  <span className="text-white font-medium">{tp.tournament?.title}</span>
                  <div className="flex gap-2 mt-1">
                    <span className="badge-draft text-[10px]">{tp.tournament?.type}</span>
                    <span className={`badge text-[10px] ${
                      tp.matchStatus === 'WON' ? 'badge-finished' : tp.matchStatus === 'LOST' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'badge-draft'
                    }`}>{tp.matchStatus}</span>
                  </div>
                </div>
                <div className="font-mono font-bold text-sm">
                  <span className="text-brand-400">{tp.currentScoreUser}</span>
                  <span className="text-white/20 mx-1">:</span>
                  <span className="text-red-400">{tp.currentScoreSystem}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings tab */}
        {tab === 'settings' && (
          <div className="animate-fade-in">
            <div className="card space-y-4">
              <div>
                <label className="input-label">Никнейм</label>
                <input type="text" value={editForm.nickname} onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                  className="input-field" disabled={!editMode} placeholder="my_nickname" />
                <p className="text-white/20 text-[10px] mt-1">Буквы, цифры и _ (3-20 символов). Можно менять раз в 30 дней.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">{t.auth.firstName}</label>
                  <input type="text" value={editForm.firstName} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                    className="input-field" disabled={!editMode} />
                </div>
                <div>
                  <label className="input-label">{t.auth.lastName}</label>
                  <input type="text" value={editForm.lastName} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                    className="input-field" disabled={!editMode} />
                </div>
              </div>

              <div>
                <label className="input-label">Язык / Language</label>
                <select value={editForm.language} onChange={(e) => setEditForm({...editForm, language: e.target.value})}
                  className="input-field" disabled={!editMode}>
                  <option value="ru">Русский</option>
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Дата рождения</label>
                  <input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})}
                    className="input-field" disabled={!editMode} />
                </div>
                <div>
                  <label className="input-label">Пол</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                    className="input-field" disabled={!editMode} style={{colorScheme:'dark'}}>
                    <option value="">Не указано</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Город</label>
                <input type="text" value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                  className="input-field" disabled={!editMode} placeholder="Berlin, Moscow, etc." />
              </div>
              <div>
                <label className="input-label">Телефон (необязательно)</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="input-field" disabled={!editMode} placeholder="+49..." />
              </div>
              <div>
                <label className="input-label">О себе <span className="text-white/30">({editForm.bio.length}/500)</span></label>
                <textarea value={editForm.bio} onChange={(e) => setEditForm({...editForm, bio: e.target.value.slice(0, 500)})}
                  className="input-field min-h-[80px] resize-y" disabled={!editMode} rows={3}
                  placeholder="Расскажите о себе несколько слов..." />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="showName" checked={editForm.showRealName}
                  onChange={(e) => setEditForm({...editForm, showRealName: e.target.checked})}
                  className="w-4 h-4 rounded bg-dark-700 border-white/20" disabled={!editMode} />
                <label htmlFor="showName" className="text-white/60 text-sm">Показывать настоящее имя</label>
              </div>

              <div className="flex gap-2">
                {!editMode ? (
                  <button onClick={() => setEditMode(true)} className="btn-primary text-sm">Редактировать</button>
                ) : (
                  <>
                    <button onClick={saveProfile} className="btn-primary text-sm">Сохранить</button>
                    <button onClick={() => setEditMode(false)} className="btn-ghost text-sm">Отмена</button>
                  </>
                )}
                {saveMsg && <span className="text-green-400 text-sm self-center ml-2">{saveMsg}</span>}
              </div>
            </div>

            <div className="card mt-4">
              <h3 className="text-white font-semibold mb-3">Мои данные (GDPR)</h3>
              <p className="text-white/40 text-xs mb-4">Согласно GDPR, вы имеете право скачать свои данные или удалить аккаунт в любой момент.</p>
              <div className="space-y-2">
                <button onClick={async () => {
                  try {
                    const token = localStorage.getItem('accessToken');
                    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '/api') + '/me/gdpr/export', {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `30sec-data-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch(e:any) { alert('Ошибка экспорта: ' + e.message); }
                }} className="btn-secondary text-sm w-full text-center">
                  Скачать мои данные (JSON)
                </button>
                <button onClick={async () => {
                  const pwd = prompt('Для подтверждения удаления введите ваш пароль:');
                  if (!pwd) return;
                  if (!confirm('Вы УВЕРЕНЫ что хотите удалить аккаунт? Это действие необратимо.\n\nВаша история турниров будет анонимизирована, но сохранена для целостности данных.')) return;
                  try {
                    const token = localStorage.getItem('accessToken');
                    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '/api') + '/me/gdpr/delete-account', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirmPassword: pwd })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message?.[0] || data.message || 'Ошибка');
                    alert('Аккаунт удалён. Вы будете перенаправлены на главную.');
                    logout();
                    router.push('/');
                  } catch(e:any) { alert('Ошибка: ' + e.message); }
                }} className="text-sm w-full text-center px-4 py-2.5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-medium">
                  Удалить аккаунт
                </button>
              </div>
            </div>

            <div className="card mt-4 border-red-500/10">
              <button onClick={() => { logout(); router.push('/'); }} className="btn-danger text-sm w-full text-center">
                {t.nav.logout}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
