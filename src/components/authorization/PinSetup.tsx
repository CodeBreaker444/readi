'use client';

import { encryptPrivateKey, generateKeyPair } from '@/lib/crypto/keyManagement';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { CheckCircle2, Copy, KeyRound, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PinInput } from './PinInput';

interface Props {
  isDark?: boolean;
  existingFingerprint?: string | null;
  onSuccess?: () => void;
}

const EMPTY_PIN = Array(6).fill('') as string[];

type Step = 'enter' | 'confirm' | 'done';

export function PinSetup({ isDark, existingFingerprint, onSuccess }: Props) {
  const [step, setStep]           = useState<Step>('enter');
  const [pin, setPin]             = useState<string[]>(EMPTY_PIN);
  const [confirmPin, setConfirmPin] = useState<string[]>(EMPTY_PIN);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(existingFingerprint ?? null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);

  const pinFull        = pin.every(d => d !== '');
  const confirmPinFull = confirmPin.every(d => d !== '');

  const handlePinComplete = () => {
    if (!pinFull) return;
    setError(null);
    setStep('confirm');
    setConfirmPin(EMPTY_PIN);
  };

  const handleConfirmComplete = async () => {
    if (!confirmPinFull) return;
    if (pin.join('') !== confirmPin.join('')) {
      setError('PINs do not match. Please try again.');
      setConfirmPin(EMPTY_PIN);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { publicKey: pubKey, privateKey, fingerprint: fp } = await generateKeyPair();
      const { encrypted, salt, iv } = await encryptPrivateKey(privateKey, pin.join(''));

      await axios.post('/api/authorization/setup-pin', {
        encryptedPrivateKey: encrypted,
        publicKey:           pubKey,
        salt,
        iv,
        keyFingerprint:      fp,
      });

      setFingerprint(fp);
      setPublicKey(pubKey);
      setStep('done');
      onSuccess?.();
    } catch {
      toast.error('Failed to set up authorization PIN. Please try again.');
      setError('Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStep('enter');
    setPin(EMPTY_PIN);
    setConfirmPin(EMPTY_PIN);
    setError(null);
  };

  const card = cn(
    'rounded-xl border p-6',
    isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200'
  );

  if (step === 'done') {
    return (
      <div className={card}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')}>
            <CheckCircle2 className={cn('h-6 w-6', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
          </div>
          <div>
            <h3 className={cn('font-semibold text-base', isDark ? 'text-white' : 'text-slate-900')}>
              Authorization PIN configured
            </h3>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Your RSA keypair has been generated. Your private key is encrypted with your PIN and never leaves your browser unencrypted.
            </p>
          </div>

          {fingerprint && (
            <div className={cn('w-full rounded-lg border p-3 text-left', isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200')}>
              <p className={cn('text-xs font-medium mb-1', isDark ? 'text-slate-400' : 'text-slate-500')}>Key Fingerprint</p>
              <p className={cn('text-xs font-mono break-all', isDark ? 'text-violet-400' : 'text-violet-700')}>
                {fingerprint}
              </p>
            </div>
          )}

          {publicKey && (
            <div className={cn('w-full rounded-lg border p-3 text-left', isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200')}>
              <div className="flex items-center justify-between mb-1">
                <p className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>Public Key (RSA-2048 SPKI)</p>
                <button
                  onClick={() => handleCopy(publicKey)}
                  className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors',
                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  <Copy className="h-3 w-3" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className={cn('text-[10px] font-mono break-all leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-600')}>
                {publicKey.slice(0, 80)}…
              </p>
            </div>
          )}

          <button
            onClick={handleReset}
            className={cn(
              'flex cursor-pointer items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors',
              isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700/50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Change PIN (generates new keypair)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={card}>
      <div className="flex items-center gap-3 mb-5">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600')}>
          {step === 'enter' ? <KeyRound className="h-4.5 w-4.5" /> : <ShieldCheck className="h-4.5 w-4.5" />}
        </div>
        <div>
          <h3 className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-slate-900')}>
            {existingFingerprint ? 'Change Authorization PIN' : 'Set Up Authorization PIN'}
          </h3>
          <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {step === 'enter'
              ? 'Choose a 6-digit PIN to protect your digital signature'
              : 'Confirm your PIN to generate the keypair'}
          </p>
        </div>
      </div>

      {existingFingerprint && step === 'enter' && (
        <div className={cn('mb-4 rounded-lg border px-3 py-2 text-xs', isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700')}>
          Changing your PIN will generate a new RSA keypair. Previous transaction signs remain verifiable using the public key snapshot stored with each record.
        </div>
      )}

      <div className="space-y-4">
        <p className={cn('text-sm text-center', isDark ? 'text-slate-400' : 'text-slate-500')}>
          {step === 'enter' ? 'Enter PIN' : 'Confirm PIN'}
        </p>

        {step === 'enter' ? (
          <PinInput value={pin} onChange={setPin} isDark={isDark} />
        ) : (
          <PinInput value={confirmPin} onChange={setConfirmPin} disabled={loading} error={!!error} isDark={isDark} />
        )}

        {error && (
          <p className={cn('text-xs text-center', isDark ? 'text-red-400' : 'text-red-600')}>{error}</p>
        )}

        {step === 'enter' ? (
          <button
            onClick={handlePinComplete}
            disabled={!pinFull}
            className={cn(
              'w-full cursor-pointer rounded-lg py-2.5 text-sm font-medium transition-colors',
              pinFull
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : isDark ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            Next
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setStep('enter'); setConfirmPin(EMPTY_PIN); setError(null); }}
              disabled={loading}
              className={cn(
                'flex-1 cursor-pointer rounded-lg border py-2.5 text-sm font-medium transition-colors',
                isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700/50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              Back
            </button>
            <button
              onClick={handleConfirmComplete}
              disabled={!confirmPinFull || loading}
              className={cn(
                'flex-1 cursor-pointer rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2',
                confirmPinFull && !loading
                  ? 'bg-violet-600 hover:bg-violet-500 text-white'
                  : isDark ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {loading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating keypair…</>
                : 'Confirm & Generate Key'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
