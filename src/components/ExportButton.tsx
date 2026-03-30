'use client';

 

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { FaFileExcel, FaFilePdf, FaFileWord } from 'react-icons/fa';
import { HiDownload } from 'react-icons/hi';
import { toast } from 'sonner';

export interface ExportColumn {
  header: string;
  key: string;
}

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
  isDark?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

type ExportFormat = 'xlsx' | 'pdf' | 'docx';

export function ExportButton({
  data,
  columns,
  filename,
  title,
  isDark = false,
  disabled = false,
  size = 'sm',
  className = '',
}: ExportButtonProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((c) => String(row[c.key] ?? '')));


  function triggerDownload(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function callExportApi(format: 'xlsx' | 'docx') {
    const res = await fetch('/api/export/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, headers, rows, title: title ?? filename, filename }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? `Server returned ${res.status}`);
    }
    const duration = res.headers.get('X-Export-Duration-Ms');
    if (duration) console.log(`[ExportButton] ${format} generated in ${duration}ms server-side`);
    return await res.blob();
  }


  async function handleXlsx() {
    setExporting('xlsx');
    try {
      const blob = await callExportApi('xlsx');
      triggerDownload(blob, `${filename}.xlsx`);
    } catch (err: unknown) {
      console.error('[ExportButton] xlsx error', err);
      toast.error('Failed to export Excel file.');
    } finally {
      setExporting(null);
    }
  }


  async function handleDocx() {
    setExporting('docx');
    try {
      const blob = await callExportApi('docx');
      triggerDownload(blob, `${filename}.docx`);
    } catch (err: unknown) {
      console.error('[ExportButton] docx error', err);
      toast.error('Failed to export Word document.');
    } finally {
      setExporting(null);
    }
  }


  async function handlePdf() {
    setExporting('pdf');
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      let logoBase64: string | null = null;
      try {
        const res = await fetch('/logo-sm.png');
        const blob = await res.blob();
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch { 
          console.log('Logo is Missing for PDF export!');
       }

      const isLandscape = columns.length > 4 || rows.some((r) => r.some((c) => c.length > 60));
      const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm' });
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;

      const docTitle = title ?? filename;
      const exportedOn = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 15, 15);
      doc.text(docTitle, 14, 15);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Exported ${exportedOn} · ${rows.length} records`, 14, 21);
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: 27,
        head: [headers],
        body: rows,
        styles: { fontSize: 8, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, overflow: 'linebreak' },
        headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 248, 252] },
        margin: { left: 14, right: 14, bottom: 16 },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.1,
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', pageW - 26, 5, 12, 12);
        }

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, pageH - 12, pageW - 14, pageH - 12);
        doc.setLineWidth(0.2);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text('Generated by Readi Platform', 14, pageH - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 7, { align: 'right' });
      }

      doc.save(`${filename}.pdf`);
    } catch (err: unknown) {
      console.error('[ExportButton] pdf error', err);
      toast.error('Failed to export PDF. Make sure jspdf is installed.');
    } finally {
      setExporting(null);
    }
  }


  const isDisabled = disabled || data.length === 0 || !!exporting;

  const btnClass = [
    'gap-1.5 text-xs cursor-pointer',
    size === 'sm' ? 'h-7' : 'h-9',
    isDark
      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const menuClass = isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : '';
  const itemClass = `text-xs gap-2 cursor-pointer ${isDark ? 'hover:bg-slate-700 focus:bg-slate-700 focus:text-white' : ''}`;
  const labelClass = `text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} disabled={isDisabled} className={btnClass}>
          <HiDownload className="w-3.5 h-3.5" />
          {exporting ? 'Exporting…' : 'Export'}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className={`min-w-[188px] ${menuClass}`}>
        <DropdownMenuLabel className={labelClass}>Download as</DropdownMenuLabel>
        <DropdownMenuSeparator className={isDark ? 'bg-slate-700' : ''} />

        <DropdownMenuItem onClick={handleXlsx} disabled={!!exporting} className={itemClass}>
          <FaFileExcel className="w-3.5 h-3.5 text-emerald-600" />
          Excel (.xlsx)
          {exporting === 'xlsx' && <span className="ml-auto text-[10px] opacity-60">…</span>}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handlePdf} disabled={!!exporting} className={itemClass}>
          <FaFilePdf className="w-3.5 h-3.5 text-red-500" />
          PDF (.pdf)
          {exporting === 'pdf' && <span className="ml-auto text-[10px] opacity-60">…</span>}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleDocx} disabled={!!exporting} className={itemClass}>
          <FaFileWord className="w-3.5 h-3.5 text-blue-600" />
          Word (.docx)
          {exporting === 'docx' && <span className="ml-auto text-[10px] opacity-60">…</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}