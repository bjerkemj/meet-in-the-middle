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
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'mine' | 'group'>('mine');
  const latestSlotsRef = useRef<Set<string>>(new Set());

  useEffect(() => { setPageUrl(window.location.href); }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSlotsChange(slots: Set<string>) {
    latestSlotsRef.current = slots;
    setSlotsVersion(v => v + 1);
  }

  // Auto-save 800 ms after the last change, as long as a name is set.
  useEffect(() => {
    if (!name.trim() || latestSlotsRef.current.size === 0) {
      setSaveStatus('idle');
      return;
    }
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      await saveResponse({ eventId: id, name: name.trim(), slots: [...latestSlotsRef.current] });
      setSaveStatus('saved');
    }, 800);
    return () => clearTimeout(timer);
  }, [slotsVersion, name]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <span className="text-sm font-semibold tracking-tight text-foreground">
          meet<span className="text-accent">.</span>in<span className="text-accent">.</span>the<span className="text-accent">.</span>middle
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground leading-tight">
          {event.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {rangeLabel}{'  ·  '}{event.from} – {event.to}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 bg-surface border border-border rounded-sm px-3 py-1.5 max-w-xs">
          <span className="text-xs text-muted font-mono truncate min-w-0 select-all">
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

      {/* Tab toggle — mobile only */}
      <div className="sm:hidden shrink-0 flex mb-3 rounded-sm border border-border overflow-hidden">
        <button
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === 'mine' ? 'bg-accent text-background' : 'bg-surface text-muted'}`}
          onClick={() => setActiveTab('mine')}
        >
          Your availability
        </button>
        <button
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === 'group' ? 'bg-accent text-background' : 'bg-surface text-muted'}`}
          onClick={() => setActiveTab('group')}
        >
          Group
        </button>
      </div>

      {/*
        Three-row CSS grid on desktop: [panel headers] [tables] [panel footers]
        On mobile: flex-col with tab toggle hiding the inactive panel.
      */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto sm:overflow-visible sm:grid sm:grid-cols-2 sm:grid-rows-[auto_1fr_auto] sm:gap-x-6 sm:items-start">

        {/* Row 1 — Panel headers */}
        <div className={`pb-3 ${activeTab !== 'mine' ? 'hidden sm:block' : ''}`}>
          <span className={labelClass}>Your availability</span>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
            <p className="text-xs text-muted">
              {isActive ? "Click or drag to mark when you're free" : 'Enter your name to start'}
            </p>
          </div>
        </div>

        <div className={`pb-3 ${activeTab !== 'group' ? 'hidden sm:block' : ''}`}>
          <span className={labelClass}>Group availability</span>
          <p className="mt-2 text-xs text-muted" style={{ lineHeight: '2.25rem' }}>
            {respondents.length > 0
              ? `${respondents.length} response${respondents.length !== 1 ? 's' : ''} · ${respondents.map(r => r.name).join(', ')}`
              : 'No responses yet'}
          </p>
        </div>

        {/* Row 2 — Tables (fills remaining height) */}
        <div className={activeTab !== 'mine' ? 'hidden sm:contents' : 'sm:contents'}>
          <AvailabilityGrid
            days={days}
            timeSlots={timeSlots}
            isActive={isActive}
            onSlotsChange={handleSlotsChange}
          />
        </div>

        <div className={activeTab !== 'group' ? 'hidden sm:contents' : 'sm:contents'}>
          <GroupGrid
            days={days}
            timeSlots={timeSlots}
            responses={respondents}
          />
        </div>

        {/* Row 3 — Footers */}
        <div className={`pt-2 ${activeTab !== 'mine' ? 'hidden sm:flex' : 'flex'} items-center justify-end`}>
          {saveStatus === 'saving' && <span className="text-xs text-muted">Saving…</span>}
          {saveStatus === 'saved'  && <span className="text-xs text-accent">Saved</span>}
        </div>

        <div className={`pt-2 ${activeTab !== 'group' ? 'hidden sm:block' : ''}`} />

      </div>
    </main>
  );
}
