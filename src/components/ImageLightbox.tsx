'use client';
import { useEffect, useState } from 'react';

interface Img {
  url: string;
  caption?: string;
}

interface LightboxProps {
  images: Img[];
  startIndex?: number;
  onClose: () => void;
}

export default function ImageLightbox({ images, startIndex = 0, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  if (images.length === 0) return null;
  const img = images[idx];

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl">✕</button>

      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); }}
            className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl"
          >‹</button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); }}
            className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl"
          >›</button>
          <div className="absolute top-5 left-5 text-white/60 text-sm font-mono">{idx + 1} / {images.length}</div>
        </>
      )}

      <div onClick={e => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3">
        <img src={img.url} alt="" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
        {img.caption && <div className="text-white/80 text-center text-sm max-w-2xl">{img.caption}</div>}
      </div>
    </div>
  );
}
