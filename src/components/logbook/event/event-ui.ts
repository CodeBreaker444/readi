/**
 * Explicit light/dark class sets for the event logbook UI. The shadcn colour
 * tokens always resolve to their light values in this app (see globals.css),
 * so every surface is themed through `isDark`, like the other logbook pages.
 */
export function eventUi(isDark: boolean) {
  return {
    card: isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white shadow-sm',
    divider: isDark ? 'border-slate-800' : 'border-slate-200',
    rowBorder: isDark ? 'border-slate-800/70' : 'border-slate-100',
    rowHover: isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50',
    text: isDark ? 'text-slate-100' : 'text-slate-800',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    faint: isDark ? 'text-slate-500' : 'text-slate-400',
    label: `text-[11px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`,
    input: isDark
      ? 'bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-violet-500'
      : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-violet-400',
    selectContent: isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800',
    dialog: isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900',
    panel: isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200',
    outlineBtn: isDark
      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
  };
}
