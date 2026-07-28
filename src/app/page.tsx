'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const MINUTES = ['00', '30'];

function TimeSelect({ value, onChange, min, className }: { value: string; onChange: (v: string) => void; min?: string; className?: string }) {
  const [hour, minute] = value.split(':');
  const validHours = min ? HOURS.filter(h => `${h}:30` > min) : HOURS;
  const validMinutes = min ? MINUTES.filter(m => `${hour}:${m}` > min) : MINUTES;

  function handleHourChange(h: string) {
    for (const m of MINUTES) {
      const candidate = `${h}:${m}`;
      if (!min || candidate > min) { onChange(candidate); return; }
    }
  }

  function handleMinuteChange(m: string) {
    const candidate = `${hour}:${m}`;
    if (!min || candidate > min) onChange(candidate);
  }

  return (
    <div className="flex gap-1">
      <select value={hour} onChange={e => handleHourChange(e.target.value)} className={className}>
        {validHours.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <select value={minute} onChange={e => handleMinuteChange(e.target.value)} className={className}>
        {validMinutes.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}

type Mode = 'dates' | 'weekdays';

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<Mode>('weekdays');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<Set<string>>(
    new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  );
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  function handleStartTimeChange(t: string) {
    setStartTime(t);
    if (endTime <= t) {
      const next = TIME_OPTIONS.find(opt => opt > t);
      if (next) setEndTime(next);
    }
  }

  function toggleWeekday(day: string) {
    setSelectedWeekdays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = generateId();
    let qs: URLSearchParams;
    if (mode === 'dates') {
      qs = new URLSearchParams({ title, start: startDate, end: endDate, from: startTime, to: endTime });
    } else {
      const ordered = WEEKDAYS.filter(d => selectedWeekdays.has(d));
      qs = new URLSearchParams({ title, weekdays: ordered.join(','), from: startTime, to: endTime });
    }
    router.push(`/event/${id}?${qs}`);
  }

  const inputClass =
    'w-full min-w-0 bg-surface border border-border px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-foreground rounded-sm transition-colors';

  const sectionLabel = 'block text-xs font-semibold text-muted uppercase tracking-widest mb-3';

  return (
    <main className="min-h-screen flex flex-col px-6 lg:px-16 py-12 lg:py-20 max-w-6xl mx-auto">

      {/* Wordmark */}
      <div className="mb-12 lg:mb-16">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          meet<span className="text-accent">.</span>in<span className="text-accent">.</span>the<span className="text-accent">.</span>middle
        </span>
      </div>

      {/* Two-column form on desktop, single column on mobile */}
      <form onSubmit={handleSubmit} className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-0">

        {/* LEFT — headline + event name */}
        <div className="flex flex-col lg:pr-16">
          <div className="flex-1">
            <h1 className="text-[2.75rem] lg:text-[3.5rem] font-bold tracking-tight text-foreground leading-[1.05] mb-4">
              Find time<br />that works.
            </h1>
            <p className="text-muted text-sm">
              No login. Share a link. Done.
            </p>
          </div>
        </div>

        {/* RIGHT — when + hours + submit */}
        <div className="flex flex-col gap-8 lg:pl-16 lg:border-l lg:border-border">

          <div>
            <label className={sectionLabel}>What's it for?</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Team lunch, book club, …"
              className="w-full bg-transparent border-b-2 border-border focus:border-foreground px-0 py-2 text-xl font-medium text-foreground placeholder-muted focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className={sectionLabel}>When?</label>

            {/* Mode toggle */}
            <div className="flex gap-1 mb-4 p-1 bg-surface rounded-sm border border-border">
              <button
                type="button"
                onClick={() => setMode('weekdays')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
                  mode === 'weekdays'
                    ? 'bg-foreground text-background'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Days of week
              </button>
              <button
                type="button"
                onClick={() => setMode('dates')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
                  mode === 'dates'
                    ? 'bg-foreground text-background'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Specific dates
              </button>
            </div>

            {mode === 'dates' ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
                <span className="text-xs text-muted select-none">to</span>
                <input type="date" required value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
              </div>
            ) : (
              <div className="flex gap-1">
                {WEEKDAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-sm border transition-colors ${
                      selectedWeekdays.has(day)
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-surface text-muted border-border hover:border-foreground hover:text-foreground'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={sectionLabel}>What hours?</label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <TimeSelect value={startTime} onChange={handleStartTimeChange} className={inputClass} />
              <span className="text-xs text-muted select-none">to</span>
              <TimeSelect value={endTime} onChange={setEndTime} min={startTime} className={inputClass} />
            </div>
          </div>

          {/* Push button to bottom on desktop */}
          <div className="lg:mt-auto">
            <button
              type="submit"
              disabled={mode === 'weekdays' && selectedWeekdays.size === 0}
              className="w-full bg-accent hover:bg-accent-hover text-white font-semibold text-sm py-3 rounded-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create event →
            </button>
          </div>

        </div>
      </form>

    </main>
  );
}
