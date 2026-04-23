'use client';
import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';

interface TQ {
  id: string;
  questionId: string;
  orderIndex: number;
  isUsed: boolean;
  question?: {
    localizations?: Array<{ id: string; language: string; questionText: string; correctAnswerLocalized?: string }>;
    questionImages?: Array<{ url: string }>;
  };
}

interface Props {
  tournamentId: string;
  tqs: TQ[];
  onRemove: (tqId: string, text: string) => void;
  onReorderSaved?: () => void;
}

function SortableItem({ tq, index, onRemove }: { tq: TQ; index: number; onRemove: (tqId: string, text: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tq.id,
    disabled: tq.isUsed,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.85 : 1,
  };
  const firstLoc = tq.question?.localizations?.[0];
  const hasImage = (tq.question?.questionImages?.length || 0) > 0;

  return (
    <div
      ref={setNodeRef}
      style={style as any}
      className={`card py-3 px-4 transition ${isDragging ? 'shadow-2xl border-brand-500/50 ring-2 ring-brand-500/30' : ''} ${tq.isUsed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        {!tq.isUsed ? (
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/70 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none transition"
            title="Перетащите чтобы изменить порядок"
            aria-label="Переместить"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.3" /><circle cx="10" cy="3" r="1.3" />
              <circle cx="4" cy="7" r="1.3" /><circle cx="10" cy="7" r="1.3" />
              <circle cx="4" cy="11" r="1.3" /><circle cx="10" cy="11" r="1.3" />
            </svg>
          </button>
        ) : (
          <div className="shrink-0 w-8 h-8 flex items-center justify-center text-white/20 text-xs">🔒</div>
        )}

        <span className="text-white/30 text-xs font-mono w-6 shrink-0 mt-1">Q{index + 1}</span>

        {hasImage && (
          <img src={tq.question!.questionImages![0].url} alt="" className="shrink-0 w-12 h-12 rounded-lg object-cover border border-white/10" />
        )}

        <div className="flex-1 min-w-0">
          {tq.question?.localizations?.map((l: any) => (
            <div key={l.id} className="text-white/60 text-sm">
              <span className="text-white/20 font-mono text-[10px] mr-1">{l.language}</span>
              {l.questionText}
              {l.correctAnswerLocalized && <span className="text-green-400/40 ml-2"> → {l.correctAnswerLocalized}</span>}
            </div>
          ))}
        </div>

        {tq.isUsed ? (
          <span className="text-[10px] text-green-400 px-2 shrink-0">✓ сыгран</span>
        ) : (
          <button
            onClick={() => onRemove(tq.id, firstLoc?.questionText || '')}
            title="Убрать из турнира"
            className="shrink-0 w-7 h-7 rounded-lg bg-white/[0.03] hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs transition"
          >
            ➖
          </button>
        )}
      </div>
    </div>
  );
}

export default function ReorderableQuestions({ tournamentId, tqs, onRemove, onReorderSaved }: Props) {
  const [items, setItems] = useState<TQ[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setItems([...tqs].sort((a, b) => a.orderIndex - b.orderIndex));
  }, [tqs]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
    setSaving(true);

    try {
      const orderedIds = newItems.filter(i => !i.isUsed).map(i => i.id);
      await api.reorderTournamentQuestions(tournamentId, orderedIds);
      setToast('Порядок сохранён ✓');
      setTimeout(() => setToast(null), 2000);
      if (onReorderSaved) onReorderSaved();
    } catch (e: any) {
      // Rollback on error
      setItems([...tqs].sort((a, b) => a.orderIndex - b.orderIndex));
      alert('Не удалось сохранить порядок: ' + (e?.message || 'ошибка'));
    }
    setSaving(false);
  };

  // Separate used (locked) and unused for drag scope
  const unusedIds = items.filter(i => !i.isUsed).map(i => i.id);

  if (items.length === 0) {
    return <div className="card py-4 text-white/20 text-sm text-center">Нет вопросов</div>;
  }

  return (
    <div className="relative">
      {toast && (
        <div className="absolute -top-10 right-0 bg-green-500/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg z-10 animate-fade-in">
          {toast}
        </div>
      )}
      {saving && !toast && (
        <div className="absolute -top-10 right-0 text-white/40 text-xs">Сохранение...</div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={unusedIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {items.map((tq, i) => (
              <SortableItem key={tq.id} tq={tq} index={i} onRemove={onRemove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
