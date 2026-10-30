'use client';

import { prettifyEventTypeCode, type EventTypeItem } from '@/config/types/event-logbook';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

// One shared copy so the filter, wizard, detail dialog and webhook settings all update when the types are edited.
export interface EventTypeClient {
  client_id: number;
  client_name: string;
  client_active?: string | null;
}

let cache: EventTypeItem[] | null = null;
let clientsCache: EventTypeClient[] = [];
let inflight: Promise<void> | null = null;
const listeners = new Set<(types: EventTypeItem[], clients: EventTypeClient[]) => void>();

/** Reloads the company's event types and pushes them to every mounted consumer. */
export function refreshEventTypes(): Promise<void> {
  inflight ??= axios
    .get('/api/logbooks/event/types')
    .then((res) => {
      cache = res.data.types ?? [];
      clientsCache = res.data.clients ?? [];
      listeners.forEach((fn) => fn(cache!, clientsCache));
    })
    .catch(() => {
      // Keep whatever we had; the next open retries.
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useEventTypes() {
  const [types, setTypes] = useState<EventTypeItem[]>(cache ?? []);
  const [clients, setClients] = useState<EventTypeClient[]>(clientsCache);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    const onChange = (next: EventTypeItem[], nextClients: EventTypeClient[]) => {
      setTypes(next);
      setClients(nextClients);
      setLoading(false);
    };
    listeners.add(onChange);
    if (cache) onChange(cache, clientsCache);
    // Always revalidate on mount: another admin may have edited the list since it was cached.
    void refreshEventTypes().finally(() => setLoading(false));
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  /** Display name for a code; deleted types fall back to the prettified code. */
  const labelOf = useCallback(
    (code: string) => types.find((t) => t.type_code === code)?.type_name ?? prettifyEventTypeCode(code),
    [types],
  );

  return { types, clients, loading, labelOf };
}
