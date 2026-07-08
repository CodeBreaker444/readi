'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UpdatePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
  targetLabel: string;
  isDark: boolean;
}

export function UpdatePasswordModal({ isOpen, onClose, onSubmit, targetLabel, isDark }: UpdatePasswordModalProps) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/;

  const handleClose = () => {
    setNewPassword(''); setConfirmPassword(''); setError('');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (!passwordRules.test(newPassword)) {
      setError(t('team.updatePasswordModal.rules'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('team.updatePasswordModal.mismatch'));
      return;
    }
    setSaving(true);
    try {
      await onSubmit(newPassword);
      handleClose();
    } catch (e: any) {
      setError(e?.message || t('team.updatePasswordModal.failed'));
    } finally {
      setSaving(false);
    }
  };

  const labelClass = `text-xs font-medium pb-1.5 block ${isDark ? 'text-slate-400' : 'text-slate-600'}`;
  const inputClass = `h-9 text-sm pr-9 ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-600' : ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-slate-800 border-slate-700 text-white' : ''}`}>
        <DialogHeader>
          <DialogTitle className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('team.updatePasswordModal.title')}
          </DialogTitle>
          <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {t('team.updatePasswordModal.subtitle', { target: targetLabel })}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className={labelClass}>{t('team.updatePasswordModal.newPassword')}</Label>
            <div className="relative">
              <Input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder={t('team.updatePasswordModal.newPasswordPlaceholder')}
                className={inputClass}
              />
              <button type="button" onClick={() => setShowNewPw((v) => !v)}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <Label className={labelClass}>{t('team.updatePasswordModal.confirmPassword')}</Label>
            <div className="relative">
              <Input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder={t('team.updatePasswordModal.confirmPasswordPlaceholder')}
                className={inputClass}
              />
              <button type="button" onClick={() => setShowConfirmPw((v) => !v)}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}
              className={isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={saving || !newPassword || !confirmPassword}
              className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? t('team.updatePasswordModal.saving') : t('team.updatePasswordModal.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
