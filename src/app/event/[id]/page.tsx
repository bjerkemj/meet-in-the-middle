import AvailabilityGrid from './AvailabilityGrid';

function getDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function getTimeSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let h = sh, m = sm;
  while (h * 60 + m < eh * 60 + em) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
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

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

type SearchParams = Promise<{
  title?: string;
  start?: string;
  end?: string;
  weekdays?: string;
  from?: string;
  to?: string;
}>;

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  void (await params).id; // will be used to fetch real event data from Convex

  const {
    title = 'Untitled event',
    start = '',
    end = '',
    weekdays = '',
    from = '09:00',
    to = '17:00',
  } = await searchParams;

  // Guard: need either a date range or a weekday list
  if (!weekdays && (!start || !end)) {
    return (
      <main className="flex items-center justify-center min-h-screen px-4">
        <p className="text-sm text-muted">Event not found or missing date range.</p>
      </main>
    );
  }

  const timeKeys = getTimeSlots(from, to);
  const timeSlots = timeKeys.map(key => ({
    key,
    label: key.endsWith(':00') ? formatTime(key) : '',
  }));

  // Build day columns — either from a date range or from named weekdays
  const days = weekdays
    ? weekdays.split(',').map(w => ({ key: w, label: w }))
    : getDays(start, end).map(key => {
        const { weekday, date } = formatDay(key);
        return { key, label: weekday, sublabel: date };
      });

  // Subtitle line under the event title
  const rangeLabel = weekdays
    ? weekdays.split(',').join(', ')
    : (() => {
        const s = formatDay(start);
        const e = formatDay(end);
        return `${s.weekday} ${s.date} – ${e.weekday} ${e.date}`;
      })();

  return (
    <main className="min-h-screen px-4 py-12 bg-background">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-accent uppercase mb-4">
            meet in the middle
          </p>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted mt-1">
            {rangeLabel}{'  ·  '}{formatTime(from)} – {formatTime(to)}
          </p>
        </div>

        <AvailabilityGrid days={days} timeSlots={timeSlots} />

      </div>
    </main>
  );
}
