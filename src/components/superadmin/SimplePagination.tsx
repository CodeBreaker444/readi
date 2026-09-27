'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  /** 0-indexed current page. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

export default function SimplePagination({ page, pageCount, onPageChange, totalItems, pageSize }: Props) {
  if (pageCount <= 1) return null;

  const start = page * pageSize + 1;
  const end = Math.min(totalItems, (page + 1) * pageSize);

  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      <span className="text-xs text-muted-foreground">
        {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          Page {page + 1} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount - 1}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
