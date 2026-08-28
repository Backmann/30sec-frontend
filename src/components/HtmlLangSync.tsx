'use client';

import { useEffect } from 'react';
import { detectLocale } from '@/lib/i18n';

/**
 * Keeps <html lang> in step with the interface language.
 *
 * The layout is a server component and cannot know the visitor's choice, which
 * lives in localStorage, so it hardcoded lang="ru" for all three languages.
 * Wrong lang misleads screen readers, browser translation offers and search
 * engines. Setting it on the client is the correct value a moment late, which
 * beats the wrong value forever.
 *
 * Also listens for the 'storage' event so a language change in another tab is
 * reflected here too.
 */
export default function HtmlLangSync() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.lang = detectLocale();
    };
    apply();
    window.addEventListener('storage', apply);
    return () => window.removeEventListener('storage', apply);
  }, []);

  return null;
}
