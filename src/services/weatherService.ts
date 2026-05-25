import axios from 'axios';
import { WeatherData, WeatherAlert, ForecastDay } from '../types';

const OWM_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY || '';

// ─── WMO weather code helpers (used by Open-Meteo) ────────────────────────

function wmoDescription(code: number): string {
  if (code === 0) return 'clear sky';
  if (code === 1) return 'mainly clear';
  if (code === 2) return 'partly cloudy';
  if (code === 3) return 'overcast clouds';
  if (code === 45 || code === 48) return 'foggy';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code >= 61 && code <= 65) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'light rain';
  if (code >= 85 && code <= 86) return 'snow showers';
  if (code >= 95) return 'thunderstorm';
  return 'partly cloudy';
}

function isGoodWeather(temp: number, description: string, pop = 0): boolean {
  const isClear = /clear|mainly clear|partly cloudy|few clouds/i.test(description);
  return temp >= 58 && temp <= 92 && isClear && pop < 0.35;
}

// ─── City name via Nominatim (free, no key) ────────────────────────────────

async function resolveCity(lat: number, lon: number): Promise<string> {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' }, timeout: 4000 }
    );
    const addr = res.data?.address ?? {};
    return addr.neighbourhood || addr.suburb || addr.city || addr.town || addr.village || 'Your area';
  } catch {
    return 'Your area';
  }
}

// ─── Open-Meteo (FREE, no API key, ECMWF models) ──────────────────────────
// https://open-meteo.com

interface OpenMeteoResponse {
  timezone: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation_probability: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
  };
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,weather_code` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=14`;

  const [weatherRes, city] = await Promise.all([
    axios.get<OpenMeteoResponse>(url, { timeout: 6000 }),
    resolveCity(lat, lon),
  ]);

  const d = weatherRes.data;
  const c = d.current;
  const temp = Math.round(c.temperature_2m);
  const desc = wmoDescription(c.weather_code);

  const current = {
    temp,
    feelsLike: Math.round(c.apparent_temperature),
    description: desc,
    icon: String(c.weather_code),
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m),
    isGoodWeather: isGoodWeather(temp, desc, (c.precipitation_probability ?? 0) / 100),
  };

  const forecast: ForecastDay[] = d.daily.time.map((date, i) => {
    const high = Math.round(d.daily.temperature_2m_max[i]);
    const low = Math.round(d.daily.temperature_2m_min[i]);
    const pop = (d.daily.precipitation_probability_max[i] ?? 0) / 100;
    const dayDesc = wmoDescription(d.daily.weather_code[i]);
    return {
      date,
      tempHigh: high,
      tempLow: low,
      description: dayDesc,
      icon: String(d.daily.weather_code[i]),
      isGoodWeather: isGoodWeather(high, dayDesc, pop),
      pop: Math.round(pop * 100) / 100,
      feelsLikeHigh: Math.round(d.daily.apparent_temperature_max[i]),
    };
  });

  return { current, forecast, city };
}

// ─── OWM fallback (only if key is a real value) ───────────────────────────

async function fetchOWMFallback(lat: number, lon: number): Promise<WeatherData> {
  const [currentRes, forecastRes] = await Promise.all([
    axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${OWM_KEY}`,
      { timeout: 6000 }
    ),
    axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&cnt=40&appid=${OWM_KEY}`,
      { timeout: 6000 }
    ),
  ]);

  const c = currentRes.data;
  const current = {
    temp: Math.round(c.main.temp),
    feelsLike: Math.round(c.main.feels_like),
    description: c.weather[0].description as string,
    icon: c.weather[0].icon as string,
    humidity: c.main.humidity as number,
    windSpeed: Math.round(c.wind.speed),
    isGoodWeather: isGoodWeather(Math.round(c.main.temp), c.weather[0].description),
  };

  // Aggregate 3-hour slots into real daily highs/lows
  const dayMap: Record<string, { highs: number[]; lows: number[]; pops: number[]; descs: string[]; icons: string[] }> = {};
  for (const item of forecastRes.data.list as any[]) {
    const date: string = item.dt_txt.split(' ')[0];
    if (!dayMap[date]) dayMap[date] = { highs: [], lows: [], pops: [], descs: [], icons: [] };
    dayMap[date].highs.push(item.main.temp_max ?? item.main.temp);
    dayMap[date].lows.push(item.main.temp_min ?? item.main.temp);
    dayMap[date].pops.push(item.pop ?? 0);
    dayMap[date].descs.push(item.weather[0].description);
    dayMap[date].icons.push(item.weather[0].icon);
  }

  const today = new Date().toISOString().split('T')[0];
  const forecast: ForecastDay[] = Object.entries(dayMap)
    .filter(([date]) => date >= today)
    .slice(0, 14)
    .map(([date, data]) => {
      const high = Math.round(Math.max(...data.highs));
      const low = Math.round(Math.min(...data.lows));
      const pop = Math.round(Math.max(...data.pops) * 100) / 100;
      const mid = Math.floor(data.descs.length / 2);
      return {
        date, tempHigh: high, tempLow: low,
        description: data.descs[mid], icon: data.icons[mid],
        isGoodWeather: isGoodWeather(high, data.descs[mid], pop),
        pop,
      };
    });

  return { current, forecast, city: c.name };
}

