'use client';

import { formatDateInTz, formatTimeInTz } from '@/lib/utils';

export interface QtbMissionRow {
  pilot_mission_id: number;
  mission_code: string | null;
  actual_start: string | null;
  actual_end: string | null;
  flight_duration: number | null;
  distance_flown: number | null;
  location: string | null;
  notes: string | null;
  pilot_name: string | null;
}

export interface QtbPage {
  pageNumber: number;
  pastFlightMinutes: number;
  pastFlightCount: number;
  todayFlightMinutes: number;
  todayFlightCount: number;
  totalFlightMinutes: number;
  totalFlightCount: number;
  missions: QtbMissionRow[];
}

export interface QtbReportData {
  tool: { tool_id: number; tool_code: string | null; tool_desc: string | null; model_name: string | null };
  drone: { serial_number: string | null; uas_serial_number: string | null; gcs_serial_number: string | null; component_name: string | null } | null;
  range: { startDate: string; endDate: string; timezone: string };
  pastFlightMinutes: number;
  pastFlightCount: number;
  totalCount: number;
  pages: QtbPage[];
}

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

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `h ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/logo-sm.png');
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const QTB_SUBTITLE: Record<string, string> = {
  en: 'Technical Logbook',
  de: 'Technisches Bordbuch',
  it: 'Quaderno Tecnico di Bordo',
};

function resolveQtbSubtitle(language: string | null | undefined): string {
  const lang = (language ?? 'en').split('-')[0].toLowerCase();
  return QTB_SUBTITLE[lang] ?? QTB_SUBTITLE.en;
}

export async function generateQtbReportPdf(report: QtbReportData, timezone: string, language?: string): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }, logoBase64] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    fetchLogoBase64(),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', compress: true });
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const marginL = 12;
  const marginR = 12;
  const contentW = pageW - marginL - marginR;

  const purple: [number, number, number] = [109, 40, 217];
  const slate800: [number, number, number] = [30, 41, 59];
  const slate500: [number, number, number] = [100, 116, 139];
  const slate300: [number, number, number] = [203, 213, 225];
  const white: [number, number, number] = [255, 255, 255];
  const bgLight: [number, number, number] = [248, 250, 252];

  const droneSerial = report.drone?.serial_number || report.drone?.uas_serial_number || null;
  const droneLabel = droneSerial ? `S/N ${droneSerial}` : 'S/N —';
  const subtitle = resolveQtbSubtitle(language);
  const logoSize = 12;
  const textStartX = logoBase64 ? marginL + logoSize + 4 : marginL;

  report.pages.forEach((page, pageIdx) => {
    if (pageIdx > 0) doc.addPage();

    let y = 14;

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.setFillColor(...purple);
    doc.rect(0, 0, pageW, 24, 'F');

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', marginL, 6, logoSize, logoSize);
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text(`QTB — ${subtitle}`, textStartX, 10);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 190, 255);
    doc.text(
      `${report.tool.tool_code ?? '—'}${report.tool.model_name ? ` · ${report.tool.model_name}` : ''} · ${droneLabel}`,
      textStartX,
      16,
    );
    doc.text(
      `Range ${formatDateInTz(report.range.startDate, timezone)} – ${formatDateInTz(report.range.endDate, timezone)} · Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      textStartX,
      21,
    );

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text(`pag. ${String(page.pageNumber).padStart(2, '0')}`, pageW - marginR, 12, { align: 'right' });

    y = 32;

    // ── Summary bar ────────────────────────────────────────────────────────
    doc.setFillColor(...bgLight);
    doc.setDrawColor(...slate300);
    doc.setLineWidth(0.2);
    doc.roundedRect(marginL, y, contentW, 16, 2, 2, 'FD');

    const summaryCols = [
      { label: 'Past Flights', value: `${page.pastFlightCount} · ${formatMinutes(page.pastFlightMinutes)}` },
      { label: 'Today Flights', value: `${page.todayFlightCount} · ${formatMinutes(page.todayFlightMinutes)}` },
      { label: 'Total Flights', value: `${page.totalFlightCount} · ${formatMinutes(page.totalFlightMinutes)}` },
    ];
    const colW = contentW / summaryCols.length;
    summaryCols.forEach((col, i) => {
      const x = marginL + i * colW + 6;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate500);
      doc.text(col.label.toUpperCase(), x, y + 6);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...slate800);
      doc.text(col.value, x, y + 12);
    });

    y += 22;

    // ── Flight rows table ─────────────────────────────────────────────────
    const rows = page.missions.map((m, idx) => [
      String(idx + 1),
      m.mission_code ?? `#${m.pilot_mission_id}`,
      formatDateInTz(m.actual_start, timezone),
      m.actual_start ? formatTimeInTz(m.actual_start, timezone) : '—',
      m.actual_end ? formatTimeInTz(m.actual_end, timezone) : '—',
      m.flight_duration != null ? formatMinutes(m.flight_duration) : '—',
      m.distance_flown != null ? `${m.distance_flown.toLocaleString()} m` : '—',
      m.pilot_name ?? '—',
      m.location ?? '—',
      m.notes ?? '—',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Mission', 'Date', 'Takeoff', 'Landing', 'Duration', 'Distance', 'Pilot', 'Location', 'Notes']],
      body: rows,
      styles: { fontSize: 7.5, cellPadding: { top: 2, right: 3, bottom: 2, left: 3 }, overflow: 'linebreak' },
      headStyles: { fillColor: purple, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { textColor: slate800 },
      alternateRowStyles: { fillColor: bgLight },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 24 },
        2: { cellWidth: 22 },
        3: { cellWidth: 16 },
        4: { cellWidth: 16 },
        5: { cellWidth: 16 },
        6: { cellWidth: 18 },
        7: { cellWidth: 26 },
        8: { cellWidth: 26 },
      },
      margin: { left: marginL, right: marginR, bottom: 16 },
      tableLineColor: slate300,
      tableLineWidth: 0.1,
    });

    // ── Footer ───────────────────────────────────────────────────────────
    doc.setDrawColor(...slate300);
    doc.setLineWidth(0.3);
    doc.line(marginL, pageH - 10, pageW - marginR, pageH - 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate500);
    doc.text('Generated by Readi Platform', marginL, pageH - 5);
    doc.text(`Page ${page.pageNumber} of ${report.pages.length}`, pageW - marginR, pageH - 5, { align: 'right' });
  });

  const blob = doc.output('blob');
  const fileSafeCode = (report.tool.tool_code ?? `system-${report.tool.tool_id}`).replace(/[^a-zA-Z0-9-_]/g, '_');
  triggerDownload(blob, `QTB_${fileSafeCode}_${report.range.startDate}_to_${report.range.endDate}.pdf`);
}
