'use client';

import { DEFAULT_TIMEZONE, resolveIanaTimezone } from '@/lib/utils';
import { createContext, useContext, useMemo } from 'react';

interface TimezoneContextValue {
  timezone: string;
}

const TimezoneContext = createContext<TimezoneContextValue>({
  timezone: DEFAULT_TIMEZONE,
});

export function TimezoneProvider({
  userTimezone,
  children,
}: {
  userTimezone?: string | null;
  children: React.ReactNode;
}) {
  const timezone = useMemo(() => resolveIanaTimezone(userTimezone), [userTimezone]);

  return (
    <TimezoneContext.Provider value={{ timezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone(): TimezoneContextValue {
  return useContext(TimezoneContext);
}
