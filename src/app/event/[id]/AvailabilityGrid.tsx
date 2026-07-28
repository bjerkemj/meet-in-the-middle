'use client';

import { useState, useRef, useEffect } from 'react';

type Day = { key: string; label: string; sublabel?: string };
type TimeSlot = { key: string; label: string };

export default function AvailabilityGrid({
  days,
  timeSlots,
  isActive,
  onSlotsChange,
}: {
  days: Day[];
  timeSlots: TimeSlot[];
  isActive: boolean;
  onSlotsChange: (slots: Set<string>) => void;
}) {
  const [mySlots, setMySlots] = useState(new Set<string>());
  const dragRef = useRef({ active: false, mode: 'select' as 'select' | 'deselect' });
  const lastCellRef = useRef<{ dayIdx: number; timeIdx: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stop = () => { dragRef.current.active = false; lastCellRef.current = null; };
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    return () => { window.removeEventListener('mouseup', stop); window.removeEventListener('touchend', stop); };
  }, []);

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

  function updateSlots(fn: (prev: Set<string>) => Set<string>) {
    setMySlots(prev => {
      const next = fn(prev);
      onSlotsChange(next);
      return next;
    });
  }

  // Fills gaps between lastCellRef and (dayIdx, timeIdx) during fast drags.
  function fillRange(dayIdx: number, timeIdx: number) {
    const last = lastCellRef.current;
    updateSlots(prev => {
      const next = new Set(prev);
      const toggle = (sk: string) => {
        if (dragRef.current.mode === 'select') next.add(sk);
        else next.delete(sk);
      };
      if (last && last.dayIdx === dayIdx) {
        const lo = Math.min(last.timeIdx, timeIdx);
        const hi = Math.max(last.timeIdx, timeIdx);
        for (let t = lo; t <= hi; t++) toggle(`${days[dayIdx].key}T${timeSlots[t].key}`);
      } else {
        toggle(`${days[dayIdx].key}T${timeSlots[timeIdx].key}`);
      }
      return next;
    });
    lastCellRef.current = { dayIdx, timeIdx };
  }

  function startDrag(dayIdx: number, timeIdx: number, slotKey: string) {
    if (!isActive) return;
    dragRef.current = { active: true, mode: mySlots.has(slotKey) ? 'deselect' : 'select' };
    lastCellRef.current = { dayIdx, timeIdx };
    updateSlots(prev => {
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
    <div ref={gridRef} className="min-h-0 overflow-auto border border-border rounded-sm select-none">
      <table className="w-full border-collapse table-fixed text-xs">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="w-16 bg-surface border-b border-border" />
            {days.map(({ key, label, sublabel }) => (
              <th key={key} className="bg-surface border-b border-l border-border py-2.5 px-3 text-center font-medium text-foreground">
                {sublabel ? (
                  <><div className="text-muted font-normal">{label}</div><div>{sublabel}</div></>
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
                      selected ? 'bg-accent' : isActive ? 'bg-background hover:bg-accent/10' : 'bg-background',
                      isActive ? 'cursor-pointer' : 'cursor-default',
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
  );
}
