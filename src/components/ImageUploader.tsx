'use client';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface UploadedImage {
  url: string;
  r2Key: string;
  caption?: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  category: 'question' | 'answer';
  maxImages?: number;
  label?: string;
}

export default function ImageUploader({ images, onChange, category, maxImages = 10, label }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    const filesArr = Array.from(files);
    const remaining = maxImages - images.length;
    if (filesArr.length > remaining) {
      setError(`Можно добавить ещё ${remaining} изображений`);
      return;
    }
    setUploading(true);
    const newImages: UploadedImage[] = [...images];
    for (const file of filesArr) {
      try {
        const { url, r2Key } = await api.uploadImage(file, category);
        newImages.push({ url, r2Key });
      } catch (e: any) {
        setError(e.message || 'Ошибка загрузки');
      }
    }
    onChange(newImages);
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleRemove = async (idx: number) => {
    const img = images[idx];
    const newImages = images.filter((_, i) => i !== idx);
    onChange(newImages);
    // Attempt to delete from R2 (don't block on error)
    if (img.r2Key) {
      api.deleteImage(img.r2Key).catch(() => {});
    }
  };

  const updateCaption = (idx: number, caption: string) => {
    const newImages = [...images];
    newImages[idx] = { ...newImages[idx], caption };
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      {label && <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div key={img.r2Key || i} className="relative group">
              <img src={img.url} alt="" className="w-full aspect-square object-cover rounded-xl border border-white/10" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-500/90 hover:bg-red-500 text-white rounded-lg flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                title="Удалить"
              >✕</button>
              <input
                type="text"
                value={img.caption || ''}
                onChange={e => updateCaption(i, e.target.value)}
                placeholder="Подпись (опционально)"
                className="w-full mt-1.5 text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 placeholder:text-white/20"
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${uploading ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/10 hover:border-brand-500/50 hover:bg-white/[0.02]'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={e => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="text-3xl mb-2">📷</div>
          {uploading ? (
            <div className="text-brand-400 text-sm">Загружаем...</div>
          ) : (
            <>
              <div className="text-white/70 text-sm font-medium">Перетащите изображения или нажмите</div>
              <div className="text-white/30 text-xs mt-1">JPG, PNG, WebP · до 5MB · осталось {maxImages - images.length}</div>
            </>
          )}
        </div>
      )}

      {error && <div className="text-red-400 text-xs">{error}</div>}
    </div>
  );
}
