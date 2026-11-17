'use client';

import { PilotGroupsView } from '@/components/slot-booking/PilotGroupsView';
import { SlotBookingShell } from '@/components/slot-booking/SlotBookingShell';
import { apiMsg, EmptyBlock, ErrorBlock } from '@/components/slot-booking/ui';
import { PilotGroupsSkeleton } from '@/components/slot-booking/skeletons';
import type { SlotMe } from '@/config/types/slot-booking';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function PilotGroupsPage() {
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
    <SlotBookingShell title={t('slotBooking.pilotGroups.title')} subtitle={t('slotBooking.pilotGroups.subtitle')} canManage={me?.canManage} canBook={me?.canBook}>
      {(isDark) =>
        error ? (
          <ErrorBlock isDark={isDark} message={error} onRetry={load} />
        ) : !me ? (
          <PilotGroupsSkeleton isDark={isDark} />
        ) : me.canManage ? (
          <PilotGroupsView isDark={isDark} />
        ) : (
          <EmptyBlock isDark={isDark}>{t('slotBooking.pilotGroups.opmOnly')}</EmptyBlock>
        )
      }
    </SlotBookingShell>
  );
}
