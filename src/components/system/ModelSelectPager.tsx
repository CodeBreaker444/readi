import { useState } from 'react';
import type React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MODELS_PER_PAGE = 8;

/** Pages a model list (8 per page); the pager only needs to render when `pageCount > 1`. */
export function usePagedModels(models: any[], selectedId?: string) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(models.length / MODELS_PER_PAGE));
  const current = Math.min(page, pageCount - 1);

  const pageItems = models.slice(current * MODELS_PER_PAGE, (current + 1) * MODELS_PER_PAGE);

  /** Jump to the page holding the selected model (call when the dropdown opens). */
  const syncToSelected = () => {
    const idx = models.findIndex((m) => String(m.tool_model_id) === selectedId);
    setPage(idx >= 0 ? Math.floor(idx / MODELS_PER_PAGE) : 0);
  };

  return { page: current, setPage, pageCount, pageItems, syncToSelected };
}

interface ModelSelectPagerProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

// Stop the button taking focus: focusing it inside the Select viewport scrolls the list sideways.
const keepScroll = (e: React.MouseEvent) => e.preventDefault();

export function ModelSelectPager({ page, pageCount, onChange }: ModelSelectPagerProps) {
  if (pageCount <= 1) return null;

  const btn = 'p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div
      className="flex items-center justify-between gap-2 border-t px-2 pt-1.5 pb-0.5 text-[11px] text-muted-foreground"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button type="button" className={btn} disabled={page === 0} onMouseDown={keepScroll} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <span>{page + 1} / {pageCount}</span>
      <button type="button" className={btn} disabled={page >= pageCount - 1} onMouseDown={keepScroll} onClick={() => onChange(page + 1)}>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
