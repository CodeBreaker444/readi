'use client';
import { data } from '@/src/lib/mockdata';
import React, { useEffect, useState } from 'react';
import { useTheme } from '../useTheme';
import AreaGauges from './AreaGauges';
import IndicatorCards from './IndicatorCards';
import IndicatorTrendChart from './IndicatorTrendChart';
import SafetyHealthGauge from './SafetyHealthGauge';
import SHITrendChart from './SHITrendChart';

interface SHIData {
  code: number;
  safety_index: number;
  data: Record<string, any[]>;
}

interface TrendData {
  code: number;
  labels: string[];
  values: number[];
  target?: number;
}

interface SHIIndexProps {
  isDark?: boolean;
}

const SHIIndex: React.FC<SHIIndexProps> = () => {
  const { isDark } = useTheme();
  const [shiData, setSHIData] = useState<SHIData | null>(null);
  const [shiTrend, setSHITrend] = useState<TrendData | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [indicatorTrend, setIndicatorTrend] = useState<TrendData | null>(null);
  const [allIndicators, setAllIndicators] = useState<string[]>([]);
  //   const [loading, setLoading] = useState(true);

  // Load main dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      //   try {
      // const res = await fetch('/api/dashboard/getSPIKPIData');
      // const payload = await res.json();

      // if (payload.code === 1) {
      setSHIData(data.mockData);

      // Extract all unique indicator names
      const indicators = new Set<string>();
      Object.values(data.mockData.data).forEach((areaIndicators: any) => {
        areaIndicators.forEach((ind: any) => {
          indicators.add(ind.indicator_name);
        });
      });

      const sortedIndicators = Array.from(indicators).sort();
      setAllIndicators(sortedIndicators);

      if (sortedIndicators.length > 0) {
        setSelectedIndicator(sortedIndicators[0]);
      }
      // }
      //   } catch (error) {
      //     console.error('Error loading dashboard data:', error);
      //   } finally {
      //     setLoading(false);
      //   }
    };

    loadDashboardData();
  }, []);

  // Load SHI trend data
  useEffect(() => {
    const loadSHITrend = async () => {
      //   try {
      // const res = await fetch('/api/dashboard/getSHITrend');
      // const data = await res.json();

      setSHITrend(data.shiIndexData);
      //   } catch (error) {
      //     console.error('Error loading SHI trend:', error);
      //   }
    };

    loadSHITrend();
  }, []);

  // Load indicator trend when selection changes
  useEffect(() => {
    if (!selectedIndicator) return;

    const loadIndicatorTrend = async () => {
      try {
        // const res = await fetch(`/api/dashboard/getSPIKPITrend?name=${encodeURIComponent(selectedIndicator)}`);
        // const data = await res.json();

        // if (data.code === 1) {
        setIndicatorTrend(data.getSPIKPITrend);
        // }
      } catch (error) {
        console.error('Error loading indicator trend:', error);
      }
    };

    loadIndicatorTrend();
  }, []);

  //   if (loading) {
  //     return (
  //       <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
  //         <div className="text-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
  //           <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading SHI Dashboard...</p>
  //         </div>
  //       </div>
  //     );
  //   }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Safety Health Index (SHI) - EASA Model
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Monitoring safety performance indicators and key performance indicators
          </p>
        </div>
      </div>

      {/* Main SHI Gauge and Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-4">
          {shiData && (
            <SafetyHealthGauge
              value={shiData.safety_index}
              isDark={isDark}
            />
          )}
        </div>

        <div className="lg:col-span-8">
          {shiTrend && (
            <SHITrendChart
              labels={shiTrend.labels}
              values={shiTrend.values}
              isDark={isDark}
            />
          )}
        </div>
      </div>

      {/* Area Gauges */}
      {shiData && (
        <div className="mb-6">
          <AreaGauges
            dataByArea={shiData.data}
            isDark={isDark}
          />
        </div>
      )}

      {/* Indicator Cards */}
      {shiData && (
        <div className="mb-6">
          <IndicatorCards
            dataByArea={shiData.data}
            isDark={isDark}
          />
        </div>
      )}

      {/* Indicator Trend Selection and Chart */}
      <div className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
        <div className="mb-4">
          <label
            htmlFor="indicatorSelect"
            className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
          >
            Indicator Trend:
          </label>
          <select
            id="indicatorSelect"
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            className={`w-full md:w-auto px-4 py-2 rounded-lg border ${isDark
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            {allIndicators.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {indicatorTrend && (
          <IndicatorTrendChart
            indicatorName={selectedIndicator}
            labels={indicatorTrend.labels}
            values={indicatorTrend.values}
            target={indicatorTrend.target || 100}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
};

export default SHIIndex;