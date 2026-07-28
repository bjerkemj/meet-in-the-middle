'use client';

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import AvailabilityGrid from './AvailabilityGrid';
import GroupGrid from './GroupGrid';

function getTimeSlots(startTime: string, endTime: string): { key: string; label: string }[] {
  const slots: { key: string; label: string }[] = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let h = sh, m = sm;
  while (h * 60 + m < eh * 60 + em) {
    const key = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push({ key, label: key.endsWith(':00') ? key : '' });
    m += 30;
    if (m >= 60) { m -= 60; h++; }
  }
  return slots;
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
  };
}

export default function EventView({ id }: { id: string }) {
  const event = useQuery(api.events.get, { id });
  const responses = useQuery(api.responses.list, { eventId: id });
  const [pageUrl, setPageUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { setPageUrl(window.location.href); }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (event === undefined) {
    return (
      <main className="flex items-center justify-center h-dvh">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  if (event === null) {
    return (
      <main className="flex items-center justify-center h-dvh px-4">
        <p className="text-sm text-muted">Event not found.</p>
      </main>
    );
  }

  const timeSlots = getTimeSlots(event.from, event.to);

  const isDate = (s: string) => s.includes('-');
  const days = event.days.map(key => {
    if (isDate(key)) {
      const { weekday, date } = formatDay(key);
      return { key, label: weekday, sublabel: date };
    }
    return { key, label: key };
  });

  const rangeLabel = isDate(event.days[0])
    ? (() => {
        const s = formatDay(event.days[0]);
        const e = formatDay(event.days[event.days.length - 1]);
        return `${s.weekday} ${s.date} – ${e.weekday} ${e.date}`;
      })()
    : event.days.join(', ');

  return (
    <main className="h-dvh flex flex-col overflow-hidden px-6 py-8 max-w-6xl mx-auto">

      <div className="mb-6 shrink-0">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          meet<span className="text-accent">.</span>in<span className="text-accent">.</span>the<span className="text-accent">.</span>middle
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground leading-tight">
          {event.title}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {rangeLabel}{'  ·  '}{event.from} – {event.to}
        </p>
        <div className="mt-4 flex items-center gap-2 bg-surface border border-border rounded-sm px-3 py-2">
          <span className="text-xs text-muted font-mono truncate flex-1 min-w-0 select-all">
            {pageUrl}
          </span>
          <button
            onClick={copyLink}
            className="shrink-0 text-xs font-semibold transition-colors text-accent hover:text-accent-hover"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AvailabilityGrid
          days={days}
          timeSlots={timeSlots}
          eventId={id}
          responses={responses ?? []}
        />
        <GroupGrid
          days={days}
          timeSlots={timeSlots}
          responses={responses ?? []}
        />
      </div>

    </main>
  );
}
