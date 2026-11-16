'use client';

import { CalendarView } from '@/components/slot-booking/CalendarView';
import { SlotBookingShell } from '@/components/slot-booking/SlotBookingShell';
import { apiMsg, EmptyBlock, ErrorBlock, LoadingBlock } from '@/components/slot-booking/ui';
import type { SlotMe } from '@/config/types/slot-booking';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function CalendarPage() {
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
    <SlotBookingShell title={t('slotBooking.calendar.title')} subtitle={t('slotBooking.calendar.subtitle')} canManage={me?.canManage}>
      {(isDark) =>
        error ? (
          <ErrorBlock isDark={isDark} message={error} onRetry={load} />
        ) : !me ? (
          <LoadingBlock isDark={isDark} rows={1} />
        ) : me.canManage ? (
          <CalendarView isDark={isDark} />
        ) : (
          <EmptyBlock isDark={isDark}>{t('slotBooking.opmOnly')}</EmptyBlock>
        )
      }
    </SlotBookingShell>
  );
}
