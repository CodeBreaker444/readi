'use client';

import { TableCell, TableRow } from '../ui/table';

export function ClientStatSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 animate-pulse ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className={`h-2.5 w-20 rounded-full mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
      <div className={`h-9 w-16 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
    </div>
  );
}

export function ClientSkeletonRow({ isDark }: { isDark: boolean }) {
  const cell = `h-3.5 rounded-full animate-pulse ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`;
  return (
    <TableRow className={isDark ? 'border-slate-700' : ''}>
      <TableCell><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-xl flex-shrink-0 animate-pulse ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} /><div className={`${cell} w-28`} /></div></TableCell>
      <TableCell><div className={`${cell} w-16`} /></TableCell>
      <TableCell><div className={`${cell} w-36`} /></TableCell>
      <TableCell><div className={`${cell} w-24`} /></TableCell>
      <TableCell><div className={`${cell} w-24`} /></TableCell>
      <TableCell><div className={`${cell} w-16`} /></TableCell>
      <TableCell><div className={`${cell} w-20`} /></TableCell>
      <TableCell><div className={`${cell} w-14`} /></TableCell>
      <TableCell><div className={`${cell} w-8`} /></TableCell>
    </TableRow>
  );
}