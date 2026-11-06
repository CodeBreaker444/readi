'use client';

import { useEffect, useState } from 'react';

/** shows the fallback when there is no link or the link fails to load. */
export function AiEventThumb({ url, fallback }: { url: string | null; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) return <>{fallback}</>;
  return <img src={url} alt="" className="h-10 w-16 rounded object-cover" onError={() => setFailed(true)} />;
}
