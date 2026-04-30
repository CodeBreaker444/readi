'use client';

import { useEffect, useState } from 'react';

interface WeatherData {
  temperature_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  weather_code: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
}

interface WeatherPanelProps {
  lat: number;
  lon: number;
  isDark: boolean;
}

function windDir(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

export default function WeatherPanel({ lat, lon, isDark }: WeatherPanelProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lon) return;
    setLoading(true);
    fetch(`/api/drone-atc/weather?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d) => { setWeather(d.current); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lat, lon]);

  if (loading) {
    return <div className="text-xs text-slate-400 px-1">Loading weather…</div>;
  }

  if (!weather) {
    return <div className="text-xs text-slate-400 px-1">Weather unavailable</div>;
  }

  return (
    <div className={`rounded-lg border p-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Weather
      </p>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{weatherEmoji(weather.weather_code)}</span>
        <div>
          <p className={`text-lg font-bold leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {Math.round(weather.temperature_2m)}°C
          </p>
          <p className="text-xs text-slate-400">
            Feels {Math.round(weather.apparent_temperature)}°C
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <span className="text-slate-400">Wind </span>
          <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {weather.wind_speed_10m.toFixed(1)} m/s {windDir(weather.wind_direction_10m)}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Humidity </span>
          <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {weather.relative_humidity_2m}%
          </span>
        </div>
      </div>
    </div>
  );
}
