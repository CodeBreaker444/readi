'use client';

import { DayPreviewView } from '@/components/slot-booking/DayPreviewView';
import { SlotBookingShell } from '@/components/slot-booking/SlotBookingShell';
import { apiMsg, EmptyBlock, ErrorBlock } from '@/components/slot-booking/ui';
import { DayPreviewSkeleton } from '@/components/slot-booking/skeletons';
import type { SlotMe } from '@/config/types/slot-booking';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DayPreviewPage() {
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
    <SlotBookingShell title={t('slotBooking.dayPreview.title')} subtitle={t('slotBooking.dayPreview.subtitle')} canManage={me?.canManage} canBook={me?.canBook}>
      {(isDark) =>
        error ? (
          <ErrorBlock isDark={isDark} message={error} onRetry={load} />
        ) : !me ? (
          <DayPreviewSkeleton isDark={isDark} />
        ) : me.canManage ? (
          <DayPreviewView isDark={isDark} />
        ) : (
          <EmptyBlock isDark={isDark}>{t('slotBooking.opmOnly')}</EmptyBlock>
        )
      }
    </SlotBookingShell>
  );
}
