'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Which event's details are open. Starts from `?event=<id>` (the link in notification emails) and
 * keeps the address bar in sync, so the link can be copied and a refresh keeps the dialog open.
 */
export function useEventDeepLink() {
  const [eventId, setEventId] = useState<number | null>(null);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('event');
    const id = raw ? Number(raw) : NaN;
    if (Number.isInteger(id) && id > 0) setEventId(id);
  }, []);

  const open = useCallback((id: number) => {
    setEventId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('event', String(id));
    window.history.replaceState(null, '', url);
  }, []);

  const close = useCallback(() => {
    setEventId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('event');
    window.history.replaceState(null, '', url);
  }, []);

  return { eventId, open, close };
}
