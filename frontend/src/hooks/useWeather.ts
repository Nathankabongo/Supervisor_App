import { useState, useEffect } from 'react';
import { weatherService, WeatherData } from '../services/weatherService';

interface UseWeatherReturn {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  description: { label: string; icon: string; color: string } | null;
  airQuality: { label: string; color: string } | null;
  windDirection: string;
}

export function useWeather(lat?: number, lon?: number): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchWeather = async () => {
      try {
        const data = await weatherService.getCurrentWeather(lat, lon);
        if (mounted) {
          setWeather(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchWeather();

    // Rafraîchir toutes les 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [lat, lon]);

  const description = weather ? weatherService.getWeatherDescription(weather.weatherCode) : null;

  const airQuality = weather
    ? weatherService.getAirQualityLabel(weather.humidity, weather.precipitation, weather.windSpeed)
    : null;

  const windDirection = weather ? weatherService.getWindDirection(weather.windDirection) : '-';

  return { weather, isLoading, error, description, airQuality, windDirection };
}
