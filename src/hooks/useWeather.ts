import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { WeatherData, WeatherAlert } from '../types';
import { fetchWeather, getMockWeather, generateWeatherAlerts } from '../services/weatherService';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

interface UseWeatherResult {
  weather: WeatherData | null;
  alerts: WeatherAlert[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWeather(lat?: number, lon?: number): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const lastFetchRef = useRef<number>(0);

  const refresh = () => setTick(t => t + 1);

  // Fetch on mount, coord change, or manual refresh
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      try {
        const data = lat && lon ? await fetchWeather(lat, lon) : getMockWeather();
        if (!cancelled) {
          setWeather(data);
          setAlerts(generateWeatherAlerts(data));
          setError(null);
          lastFetchRef.current = Date.now();
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load weather');
          const fallback = getMockWeather();
          setWeather(fallback);
          setAlerts(generateWeatherAlerts(fallback));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [lat, lon, tick]);

  // Auto-refresh every 30 minutes while the app is active
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch when app comes back to foreground (if data is stale)
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const staleSince = Date.now() - lastFetchRef.current;
        if (staleSince > 10 * 60 * 1000) { // stale after 10 minutes in background
          refresh();
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  return { weather, alerts, isLoading, error, refresh };
}
