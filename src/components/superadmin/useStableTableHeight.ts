import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Keeps a table's rendered height from shrinking when it re-renders with fewer
 * rows — e.g. a paginated table's last page — so clicking prev/next doesn't
 * jump the layout below it. The tracked height only grows within the same
 * `datasetKey`; passing a new key (a fresh search/sort/filter result, not just
 * a different page of the same list) resets and remeasures from scratch.
 */
export function useStableTableHeight<T>(datasetKey: T) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState(0);
  const prevKeyRef = useRef(datasetKey);

  useLayoutEffect(() => {
    if (prevKeyRef.current !== datasetKey) {
      prevKeyRef.current = datasetKey;
      setMinHeight(0);
    }
  }, [datasetKey]);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setMinHeight((prev) => Math.max(prev, containerRef.current!.offsetHeight));
    }
  });

  return { containerRef, minHeight };
}
