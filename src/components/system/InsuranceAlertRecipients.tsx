'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { ChevronDown, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface OwnerUser {
  user_id: number;
  fullname: string;
  email: string | null;
  user_role: string | null;
  active: boolean;
}

interface Props {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  alertDaysBefore: string;
  onAlertDaysBeforeChange: (value: string) => void;
  isDark?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InsuranceAlertRecipients({
  emails, onEmailsChange, alertDaysBefore, onAlertDaysBeforeChange, isDark = false,
}: Props) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [emailError, setEmailError] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/system/users/list')
      .then(({ data }) => { if (data.code === 1) setUsers(data.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleUser = (user: OwnerUser) => {
    if (!user.active || !user.email) return;
    const email = user.email;
    if (emails.some((e) => e.toLowerCase() === email.toLowerCase())) {
      onEmailsChange(emails.filter((e) => e.toLowerCase() !== email.toLowerCase()));
    } else {
      onEmailsChange([...emails, email]);
    }
  };

  const removeEmail = (email: string) => onEmailsChange(emails.filter((e) => e !== email));

  const addManualEmail = () => {
    const value = manualEmail.trim();
    if (!value) return;
    if (!EMAIL_RE.test(value)) { setEmailError(true); return; }
    if (!emails.some((e) => e.toLowerCase() === value.toLowerCase())) {
      onEmailsChange([...emails, value]);
    }
    setManualEmail('');
    setEmailError(false);
  };

  const inputCls = isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : '';
  const labelCls = `pb-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`;
  const selectedCount = emails.length;

  return (
    <>
      <div className="col-span-1 sm:col-span-8">
        <Label className={labelCls}>{t('systems.components.common.insurance.notifyUsers')}</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full h-9 flex items-center justify-between rounded-md border px-3 text-sm cursor-pointer',
                isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-background border-input',
              )}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Users className="h-3.5 w-3.5 shrink-0 opacity-60" />
                {selectedCount > 0
                  ? t('systems.components.common.insurance.notifyUsersSelected', { count: selectedCount })
                  : t('systems.components.common.insurance.notifyUsersPlaceholder')}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-87.5 max-h-72 overflow-y-auto">
            {loading && (
              <div className="px-2 py-3 text-xs text-muted-foreground">{t('systems.components.common.loading')}</div>
            )}
            {!loading && users.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">{t('systems.components.common.insurance.notifyUsersEmpty')}</div>
            )}
            {!loading && users.map((user) => {
              const disabled = !user.active || !user.email;
              const checked = !!user.email && emails.some((e) => e.toLowerCase() === user.email!.toLowerCase());
              return (
                <DropdownMenuCheckboxItem
                  key={user.user_id}
                  checked={checked}
                  disabled={disabled}
                  onSelect={(e) => { e.preventDefault(); toggleUser(user); }}
                  className={disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                >
                  <span className="flex items-center justify-between gap-2 w-full min-w-0">
                    <span className="flex flex-col min-w-0">
                      <span className="truncate">{user.fullname}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{user.email ?? '—'}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {user.user_role && (
                        <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase', isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600')}>
                          {user.user_role}
                        </span>
                      )}
                      {!user.active && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-red-100 text-red-500">
                          {t('systems.components.common.insurance.inactiveUser')}
                        </span>
                      )}
                    </span>
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="col-span-1 sm:col-span-4">
        <Label className={labelCls}>{t('systems.components.common.insurance.daysBefore')}</Label>
        <Input
          type="number"
          min={1}
          max={365}
          className={inputCls}
          value={alertDaysBefore}
          onChange={(e) => onAlertDaysBeforeChange(e.target.value)}
        />
        <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-muted-foreground'}`}>
          {t('systems.components.common.insurance.daysBeforeHint')}
        </p>
      </div>

      <div className="col-span-1 sm:col-span-12">
        <Label className={labelCls}>
          {t('systems.components.common.insurance.additionalEmails')}{' '}
          <span className="text-[10px] font-normal opacity-60">{t('systems.components.common.insurance.additionalEmailsHint')}</span>
        </Label>
        <div className="flex gap-2">
          <Input
            value={manualEmail}
            onChange={(e) => { setManualEmail(e.target.value); setEmailError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualEmail(); } }}
            placeholder={t('systems.components.common.insurance.addEmailPlaceholder')}
            className={inputCls}
          />
          <button
            type="button"
            onClick={addManualEmail}
            className="h-9 px-3 rounded-md text-xs font-medium bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            {t('systems.components.common.insurance.addEmail')}
          </button>
        </div>
        {emailError && <p className="text-[10px] mt-1 text-red-500">{t('systems.components.common.insurance.invalidEmail')}</p>}

        {emails.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {emails.map((email) => {
              const matchedUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
              return (
                <span
                  key={email}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                    isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-violet-50 border-violet-200 text-violet-700',
                  )}
                >
                  {matchedUser?.fullname ?? email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="ml-0.5 hover:opacity-70 rounded-full p-0.5 transition-opacity cursor-pointer"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
