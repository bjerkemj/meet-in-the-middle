'use client';

import { useState, useRef, useEffect } from 'react';

type Day = { key: string; label: string; sublabel?: string };
type TimeSlot = { key: string; label: string };

export default function AvailabilityGrid({
  days,
  timeSlots,
}: {
  days: Day[];
  timeSlots: TimeSlot[];
}) {
  const [name, setName] = useState('');
  const [mySlots, setMySlots] = useState(new Set<string>());
  const dragRef = useRef({ active: false, mode: 'select' as 'select' | 'deselect' });
  // Tracks the last cell touched so we can interpolate skipped rows on fast drags.
  const lastCellRef = useRef<{ dayIdx: number; timeIdx: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const isEditing = name.trim().length > 0;

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
    setMySlots(prev => {
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
    setMySlots(prev => {
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

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent w-full sm:w-48"
        />
        <p className="text-xs text-muted">
          {isEditing
            ? "Click or drag to mark when you're free"
            : 'Enter your name to start marking availability'}
        </p>
      </div>

      <div ref={gridRef} className="overflow-x-auto rounded-xl border border-border select-none">
        <table className="w-full border-collapse text-xs">
          <thead>
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
                            ? 'bg-surface hover:bg-accent/20'
                            : 'bg-surface',
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

      <p className="mt-3 text-xs text-muted h-4">
        {mySlots.size > 0
          ? `${mySlots.size} slot${mySlots.size !== 1 ? 's' : ''} selected`
          : ''}
      </p>
    </div>
  );
}
