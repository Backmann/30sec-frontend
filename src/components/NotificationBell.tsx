"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { detectLocale, Locale } from "@/lib/i18n";

const N_STR: Record<Locale, {
  title: string;
  readAll: string;
  loading: string;
  noNotifications: string;
}> = {
  ru: {
    title: 'Уведомления',
    readAll: 'Прочитать все',
    loading: 'Загрузка...',
    noNotifications: 'Нет уведомлений',
  },
  en: {
    title: 'Notifications',
    readAll: 'Read all',
    loading: 'Loading...',
    noNotifications: 'No notifications',
  },
  de: {
    title: 'Benachrichtigungen',
    readAll: 'Alle lesen',
    loading: 'Lädt...',
    noNotifications: 'Keine Benachrichtigungen',
  },
};

export default function NotificationBell() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('ru');
  useEffect(() => { setLocale(detectLocale()); }, []);
  const nt = N_STR[locale];
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count every 30 seconds
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.getNotificationsUnreadCount();
        setCount(res.count);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggleOpen = async () => {
    if (!open) {
      setLoading(true);
      try {
        const items = await api.getNotifications();
        setNotifications(items.data || []);
      } catch {}
      setLoading(false);
    }
    setOpen(!open);
  };

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setCount(Math.max(0, count - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setCount(0);
    } catch {}
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={toggleOpen} className="btn-icon relative" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-dark-800 border border-white/10 rounded-2xl shadow-2xl z-50">
          <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-dark-800">
            <h3 className="text-white font-semibold text-sm">{nt.title}</h3>
            {count > 0 && (
              <button onClick={markAllAsRead} className="text-brand-400 hover:text-brand-300 text-xs">
                {nt.readAll}
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-white/30 text-sm">{nt.loading}</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-white/30 text-sm">{nt.noNotifications}</div>
          ) : (
            <div>
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                  className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                    !n.isRead ? "bg-brand-500/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">{n.title}</div>
                      <div className="text-white/50 text-xs mt-0.5">{n.body}</div>
                      <div className="text-white/20 text-[10px] mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
