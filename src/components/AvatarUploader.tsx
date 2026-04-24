'use client';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  currentUrl?: string | null;
  fallbackText?: string;
  onUpload: (publicUrl: string) => void;
  disabled?: boolean;
}

/**
 * Client-side image resize to 400x400 JPEG 85% before upload.
 * Keeps the square crop from center.
 */
async function resizeToSquareJpeg(file: File, size = 400): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const minDim = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - minDim) / 2;
  const sy = (bitmap.height - minDim) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, sx, sy, minDim, minDim, 0, 0, size, size);
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85));
}

export default function AvatarUploader({ currentUrl, fallbackText, onUpload, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const blob = await resizeToSquareJpeg(file);
      const presigned = await api.getAvatarPresignedUrl('image/jpeg', blob.size);
      const upload = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' },
      });
      if (!upload.ok) throw new Error('Ошибка загрузки на R2');
      onUpload(presigned.publicUrl);
    } catch (e: any) {
      setError(e?.message || 'Не удалось загрузить');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-brand-500/10 border border-white/10 shrink-0">
        {currentUrl ? (
          <img src={currentUrl} alt="Аватар" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-400 font-bold text-2xl">
            {(fallbackText || '?').charAt(0).toUpperCase()}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className="flex-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="btn-secondary text-sm"
        >
          {uploading ? 'Загрузка...' : currentUrl ? '📷 Сменить' : '📷 Загрузить аватар'}
        </button>
        {currentUrl && !uploading && !disabled && (
          <button
            type="button"
            onClick={() => onUpload('')}
            className="ml-2 text-xs text-red-400 hover:text-red-300"
          >
            Удалить
          </button>
        )}
        {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
        <div className="text-[10px] text-white/30 mt-1">Сжимается до 400×400 JPEG</div>
      </div>
    </div>
  );
}
