'use client';

import DccIntegrationSettings from '@/components/settings/DccIntegrationSettings';
import { useTheme } from '@/components/useTheme';

export default function IntegrationsSettingsPage() {
  const { isDark } = useTheme();
  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className={`border-b px-6 py-4 ${isDark ? 'bg-slate-900/80 border-slate-700/60' : 'bg-white/80 border-gray-200'}`}>
        <div className="mx-auto flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-violet-600" />
          <div>
            <h1 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Integrations
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Configure external system connections
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto px-6 py-8 max-w-5xl">
        <DccIntegrationSettings />
      </div>
    </div>
  );
}
