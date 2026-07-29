'use client';

import { useState } from 'react';

type Day = { key: string; label: string; sublabel?: string };
type TimeSlot = { key: string; label: string };
type Response = { name: string; slots: string[] };

export default function GroupGrid({
  days,
  timeSlots,
  responses,
}: {
  days: Day[];
  timeSlots: TimeSlot[];
  responses: Response[];
}) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const total = responses.length;
  const slotMap = new Map<string, string[]>();
  for (const r of responses) {
    for (const slot of r.slots) {
      if (!slotMap.has(slot)) slotMap.set(slot, []);
      slotMap.get(slot)!.push(r.name);
    }
  }

  return (
    <div className="max-h-full overflow-auto border border-border rounded-sm select-none">
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
          {timeSlots.map(({ key: time, label }) => (
            <tr key={time} className={time.endsWith(':00') ? 'border-t border-border' : ''}>
              <td className="w-16 pr-3 text-right text-muted border-r border-border h-5 align-middle whitespace-nowrap">
                {label}
              </td>
              {days.map(({ key: day }) => {
                const slotKey = `${day}T${time}`;
                const names = slotMap.get(slotKey) ?? [];
                const ratio = total > 0 ? names.length / total : 0;
                return (
                  <td
                    key={slotKey}
                    className="border-l border-border h-5 relative"
                    style={ratio > 0 ? { backgroundColor: `rgba(249, 115, 22, ${ratio})` } : undefined}
                    onMouseEnter={() => setHoveredSlot(slotKey)}
                    onMouseLeave={() => setHoveredSlot(null)}
                  >
                    {hoveredSlot === slotKey && names.length > 0 && (
                      <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-foreground text-background text-xs px-2 py-1 rounded-sm whitespace-nowrap pointer-events-none">
                        {names.join(', ')}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
