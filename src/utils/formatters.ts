export function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`;
}

export function formatSavings(savingsPercent: number): string {
  return `${savingsPercent}% off avg`;
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) return 'Right here';
  if (miles < 1) return `${Math.round(miles * 10) / 10} mi`;
  return `${Math.round(miles * 10) / 10} mi away`;
}

export function formatPriceLevel(level: 1 | 2 | 3 | 4): string {
  return '$'.repeat(level);
}

export function formatGroupSize(size: number): string {
  if (size === 1) return 'Solo';
  if (size === 2) return '2 people';
  return `${size} people`;
}

export function formatTripLength(min: number, max: number): string {
  if (min === max) return `${min} days`;
  return `${min}–${max} days`;
}

export function formatAttendeeCount(confirmed: number, total: number): string {
  if (confirmed === 0) return 'No one confirmed yet';
  if (confirmed === total) return `${confirmed} confirmed`;
  return `${confirmed}/${total} confirmed`;
}

export function formatStops(stops: number): string {
  if (stops === 0) return 'Nonstop';
  if (stops === 1) return '1 stop';
  return `${stops} stops`;
}

export function weatherEmoji(description: string): string {
  const d = description.toLowerCase();
  if (/thunder/.test(d)) return '⛈️';
  if (/rain|drizzle/.test(d)) return '🌧️';
  if (/snow/.test(d)) return '❄️';
  if (/fog|mist|haze/.test(d)) return '🌫️';
  if (/clear|sunny/.test(d)) return '☀️';
  if (/partly|few clouds/.test(d)) return '⛅';
  if (/cloud/.test(d)) return '☁️';
  return '🌤️';
}

export function weatherIcon(description: string): string {
  const d = description.toLowerCase();
  if (/thunder/.test(d)) return 'thunderstorm-outline';
  if (/rain|drizzle/.test(d)) return 'rainy-outline';
  if (/snow/.test(d)) return 'snow-outline';
  if (/fog|mist|haze/.test(d)) return 'cloudy-night-outline';
  if (/clear|sunny/.test(d)) return 'sunny-outline';
  if (/partly|few clouds/.test(d)) return 'partly-sunny-outline';
  if (/cloud/.test(d)) return 'cloud-outline';
  return 'partly-sunny-outline';
}
