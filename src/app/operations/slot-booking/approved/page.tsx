'use client';

import { ApprovedSlots } from '@/components/slot-booking/ApprovedSlots';
import { SlotBookingShell } from '@/components/slot-booking/SlotBookingShell';
import { apiMsg, ErrorBlock, LoadingBlock } from '@/components/slot-booking/ui';
import type { SlotMe } from '@/config/types/slot-booking';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ApprovedSlotsPage() {
  const { t } = useTranslation();
  const [me, setMe] = useState<SlotMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/operation/slot-booking');
      setMe(res.data.data.me);
      setError(null);
    } catch (e) {
      setError(apiMsg(e, t('slotBooking.errors.load')));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SlotBookingShell title={t('slotBooking.approvedPage.title')} subtitle={t('slotBooking.approvedPage.subtitle')} canManage={me?.canManage}>
      {(isDark) =>
        error ? (
          <ErrorBlock isDark={isDark} message={error} onRetry={load} />
        ) : !me ? (
          <LoadingBlock isDark={isDark} rows={1} />
        ) : (
          <ApprovedSlots isDark={isDark} me={me} />
        )
      }
    </SlotBookingShell>
  );
}
