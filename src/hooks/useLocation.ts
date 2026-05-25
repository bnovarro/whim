import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  lat: number | null;
  lon: number | null;
  city: string | null;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
}

// Default to midtown Manhattan when location unavailable
const DEFAULT_LAT = 40.7549;
const DEFAULT_LON = -73.984;

export function useLocation(): LocationState {
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [city, setCity] = useState<string | null>('New York');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLat(DEFAULT_LAT);
        setLon(DEFAULT_LON);
        setError('Location permission denied — using Manhattan defaults');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(location.coords.latitude);
      setLon(location.coords.longitude);
      setError(null);

      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        if (place) setCity(place.city || place.region || 'New York');
      } catch {
        // best-effort reverse geocode
      }
    } catch {
      setLat(DEFAULT_LAT);
      setLon(DEFAULT_LON);
      setError('Could not get location');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    requestPermission();
  }, []);

  return { lat: lat ?? DEFAULT_LAT, lon: lon ?? DEFAULT_LON, city, isLoading, error, requestPermission };
}
