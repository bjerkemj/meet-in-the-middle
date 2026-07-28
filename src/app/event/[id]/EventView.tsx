'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
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
  const saveResponse = useMutation(api.responses.save);

  const [pageUrl, setPageUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [hasSlots, setHasSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const latestSlotsRef = useRef<Set<string>>(new Set());

  useEffect(() => { setPageUrl(window.location.href); }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSlotsChange(slots: Set<string>) {
    latestSlotsRef.current = slots;
    setHasSlots(slots.size > 0);
    setSaved(false);
  }

  async function handleSave() {
    if (!name.trim() || !hasSlots || saving) return;
    setSaving(true);
    await saveResponse({ eventId: id, name: name.trim(), slots: [...latestSlotsRef.current] });
    setSaving(false);
    setSaved(true);
  }

  const canSave = !!name.trim() && hasSlots && !saving;
  const isActive = !!name.trim();

  const inputClass = 'bg-surface border border-border rounded-sm px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-foreground transition-colors w-full sm:w-48';
  const labelClass = 'text-xs font-semibold text-muted uppercase tracking-widest';

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

  const respondents = responses ?? [];

  return (
    <main className="h-dvh flex flex-col overflow-hidden px-6 py-6 max-w-[1800px] w-full mx-auto">

      {/* Page header */}
      <div className="shrink-0 mb-5">
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm font-semibold tracking-tight text-foreground shrink-0">
            meet<span className="text-accent">.</span>in<span className="text-accent">.</span>the<span className="text-accent">.</span>middle
          </span>
          <div className="flex items-center gap-2 bg-surface border border-border rounded-sm px-3 py-1.5 min-w-0 flex-1 max-w-sm">
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
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground leading-tight">
          {event.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {rangeLabel}{'  ·  '}{event.from} – {event.to}
        </p>
      </div>

      {/*
        Three-row CSS grid: [panel headers] [tables] [panel footers]
        CSS grid makes each row the same height across both columns → perfect alignment.
      */}
      <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-[auto_1fr_auto] gap-x-6">

        {/* Row 1 — Panel headers */}
        <div className="pb-3">
          <span className={labelClass}>Your availability</span>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setSaved(false); }}
              placeholder="Your name"
              className={inputClass}
            />
            <p className="text-xs text-muted">
              {isActive ? "Click or drag to mark when you're free" : 'Enter your name to start'}
            </p>
          </div>
        </div>

        <div className="pb-3">
          <span className={labelClass}>Group availability</span>
          <p className="mt-2 text-xs text-muted" style={{ lineHeight: '2.25rem' }}>
            {respondents.length > 0
              ? `${respondents.length} response${respondents.length !== 1 ? 's' : ''} · ${respondents.map(r => r.name).join(', ')}`
              : 'No responses yet'}
          </p>
        </div>

        {/* Row 2 — Tables (fills remaining height) */}
        <AvailabilityGrid
          days={days}
          timeSlots={timeSlots}
          isActive={isActive}
          onSlotsChange={handleSlotsChange}
        />

        <GroupGrid
          days={days}
          timeSlots={timeSlots}
          responses={respondents}
        />

        {/* Row 3 — Footers */}
        <div className="pt-3 flex items-center justify-end gap-3">
          {saved && <span className="text-xs text-accent">Saved!</span>}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-4 py-2 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save my availability'}
          </button>
        </div>

        <div className="pt-3" />

      </div>
    </main>
  );
}
