'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const LocationPickerInner = dynamic(() => import('./LocationPickerInner'), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full rounded-lg" />,
});

export default LocationPickerInner;
