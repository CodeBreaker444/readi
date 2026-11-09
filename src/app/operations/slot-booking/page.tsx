'use client';

import { OpmView } from '@/components/slot-booking/OpmView';
import { PicView } from '@/components/slot-booking/PicView';
import { SlotBookingShell } from '@/components/slot-booking/SlotBookingShell';
import { apiMsg, ErrorBlock, LoadingBlock } from '@/components/slot-booking/ui';
import type { SlotDefaults, SlotGroup, SlotMe } from '@/config/types/slot-booking';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Bootstrap {
  me: SlotMe;
  defaults: SlotDefaults;
  groups: SlotGroup[];
}

export default function SlotBookingPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/operation/slot-booking');
      setData(res.data.data);
      setError(null);
    } catch (e) {
      setError(apiMsg(e, t('slotBooking.errors.load')));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SlotBookingShell title={t('slotBooking.title')} subtitle={t('slotBooking.subtitle')} canManage={data?.me.canManage}>
      {(isDark) =>
        error ? (
          <ErrorBlock isDark={isDark} message={error} onRetry={load} />
        ) : !data ? (
          <LoadingBlock isDark={isDark} />
        ) : data.me.canManage ? (
          <OpmView isDark={isDark} defaults={data.defaults} groups={data.groups} reload={load} />
        ) : (
          <PicView isDark={isDark} me={data.me} groups={data.groups} />
        )
      }
    </SlotBookingShell>
  );
}
