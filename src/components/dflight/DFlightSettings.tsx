'use client';

import { FeatureGate } from '@/components/permissions/FeatureGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import '@/lib/i18n/config';
import axios from 'axios';
import { CheckCircle2, Eye, EyeOff, Loader2, Save, Wifi } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useTheme } from '../useTheme';

interface FormState {
  base_url: string;
  username: string;
  password: string;
  client_id: string;
  easa_operator_code: string;
}

const EMPTY: FormState = {
  base_url: '',
  username: '',
  password: '',
  client_id: '',
  easa_operator_code: '',
};

export default function DFlightSettings() {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const card  = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-gray-200';
  const inputCls = isDark ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder:text-slate-500' : '';
  const labelCls = isDark ? 'text-slate-400' : 'text-gray-500';

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/settings/dflight');
      if (data.data) {
        setForm({
          base_url:           data.data.base_url           ?? '',
          username:           data.data.username           ?? '',
          password:           '',
          client_id:          data.data.client_id          ?? '',
          easa_operator_code: data.data.easa_operator_code ?? '',
        });
        setPasswordSet(data.data.password_set ?? false);
      }
    } catch {
      toast.error(t('dflight.settings.toast.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.base_url.trim() || !form.username.trim() || !form.client_id.trim()) {
      toast.error(t('dflight.settings.toast.validationError'));
      return;
    }
    if (!form.password.trim() && !passwordSet) {
      toast.error(t('dflight.settings.toast.passwordRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        base_url:           form.base_url.trim(),
        username:           form.username.trim(),
        client_id:          form.client_id.trim(),
        easa_operator_code: form.easa_operator_code.trim() || null,
        password:           form.password.trim() || '__KEEP__',
      };
      await axios.post('/api/settings/dflight', payload);
      setSaved(true);
      setPasswordSet(true);
      setForm((f) => ({ ...f, password: '' }));
      setTimeout(() => setSaved(false), 2500);
      toast.success(t('dflight.settings.toast.saved'));
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? t('dflight.settings.toast.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const field = (
    key: keyof FormState,
    labelText: string,
    placeholder: string,
    opts?: { mono?: boolean },
  ) => (
    <div className="space-y-1.5">
      <Label className={`text-xs ${labelCls}`}>{labelText}</Label>
      <Input
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className={`h-9 text-xs ${opts?.mono ? 'font-mono' : ''} ${inputCls}`}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border p-6 space-y-5 ${card}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
            <Wifi className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('dflight.settings.title')}
            </h2>
            <p className={`text-xs ${labelCls}`}>{t('dflight.settings.subtitle')}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-9 rounded-lg animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`} />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Connection */}
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {t('dflight.settings.sectionConnection')}
              </p>
              <div className="grid gap-4 sm:grid-cols-1 max-w-md">
                {field('base_url', t('dflight.settings.baseUrl'), t('dflight.settings.baseUrlPlaceholder'), { mono: false })}
              </div>
            </div>

            {/* Credentials */}
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {t('dflight.settings.sectionCredentials')}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {field('username', t('dflight.settings.username'), t('dflight.settings.usernamePlaceholder'))}

                {/* Password */}
                <div className="space-y-1.5">
                  <Label className={`text-xs ${labelCls}`}>
                    {t('dflight.settings.password')}
                    {passwordSet && (
                      <span className={`ml-2 text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        ({t('dflight.settings.passwordSet')})
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      value={form.password}
                      onChange={set('password')}
                      placeholder={passwordSet ? t('dflight.settings.passwordKeep') : t('dflight.settings.passwordPlaceholder')}
                      type={showPassword ? 'text' : 'password'}
                      className={`h-9 text-xs pr-9 ${inputCls}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {field('client_id', t('dflight.settings.clientId'), t('dflight.settings.clientIdPlaceholder'), { mono: false })}
              </div>
            </div>

            {/* Operator */}
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Operator
              </p>
              <div className="max-w-xs">
                {field('easa_operator_code', 'EASA Operator Code', 'e.g. ITAhhd2jm2pbdinl', { mono: false })}
              </div>
              <p className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Your EASA operator registration code issued by ENAC. Used to filter drones in the fleet.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <FeatureGate feature="settings_integrations" require="edit">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || loading}
              className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
            >
              {saving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : saved
                  ? <CheckCircle2 className="h-3.5 w-3.5" />
                  : <Save className="h-3.5 w-3.5" />}
              {saved ? t('dflight.settings.saved') : t('dflight.settings.save')}
            </Button>
          </FeatureGate>
        </div>
      </div>
    </div>
  );
}
