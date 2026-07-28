'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

type Day = { key: string; label: string; sublabel?: string };
type TimeSlot = { key: string; label: string };
type Response = { name: string; slots: string[] };

export default function AvailabilityGrid({
  days,
  timeSlots,
  eventId,
  responses,
}: {
  days: Day[];
  timeSlots: TimeSlot[];
  eventId: string;
  responses: Response[];
}) {
  const saveResponse = useMutation(api.responses.save);
  const [name, setName] = useState('');
  const [mySlots, setMySlots] = useState(new Set<string>());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef({ active: false, mode: 'select' as 'select' | 'deselect' });
  // Tracks the last cell touched so we can interpolate skipped rows on fast drags.
  const lastCellRef = useRef<{ dayIdx: number; timeIdx: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const isEditing = name.trim().length > 0;
  const canSave = isEditing && mySlots.size > 0 && !saving;

  // Reset saved state when slots change.
  function markSlotChange(fn: (prev: Set<string>) => Set<string>) {
    setSaved(false);
    setMySlots(fn);
  }

  // Stop drag on release anywhere on the page.
  useEffect(() => {
    const stop = () => {
      dragRef.current.active = false;
      lastCellRef.current = null;
    };
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };
  }, []);

  // Touch drag: identify cell under finger via elementFromPoint.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current.active) return;
      e.preventDefault();
      const { clientX, clientY } = e.touches[0];
      const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const di = parseInt(target?.dataset.di ?? '-1');
      const ti = parseInt(target?.dataset.ti ?? '-1');
      if (di >= 0 && ti >= 0) fillRange(di, ti);
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [days, timeSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply all rows between lastCellRef and (dayIdx, timeIdx) when in the same
  // column; otherwise just apply the single cell. This fills gaps from fast drags.
  function fillRange(dayIdx: number, timeIdx: number) {
    const last = lastCellRef.current;
    markSlotChange(prev => {
      const next = new Set(prev);
      const toggle = (sk: string) => {
        if (dragRef.current.mode === 'select') next.add(sk);
        else next.delete(sk);
      };
      if (last && last.dayIdx === dayIdx) {
        const lo = Math.min(last.timeIdx, timeIdx);
        const hi = Math.max(last.timeIdx, timeIdx);
        for (let t = lo; t <= hi; t++) {
          toggle(`${days[dayIdx].key}T${timeSlots[t].key}`);
        }
      } else {
        toggle(`${days[dayIdx].key}T${timeSlots[timeIdx].key}`);
      }
      return next;
    });
    lastCellRef.current = { dayIdx, timeIdx };
  }

  function startDrag(dayIdx: number, timeIdx: number, slotKey: string) {
    if (!isEditing) return;
    dragRef.current = {
      active: true,
      mode: mySlots.has(slotKey) ? 'deselect' : 'select',
    };
    lastCellRef.current = { dayIdx, timeIdx };
    markSlotChange(prev => {
      const next = new Set(prev);
      if (dragRef.current.mode === 'select') next.add(slotKey);
      else next.delete(slotKey);
      return next;
    });
  }

  function continueDrag(dayIdx: number, timeIdx: number) {
    if (!dragRef.current.active) return;
    fillRange(dayIdx, timeIdx);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    await saveResponse({ eventId, name: name.trim(), slots: [...mySlots] });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false); }}
          placeholder="Your name"
          className="bg-surface border border-border rounded-sm px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-foreground transition-colors w-full sm:w-48"
        />
        <p className="text-xs text-muted">
          {isEditing
            ? "Click or drag to mark when you're free"
            : 'Enter your name to start marking availability'}
        </p>
      </div>

      <div ref={gridRef} className="flex-1 min-h-0 overflow-auto border border-border rounded-sm select-none">
        <table className="w-full border-collapse table-fixed text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-16 bg-surface border-b border-border" />
              {days.map(({ key, label, sublabel }) => (
                <th
                  key={key}
                  className="bg-surface border-b border-l border-border py-2.5 px-3 text-center font-medium text-foreground"
                >
                  {sublabel ? (
                    <>
                      <div className="text-muted font-normal">{label}</div>
                      <div>{sublabel}</div>
                    </>
                  ) : (
                    <div>{label}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(({ key: time, label }, timeIdx) => (
              <tr key={time} className={time.endsWith(':00') ? 'border-t border-border' : ''}>
                <td className="w-16 pr-3 text-right text-muted border-r border-border h-7 align-middle whitespace-nowrap">
                  {label}
                </td>
                {days.map(({ key: day }, dayIdx) => {
                  const slotKey = `${day}T${time}`;
                  const selected = mySlots.has(slotKey);
                  return (
                    <td
                      key={slotKey}
                      data-di={dayIdx}
                      data-ti={timeIdx}
                      className={[
                        'border-l border-border h-7 transition-colors',
                        selected
                          ? 'bg-accent'
                          : isEditing
                            ? 'bg-background hover:bg-accent/10'
                            : 'bg-background',
                        isEditing ? 'cursor-pointer' : 'cursor-default',
                      ].join(' ')}
                      onMouseDown={e => { e.preventDefault(); startDrag(dayIdx, timeIdx, slotKey); }}
                      onMouseEnter={() => continueDrag(dayIdx, timeIdx)}
                      onTouchStart={e => { e.preventDefault(); startDrag(dayIdx, timeIdx, slotKey); }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between shrink-0">
        <p className="text-xs text-muted">
          {responses.length > 0
            ? `${responses.length} person${responses.length !== 1 ? 's' : ''} responded`
            : ''}
        </p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-accent">Saved!</span>}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-4 py-2 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save my availability'}
          </button>
        </div>
      </div>
    </div>
  );
}
