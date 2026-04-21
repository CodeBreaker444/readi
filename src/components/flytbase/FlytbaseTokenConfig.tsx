'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/useTheme';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import {
  HiCheckCircle,
  HiEye,
  HiEyeOff,
  HiShieldCheck,
  HiTrash,
  HiUser,
} from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface FlytbaseUserInfo {
  id: string | number;
  email: string;
  name?: string;
  username?: string;
  phone?: string;
  organization?: string;
}

type Step = 'idle' | 'verifying' | 'confirmed' | 'saving';

export function FlytbaseTokenConfig() {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [orgIdInput, setOrgIdInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [verifiedUser, setVerifiedUser] = useState<FlytbaseUserInfo | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchTokenStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/flytbase/token');
      setHasToken(res.data.hasToken ?? false);
    } catch {
      setHasToken(false);
    }
  }, []);

  useEffect(() => {
    fetchTokenStatus();
  }, [fetchTokenStatus]);

  async function handleVerify() {
    if (!tokenInput.trim()) {
      toast.error(t('flytbase.token.toasts.enterToken'));
      return;
    }
    if (!orgIdInput.trim()) {
      toast.error(t('flytbase.token.toasts.enterOrgId'));
      return;
    }
    setStep('verifying');
    setVerifiedUser(null);

    try {
      const res = await axios.post('/api/flytbase/verify', {
        token: tokenInput.trim(),
        orgId: orgIdInput.trim(),
      });
      setVerifiedUser(res.data.flytbaseUser);
      setStep('confirmed');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        t('flytbase.token.toasts.verifyFailed');
      toast.error(msg);
      setStep('idle');
    }
  }

  async function handleSave() {
    if (!verifiedUser) return;
    setStep('saving');

    try {
      await axios.post('/api/flytbase/token', {
        token: tokenInput.trim(),
        orgId: orgIdInput.trim(),
      });
      toast.success(t('flytbase.token.toasts.saveSuccess'));
      setHasToken(true);
      setTokenInput('');
      setOrgIdInput('');
      setVerifiedUser(null);
      setStep('idle');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('flytbase.token.toasts.saveFailed');
      toast.error(msg);
      setStep('confirmed');
    }
  }

  function handleCancel() {
    setTokenInput('');
    setOrgIdInput('');
    setVerifiedUser(null);
    setStep('idle');
    if (!hasToken) return;
    setHasToken(true);
  }

  async function handleRemove() {
    setIsRemoving(true);
    try {
      await axios.delete('/api/flytbase/token');
      toast.success(t('flytbase.token.toasts.removed'));
      setHasToken(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t('flytbase.token.toasts.removeFailed'));
    } finally {
      setIsRemoving(false);
    }
  }

  const cardBase = isDark
    ? 'bg-[#0c0f1a] border-slate-800'
    : 'bg-white border-slate-200 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputClass = isDark
    ? 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-violet-500'
    : 'bg-white border-slate-300 text-slate-900';
  const skeletonClass = isDark ? 'bg-slate-800' : 'bg-slate-200';

  const isLoading = hasToken === null;
  const showForm = !isLoading && (!hasToken || step !== 'idle');
  const showConfirm = step === 'confirmed' || step === 'saving';

  return (
    <div className={`rounded-xl border transition-all ${cardBase}`}>
      <div className="p-5 sm:p-8 pb-0 sm:pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600/10 flex items-center justify-center shrink-0">
              <HiShieldCheck className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h2 className={`text-sm font-semibold leading-tight ${textPrimary}`}>
                {t('flytbase.token.title')}
              </h2>
              <p className={`text-xs mt-0.5 leading-relaxed ${textSecondary}`}>
                {t('flytbase.token.subtitle')}
              </p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className={`h-5 w-24 rounded-full ${skeletonClass}`} />
          ) : (
            <Badge
              variant="outline"
              className={`shrink-0 ${
                hasToken
                  ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                  : 'border-slate-500/40 text-slate-400 bg-slate-500/10'
              }`}
            >
              {hasToken ? t('flytbase.token.connected') : t('flytbase.token.notConnected')}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-8 pt-5 space-y-5">
        <div
          className={`flex items-center gap-2.5 rounded-lg p-3 text-xs leading-relaxed ${
            isDark
              ? 'bg-violet-950/30 border border-violet-800/30 text-violet-300'
              : 'bg-violet-50 border border-violet-200 text-violet-700'
          }`}
        >
          <HiShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            {t('flytbase.token.secureNote')}
          </span>
        </div>

        {isLoading && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className={`h-3.5 w-20 ${skeletonClass}`} />
              <Skeleton className={`h-9 w-full rounded-md ${skeletonClass}`} />
            </div>
            <div className="space-y-2">
              <Skeleton className={`h-3.5 w-28 ${skeletonClass}`} />
              <Skeleton className={`h-9 w-full rounded-md ${skeletonClass}`} />
              <Skeleton className={`h-3 w-56 ${skeletonClass}`} />
            </div>
            <div className="flex gap-2">
              <Skeleton className={`h-8 w-24 rounded-md ${skeletonClass}`} />
            </div>
          </div>
        )}

        {!isLoading && hasToken && step === 'idle' && (
          <div className="space-y-4">
            <div
              className={`flex items-center gap-3 rounded-lg px-4 py-3 border ${
                isDark
                  ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <HiCheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs">
                {t('flytbase.token.savedNote')}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHasToken(false)}
                className={`h-8 text-xs gap-1.5 ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t('flytbase.token.replaceToken')}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRemoving}
                    className="h-8 text-xs gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                  >
                    <HiTrash className="w-3.5 h-3.5" />
                    {isRemoving ? t('flytbase.token.removing') : t('flytbase.token.remove')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent
                  className={
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-white border-slate-200'
                  }
                >
                  <AlertDialogHeader>
                    <AlertDialogTitle className={textPrimary}>
                      {t('flytbase.token.removeTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription className={textSecondary}>
                      {t('flytbase.token.removeDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      className={`text-xs ${
                        isDark
                          ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-200'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {t('flytbase.token.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemove}
                      className="text-xs bg-red-600 hover:bg-red-500 text-white"
                    >
                      <HiTrash className="w-3.5 h-3.5 mr-1.5" />
                      {t('flytbase.token.yesRemove')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {showForm && !showConfirm && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="flytbase-token"
                className={`text-xs font-medium ${textPrimary}`}
              >
                {t('flytbase.token.apiToken')}
              </Label>
              <div className="relative">
                <Input
                  id="flytbase-token"
                  type={showToken ? 'text' : 'password'}
                  placeholder={t('flytbase.token.apiTokenPlaceholder')}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.trim())}
                  disabled={step === 'verifying'}
                  className={`pr-10 text-sm font-mono ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSecondary} hover:opacity-80 transition-opacity`}
                >
                  {showToken ? (
                    <HiEyeOff className="w-4 h-4" />
                  ) : (
                    <HiEye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="flytbase-org"
                className={`text-xs font-medium ${textPrimary}`}
              >
                {t('flytbase.token.orgId')}
              </Label>
              <Input
                id="flytbase-org"
                type="text"
                placeholder={t('flytbase.token.orgIdPlaceholder')}
                value={orgIdInput}
                onChange={(e) => setOrgIdInput(e.target.value.trim())}
                disabled={step === 'verifying'}
                className={`text-sm font-mono ${inputClass}`}
              />
              <p className={`text-[11px] leading-relaxed ${textSecondary}`}>
                {t('flytbase.token.orgIdHint')}
              </p>
            </div>

            <Separator className={isDark ? 'bg-slate-800' : 'bg-slate-200'} />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleVerify}
                disabled={
                  step === 'verifying' ||
                  !tokenInput.trim() ||
                  !orgIdInput.trim()
                }
                className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
              >
                {step === 'verifying' ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                    {t('flytbase.token.verifying')}
                  </>
                ) : (
                  t('flytbase.token.verify')
                )}
              </Button>
              {hasToken && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={step === 'verifying'}
                  className={`h-8 text-xs ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {t('flytbase.token.cancel')}
                </Button>
              )}
            </div>
          </div>
        )}

        {showConfirm && verifiedUser && (
          <div className="space-y-4">
            <div
              className={`rounded-lg border overflow-hidden ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`flex items-center gap-2 px-4 py-3 border-b ${
                  isDark ? 'border-slate-700' : 'border-slate-200'
                }`}
              >
                <HiCheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className={`text-xs font-medium ${textPrimary}`}>
                  {t('flytbase.token.verifiedTitle')}
                </span>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {verifiedUser.name && (
                    <UserInfoRow
                      label={t('flytbase.token.fields.name')}
                      value={verifiedUser.name}
                      isDark={isDark}
                    />
                  )}
                  {verifiedUser.username && (
                    <UserInfoRow
                      label={t('flytbase.token.fields.username')}
                      value={verifiedUser.username}
                      isDark={isDark}
                    />
                  )}
                  {verifiedUser.phone && (
                    <UserInfoRow
                      label={t('flytbase.token.fields.phone')}
                      value={verifiedUser.phone}
                      isDark={isDark}
                    />
                  )}
                  {verifiedUser.organization && (
                    <UserInfoRow
                      label={t('flytbase.token.fields.organization')}
                      value={verifiedUser.organization}
                      isDark={isDark}
                    />
                  )}
                  <UserInfoRow
                    label={t('flytbase.token.fields.flytbaseId')}
                    value={String(verifiedUser.id)}
                    isDark={isDark}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={step === 'saving'}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <HiUser className="w-3.5 h-3.5 mr-1.5" />
                {step === 'saving' ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                    {t('flytbase.token.saving')}
                  </>
                ) : (
                  t('flytbase.token.saveToken')
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={step === 'saving'}
                className={`h-8 text-xs ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {t('flytbase.token.cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserInfoRow({
  label,
  value,
  isDark,
}: {
  label: string;
  value: string;
  isDark: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`text-[10px] uppercase tracking-wider font-medium ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        {label}
      </span>
      <span
        className={`text-xs font-mono truncate ${
          isDark ? 'text-slate-200' : 'text-slate-700'
        }`}
      >
        {value}
      </span>
    </div>
  );
}