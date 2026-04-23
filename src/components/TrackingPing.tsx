'use client';
import { useEffect } from 'react';
import { api } from '@/lib/api';

// Pings the server every 3 minutes if user is authenticated,
// so we can track session activity, device and location
export default function TrackingPing() {
  useEffect(() => {
    const ping = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) return;
      try { await api.trackingPing(); } catch {}
    };
    ping();
    const interval = setInterval(ping, 3 * 60 * 1000);
    const onFocus = () => ping();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, []);
  return null;
}
