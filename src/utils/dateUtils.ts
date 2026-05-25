import { format, isToday, isTomorrow, parseISO } from 'date-fns';

export function formatWhimTime(timeStart: string, timeEnd: string): string {
  return `${timeStart} – ${timeEnd}`;
}

export function formatRelativeDate(isoString: string): string {
  try {
    const date = parseISO(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  } catch {
    return '';
  }
}

export function formatFlightDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'EEE, MMM d');
  } catch {
    return dateString;
  }
}

export function getDayName(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE');
  } catch {
    return dateString;
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Hey';
}

export function getTodayLabel(): string {
  return format(new Date(), 'EEEE, MMMM d');
}
