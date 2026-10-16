'use client';

import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';

// Leaflet touches `window`, so the map is only ever rendered in the browser.
const EventLocationMap = dynamic(() => import('./EventLocationMapInner'), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full rounded-lg" />,
});

export default EventLocationMap;
