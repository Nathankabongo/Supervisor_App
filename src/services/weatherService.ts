/**
 * Service météo utilisant l'API Open-Meteo (gratuite, sans clé API)
 * https://open-meteo.com/
 */

interface WeatherData {
  temperature: number;       // °C
  humidity: number;          // %
  windSpeed: number;         // km/h
  windDirection: number;     // degrés
  weatherCode: number;       // code WMO
  isDay: boolean;
  precipitation: number;    // mm
  pressure: number;          // hPa
  cloudCover: number;        // %
  apparentTemperature: number; // °C (ressenti)
  updatedAt: number;         // timestamp
}

interface WeatherForecast {
  time: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
}

const WEATHER_DESCRIPTIONS: Record<number, { label: string; icon: string; color: string }> = {
  0: { label: 'Ciel dégagé', icon: '☀️', color: 'text-yellow-400' },
  1: { label: 'Principalement dégagé', icon: '🌤️', color: 'text-yellow-300' },
  2: { label: 'Partiellement nuageux', icon: '⛅', color: 'text-gray-300' },
  3: { label: 'Couvert', icon: '☁️', color: 'text-gray-400' },
  45: { label: 'Brouillard', icon: '🌫️', color: 'text-gray-300' },
  48: { label: 'Brouillard givrant', icon: '🌫️', color: 'text-blue-300' },
  51: { label: 'Bruine légère', icon: '🌦️', color: 'text-blue-400' },
  53: { label: 'Bruine modérée', icon: '🌦️', color: 'text-blue-400' },
  55: { label: 'Bruine dense', icon: '🌧️', color: 'text-blue-500' },
  61: { label: 'Pluie légère', icon: '🌧️', color: 'text-blue-500' },
  63: { label: 'Pluie modérée', icon: '🌧️', color: 'text-blue-600' },
  65: { label: 'Pluie forte', icon: '🌧️', color: 'text-blue-700' },
  71: { label: 'Neige légère', icon: '🌨️', color: 'text-white' },
  73: { label: 'Neige modérée', icon: '🌨️', color: 'text-white' },
  75: { label: 'Neige forte', icon: '❄️', color: 'text-white' },
  80: { label: 'Averses légères', icon: '🌦️', color: 'text-blue-400' },
  81: { label: 'Averses modérées', icon: '🌧️', color: 'text-blue-500' },
  82: { label: 'Averses violentes', icon: '⛈️', color: 'text-blue-700' },
  95: { label: 'Orage', icon: '⛈️', color: 'text-purple-500' },
  96: { label: 'Orage avec grêle', icon: '⛈️', color: 'text-purple-600' },
  99: { label: 'Orage violent avec grêle', icon: '⛈️', color: 'text-purple-700' },
};

// Coordonnées par défaut: Dakar, Sénégal (mine type)
const DEFAULT_LAT = 14.6937;
const DEFAULT_LON = -17.4441;

class WeatherService {
  private cache: WeatherData | null = null;
  private cacheTimestamp: number = 0;
  private cacheDuration = 10 * 60 * 1000; // 10 minutes

  async getCurrentWeather(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<WeatherData> {
    // Utiliser le cache si valide
    if (this.cache && Date.now() - this.cacheTimestamp < this.cacheDuration) {
      return this.cache;
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,is_day&timezone=Africa/Dakar`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur API météo: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;

    const weather: WeatherData = {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
      precipitation: current.precipitation,
      pressure: current.surface_pressure,
      cloudCover: current.cloud_cover,
      apparentTemperature: current.apparent_temperature,
      updatedAt: Date.now(),
    };

    this.cache = weather;
    this.cacheTimestamp = Date.now();
    return weather;
  }

  async getForecast(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<WeatherForecast[]> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&forecast_days=1&timezone=Africa/Dakar`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur API météo: ${response.status}`);
    }

    const data = await response.json();
    const hourly = data.hourly;

    const forecasts: WeatherForecast[] = [];
    for (let i = 0; i < hourly.time.length; i++) {
      forecasts.push({
        time: hourly.time[i],
        temperature: hourly.temperature_2m[i],
        humidity: hourly.relative_humidity_2m[i],
        precipitation: hourly.precipitation[i],
        windSpeed: hourly.wind_speed_10m[i],
        weatherCode: hourly.weather_code[i],
      });
    }

    return forecasts;
  }

  getWeatherDescription(code: number): { label: string; icon: string; color: string } {
    return WEATHER_DESCRIPTIONS[code] || { label: 'Inconnu', icon: '🌡️', color: 'text-gray-400' };
  }

  getWindDirection(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  getAirQualityLabel(humidity: number, precipitation: number, windSpeed: number): { label: string; color: string } {
    // Estimation simplifiée basée sur les conditions météo
    if (precipitation > 5) return { label: 'Mauvais', color: 'text-red-400' };
    if (windSpeed > 30) return { label: 'Modéré', color: 'text-amber-400' };
    if (humidity > 85) return { label: 'Modéré', color: 'text-amber-400' };
    if (humidity < 30) return { label: 'Modéré', color: 'text-amber-400' };
    return { label: 'Bon', color: 'text-green-400' };
  }
}

export const weatherService = new WeatherService();
export type { WeatherData, WeatherForecast };
export default weatherService;
