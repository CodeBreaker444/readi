'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder with the same footprint as the editor (toolbar + map + zone list) so layout never jumps. */
export function OperationZonesEditorSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      <Skeleton className="h-8 w-full rounded-md" />
      <Skeleton className="w-full rounded-lg" style={{ height: 460 }} />
      <Skeleton className="h-44 w-full rounded-lg" />
    </div>
  );
}

const OperationZonesEditor = dynamic(() => import('./OperationZonesEditorInner'), {
  ssr: false,
  loading: () => <OperationZonesEditorSkeleton />,
});

export default OperationZonesEditor;
