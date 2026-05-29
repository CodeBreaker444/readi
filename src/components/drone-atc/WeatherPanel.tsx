'use client';

import { useEffect, useState } from 'react';
import { MdAir } from 'react-icons/md';
import { WiDayCloudy, WiDaySunny, WiRain, WiSnow, WiThunderstorm } from 'react-icons/wi';

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

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  const cls = className ?? 'w-8 h-8';
  if (code === 0) return <WiDaySunny className={`${cls} text-amber-400`} />;
  if (code <= 3) return <WiDayCloudy className={`${cls} text-slate-400`} />;
  if (code <= 67) return <WiRain className={`${cls} text-blue-400`} />;
  if (code <= 77) return <WiSnow className={`${cls} text-sky-300`} />;
  if (code <= 82) return <WiRain className={`${cls} text-blue-500`} />;
  return <WiThunderstorm className={`${cls} text-amber-500`} />;
}

export default function WeatherPanel({ lat, lon, isDark }: WeatherPanelProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lon) return;
    setLoading(true);
    fetch(`/api/drone-atc/weather?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d) => {
        setWeather(d.current);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lat, lon]);

  if (loading) {
    return (
      <div
        className={`rounded-2xl border p-3 animate-pulse ${
          isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/80 border-slate-300'
        }`}
      >
        <div className={`h-3 w-16 rounded mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
        <div className={`h-6 w-20 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
      </div>
    );
  }

  if (!weather) {
    return (
      <div
        className={`rounded-2xl border p-3 text-xs ${
          isDark ? 'bg-slate-800/40 border-slate-700/50 text-slate-500' : 'bg-white/80 border-slate-300 text-slate-400'
        }`}
      >
        Weather unavailable
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-3 ${
        isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white/80 border-slate-300'
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        Weather
      </p>

      <div className="flex items-center gap-2.5 mb-2.5">
        <WeatherIcon code={weather.weather_code} />
        <div>
          <p className={`text-lg font-bold leading-none tabular-nums ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {Math.round(weather.temperature_2m)}&deg;C
          </p>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Feels {Math.round(weather.apparent_temperature)}&deg;C
          </p>
        </div>
      </div>

      <div className={`border-t pt-2 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <MdAir className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Wind</span>
            <span className={`font-semibold font-mono tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {weather.wind_speed_10m.toFixed(1)}<span className="text-[9px] ml-px">m/s</span>{' '}
              {windDir(weather.wind_direction_10m)}
            </span>
          </div>
          <div>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Humidity </span>
            <span className={`font-semibold font-mono tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {weather.relative_humidity_2m}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}