'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Notification } from '@/config/types/notification';
import axios from 'axios';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const SHOWN_THIS_SESSION_KEY = 'dflight_insurance_alert_shown';

interface InsuranceExpiryAlertModalProps {
  enabled: boolean;
}

// Requirement: insurance expiration must trigger "an on-screen pop-up alert
// displayed upon logging into the system", in addition to (out of scope here)
// the configurable email alert. Fires once per browser session.
export default function InsuranceExpiryAlertModal({ enabled }: InsuranceExpiryAlertModalProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (sessionStorage.getItem(SHOWN_THIS_SESSION_KEY)) return;

    axios
      .post('/api/notification/list', { status: 'UNREAD', procedure_name: 'INSURANCE_EXPIRY', limit: 20 })
      .then(({ data }) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setItems(data.data);
          setOpen(true);
        }
        sessionStorage.setItem(SHOWN_THIS_SESSION_KEY, '1');
      })
      .catch(() => {
        sessionStorage.setItem(SHOWN_THIS_SESSION_KEY, '1');
      });
  }, [enabled]);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await Promise.allSettled(
        items.map((n) =>
          axios.post('/api/notification/mark-read', { notification_id: n.notification_id }),
        ),
      );
    } finally {
      setDismissing(false);
      setOpen(false);
    }
  };

  if (!enabled) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            {t('dflight.insuranceAlert.title', { defaultValue: 'Insurance Expiring Soon' })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {items.map((n) => (
            <div key={n.notification_id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {n.message}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss} disabled={dismissing}>
            {t('dflight.insuranceAlert.dismiss', { defaultValue: 'Dismiss' })}
          </Button>
          <Link href="/systems/manage" onClick={() => setOpen(false)}>
            <Button className="bg-violet-600 hover:bg-violet-700">
              {t('dflight.insuranceAlert.view', { defaultValue: 'View Components' })}
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
