'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
    'w-full min-w-0 rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-3">
            meet in the middle
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
            Find time that works for everyone.
          </h1>
          <p className="mt-2 text-sm text-muted">
            No login. No accounts. Just share a link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Event name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team standup, Book club, ..."
              className={inputClass}
            />
          </div>

          {/* Mode toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Dates
            </label>
            <div className="flex rounded-lg border border-border overflow-hidden mb-3">
              <button
                type="button"
                onClick={() => setMode('weekdays')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === 'weekdays'
                    ? 'bg-accent text-white'
                    : 'bg-white text-muted hover:bg-surface'
                }`}
              >
                Days of week
              </button>
              <button
                type="button"
                onClick={() => setMode('dates')}
                className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-border ${
                  mode === 'dates'
                    ? 'bg-accent text-white'
                    : 'bg-white text-muted hover:bg-surface'
                }`}
              >
                Specific dates
              </button>
            </div>

            {mode === 'dates' ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
                <span className="text-xs text-muted select-none">to</span>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            ) : (
              <div className="flex gap-1.5">
                {WEEKDAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      selectedWeekdays.has(day)
                        ? 'bg-accent text-white'
                        : 'bg-surface border border-border text-muted hover:border-accent hover:text-foreground'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Time of day
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
              <span className="text-xs text-muted select-none">to</span>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={mode === 'weekdays' && selectedWeekdays.size === 0}
            className="w-full rounded-lg bg-accent text-white text-sm font-semibold py-2.5 mt-2 hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create event →
          </button>
        </form>
      </div>
    </main>
  );
}
