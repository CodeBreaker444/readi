'use client';

import '@/lib/i18n/config';
import { PinSetup } from '@/components/authorization/PinSetup';
import ApiKeyManager from '@/components/settings/ApiKeyManager';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface KeyInfo {
  key_fingerprint: string | null;
  public_key:      string;
  created_at:      string;
}

export default function SecuritySettingsPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [hasPin, setHasPin]   = useState<boolean | null>(null);

  const loadKey = async () => {
    try {
      const { data } = await axios.get('/api/authorization/my-key');
      setHasPin(data.has_pin);
      setKeyInfo(data.data ?? null);
    } catch {
      // non-critical — page still renders without key info
    }
  };

  useEffect(() => { loadKey(); }, []);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className={`border-b px-6 py-4 ${isDark ? 'bg-slate-900/80 border-slate-700/60' : 'bg-white/80 border-gray-200'}`}>
        <div className="mx-auto flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-violet-600" />
          <div>
            <h1 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('settings.security.title')}
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('settings.security.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto px-6 py-8 space-y-8">
        {/* Authorization PIN */}
        <section>
          <div className="mb-3">
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('settings.security.pin.title')}
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('settings.security.pin.description')}
            </p>
          </div>

          {hasPin !== null && (
            <PinSetup
              isDark={isDark}
              existingFingerprint={keyInfo?.key_fingerprint ?? null}
              onSuccess={loadKey}
            />
          )}

          {hasPin && keyInfo && (
            <div className={`mt-3 rounded-lg border px-4 py-3 text-xs ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{t('settings.security.pin.publicKeyFingerprint')}</span>
                  <span className={`font-mono ${isDark ? 'text-violet-400' : 'text-violet-700'}`}>
                    {keyInfo.key_fingerprint ?? '—'}
                  </span>
                </div>
                <div>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{t('settings.security.pin.created')}</span>
                  <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    {new Date(keyInfo.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* API Keys */}
        <section>
          <div className="mb-3">
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('settings.security.apiKeys.title')}
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('settings.security.apiKeys.subtitle')}
            </p>
          </div>
          <ApiKeyManager />
        </section>
      </div>
    </div>
  );
}
