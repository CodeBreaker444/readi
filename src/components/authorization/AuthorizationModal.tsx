'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { decryptPrivateKey } from '@/lib/crypto/keyManagement';
import { signTransactionJWT } from '@/lib/crypto/transactionSign';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { AlertTriangle, Loader2, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PinInput } from './PinInput';

export interface AuthContext {
  actionType: string;
  entityType: string;
  entityId?: string;
  label: string;
  details?: Record<string, unknown>;
}

interface KeyData {
  encrypted_private_key: string;
  public_key: string;
  salt: string;
  iv: string;
  key_fingerprint: string | null;
}

interface Props {
  open: boolean;
  context: AuthContext;
  onSuccess: (transactionSignId: string) => void;
  onCancel: () => void;
  isDark?: boolean;
}

const EMPTY_PIN = Array(6).fill('') as string[];

export function AuthorizationModal({ open, context, onSuccess, onCancel, isDark }: Props) {
  const [pin, setPin] = useState<string[]>(EMPTY_PIN);
  const [keyData, setKeyData] = useState<KeyData | null>(null);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didFetch = useRef(false);

  useEffect(() => {
    if (!open) {
      setPin(EMPTY_PIN);
      setError(null);
      didFetch.current = false;
      return;
    }

    if (didFetch.current) return;
    didFetch.current = true;

    (async () => {
      try {
        const { data } = await axios.get('/api/authorization/my-key');
        setHasPin(data.has_pin);
        setKeyData(data.data ?? null);
      } catch {
        setError('Failed to load authorization data. Please try again.');
      }
    })();
  }, [open]);

  const pinFull = pin.every(d => d !== '');

  useEffect(() => {
    if (pinFull && keyData && !loading) {
      handleAuthorize();
    }
  }, [pinFull]);

  const handleAuthorize = async () => {
    if (!keyData) return;
    setLoading(true);
    setError(null);

    try {
      const pinStr = pin.join('');

      const privateKey = await decryptPrivateKey(
        keyData.encrypted_private_key,
        keyData.salt,
        keyData.iv,
        pinStr
      );

      const jwt = await signTransactionJWT(
        {
          actionType: context.actionType,
          entityType: context.entityType,
          entityId: context.entityId,
          userId: 0, // server fills authoritative userId
          details: context.details,
        },
        privateKey
      );

      const { data } = await axios.post('/api/authorization/transaction-sign', {
        actionType: context.actionType,
        entityType: context.entityType,
        entityId: context.entityId,
        jwtToken: jwt,
        payloadPreview: {
          label: context.label,
          actionType: context.actionType,
          entityType: context.entityType,
          entityId: context.entityId,
          ...context.details,
        },
      });

      if (data.code === 1) {
        onSuccess(data.data.id);
      } else {
        setError(data.message ?? 'Authorization failed.');
        setPin(EMPTY_PIN);
      }
    } catch (err: unknown) {
      // AES-GCM decryption throws when PIN is wrong
      if (err instanceof DOMException && err.name === 'OperationError') {
        setError('Incorrect PIN. Please try again.');
      } else {
        setError('Authorization failed. Please try again.');
      }
      setPin(EMPTY_PIN);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <DialogContent
        className={cn(
          'max-w-sm w-[95vw] p-0 overflow-hidden',
          isDark ? 'bg-slate-900 border-slate-700/60' : 'bg-white border-slate-200'
        )}
      >
        <DialogHeader
          className={cn(
            'relative px-6 pt-6 pb-4',
            isDark ? 'bg-slate-800/60' : 'bg-slate-50'
          )}
        >
          <button
            onClick={onCancel}
            className={cn(
              'absolute right-4 top-4 rounded-md p-1 transition-colors',
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600'
            )}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                Authorization Required
              </DialogTitle>
              <p className={cn('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {context.label}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 space-y-5">
          {hasPin === false && (
            <div className={cn(
              'rounded-lg border p-4 text-sm',
              isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
            )}>
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  You have not set up your authorization PIN yet.
                  Please go to <strong>Settings → Security</strong> to configure it before authorizing actions.
                </div>
              </div>
            </div>
          )}

          {hasPin !== false && (
            <>
              <div className="text-center space-y-1">
                <p className={cn('text-sm font-medium', isDark ? 'text-slate-300' : 'text-slate-700')}>
                  Enter your 6-digit authorization PIN
                </p>
                <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  This action will be cryptographically signed
                </p>
              </div>

              <PinInput
                value={pin}
                onChange={setPin}
                disabled={loading || hasPin === null}
                error={!!error}
                isDark={isDark}
              />

              {loading && (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className={cn('h-4 w-4 animate-spin', isDark ? 'text-violet-400' : 'text-violet-600')} />
                  <span className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    Signing transaction…
                  </span>
                </div>
              )}

              {error && !loading && (
                <div className={cn(
                  'rounded-lg border px-3 py-2 text-xs text-center',
                  isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
                )}>
                  {error}
                </div>
              )}
            </>
          )}

          <button
            onClick={onCancel}
            className={cn(
              'w-full rounded-lg border py-2 text-sm font-medium transition-colors',
              isDark
                ? 'border-slate-600 text-slate-300 hover:bg-slate-700/50'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