// ─── Public fetch ──────────────────────────────────────────────────────────

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  // Open-Meteo first — always free, no key needed, very accurate (ECMWF)
  try {
    return await fetchOpenMeteo(lat, lon);
  } catch { /* fall through */ }

  // OWM fallback only if a real API key is configured
  const isRealKey = OWM_KEY && OWM_KEY !== 'your_openweathermap_api_key_here';
  if (isRealKey) {
    try {
      return await fetchOWMFallback(lat, lon);
    } catch { /* fall through */ }
  }

  return getMockWeather();
}

// ─── Smart mock (varies by month + time of day) ───────────────────────────

export function getMockWeather(): WeatherData {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const hour = now.getHours();

  // Seasonal base temp for NYC
  const seasonalBase = [36, 40, 50, 62, 72, 80, 85, 84, 76, 64, 52, 40][month];
  // Diurnal variation: cooler in morning, peak in afternoon
  const diurnal = hour < 8 ? -8 : hour < 14 ? 0 : hour < 20 ? 6 : -4;
  const temp = seasonalBase + diurnal;

  const monthDesc = [
    'overcast clouds', 'partly cloudy', 'partly cloudy', 'light rain',
    'clear sky', 'clear sky', 'sunny', 'sunny',
    'partly cloudy', 'clear sky', 'overcast clouds', 'light snow',
  ][month];

  return {
    current: {
      temp,
      feelsLike: temp - 3,
      description: monthDesc,
      icon: '01d',
      humidity: 55,
      windSpeed: 9,
      isGoodWeather: isGoodWeather(temp, monthDesc),
    },
    forecast: Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const m = d.getMonth();
      const base = [36, 40, 50, 62, 72, 80, 85, 84, 76, 64, 52, 40][m];
      const desc = i === 2 ? 'light rain' : i === 5 ? 'overcast clouds' : i === 9 ? 'light rain' : i === 12 ? 'partly cloudy' : monthDesc;
      const pop = i === 2 ? 0.7 : i === 5 ? 0.4 : i === 9 ? 0.65 : 0.1;
      return {
        date: d.toISOString().split('T')[0],
        tempHigh: base + 6,
        tempLow: base - 8,
        description: desc,
        icon: '01d',
        isGoodWeather: isGoodWeather(base + 6, desc, pop),
        pop,
        feelsLikeHigh: base + 3,
      };
    }),
    city: 'New York',
  };
}

// ─── Alert generation ──────────────────────────────────────────────────────

export function generateWeatherAlerts(weather: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const now = new Date();
  const hour = now.getHours();
  const todayStr = now.toISOString().split('T')[0];

  for (const day of weather.forecast.slice(0, 5)) {
    const date = new Date(day.date + 'T12:00:00');
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isToday = day.date === todayStr;
    const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });
    const pop = day.pop ?? 0;
    const rainChance = Math.round(pop * 100);

    if (day.isGoodWeather && day.tempHigh >= 65) {
      const nudge = isWeekend
        ? 'Perfect weekend conditions.'
        : isToday && hour < 16
          ? 'Great excuse to get outside after work.'
          : 'Good night to be out.';
      alerts.push({
        id: `good_${day.date}`,
        type: 'great_weather',
        title: `${dayName} looks great`,
        message: `${day.tempHigh}° and ${day.description}. ${nudge}`,
        date: day.date,
        actionType: 'create_whim',
      });
    }

    if (pop >= 0.6 && isWeekend) {
      alerts.push({
        id: `rain_${day.date}`,
        type: 'bad_weather',
        title: `${dayName} — ${rainChance}% chance of rain`,
        message: `${day.description}, highs around ${day.tempHigh}°. Book somewhere with a solid indoor vibe.`,
        date: day.date,
        actionType: 'create_whim',
      });
    }

    if (!day.isGoodWeather && isWeekend && day.tempHigh < 45 && !alerts.some(a => a.id.startsWith('escape_'))) {
      alerts.push({
        id: `escape_${day.date}`,
        type: 'escape_nudge',
        title: `${dayName} looks rough — ${day.tempHigh}°`,
        message: `${day.description}. Might be a good week to check what flights are cheap.`,
        date: day.date,
        actionType: 'open_escape',
      });
    }
  }

  // Tonight nudge during the golden window
  if (hour >= 15 && hour < 20 && weather.current.isGoodWeather) {
    const alreadyToday = alerts.some(a => a.id === `good_${todayStr}`);
    if (!alreadyToday) {
      alerts.push({
        id: `tonight_${todayStr}`,
        type: 'great_weather',
        title: `${weather.current.temp}° right now`,
        message: `${weather.current.description} — solid evening to be outside. What's the plan?`,
        date: todayStr,
        actionType: 'create_whim',
      });
    }
  }

  const month = now.getMonth();
  const dayOfMonth = now.getDate();
  if (month === 2 && dayOfMonth <= 20) {
    alerts.push({ id: 'seasonal_spring', type: 'seasonal', title: 'First warm stretch incoming', message: 'Rooftop season is basically here. Go find one before everyone else does.', date: todayStr, actionType: 'create_whim' });
  } else if (month === 8 && dayOfMonth <= 15) {
    alerts.push({ id: 'seasonal_fall', type: 'seasonal', title: 'Last of the warm evenings', message: "NYC fall hits fast. Make the most of what's left before the layers come out.", date: todayStr, actionType: 'create_whim' });
  } else if (month === 11 && dayOfMonth >= 10) {
    alerts.push({ id: 'seasonal_winter', type: 'seasonal', title: 'Holiday energy is peaking', message: 'The city looks actually good right now. Get out and see it.', date: todayStr, actionType: 'create_whim' });
  }

  return alerts.slice(0, 3);
}
