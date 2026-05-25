/**
 * Google Calendar REST API helpers.
 * All functions take an access token and talk directly to the API.
 */

const BASE = 'https://www.googleapis.com/calendar/v3';

export interface GCalEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
}

/** Fetch events for a given day (ISO date, e.g. '2026-05-26') from primary calendar. */
export async function fetchEventsForDate(
  accessToken: string,
  date: string,
): Promise<GCalEvent[]> {
  const timeMin = `${date}T00:00:00-05:00`; // NYC (EST)
  const timeMax = `${date}T23:59:59-05:00`;

  const url = new URL(`${BASE}/calendars/primary/events`);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('EXPIRED');
    throw new Error(`GCal fetch failed: ${res.status}`);
  }

  const json = await res.json();
  return (json.items ?? []) as GCalEvent[];
}

/** Create a Whim plan as a Google Calendar event. Returns the created event. */
export async function createCalendarEvent(
  accessToken: string,
  opts: {
    title: string;
    description?: string;
    date: string;        // 'yyyy-MM-dd'
    timeStart: string;   // '8:00 PM'
    neighborhood: string;
  },
): Promise<{ id: string } | null> {
  // Parse the time string into a Date for the event
  const [timePart, meridiem] = opts.timeStart.split(' ');
  const [rawHour, rawMin] = timePart.split(':').map(Number);
  let hour = rawHour % 12;
  if (meridiem?.toUpperCase() === 'PM') hour += 12;
  const min = rawMin ?? 0;

  const startIso = `${opts.date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
  const endHour  = hour + 2; // default 2h duration
  const endIso   = `${opts.date}T${String(endHour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;

  const body = {
    summary:     opts.title,
    description: opts.description
      ? `${opts.description}\n\nAdded from Whim`
      : 'Added from Whim',
    location:    opts.neighborhood,
    start: { dateTime: startIso, timeZone: 'America/New_York' },
    end:   { dateTime: endIso,   timeZone: 'America/New_York' },
  };

  const res = await fetch(`${BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('EXPIRED');
    return null;
  }

  return res.json();
}
