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
  weather_temperature: number | null;
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

const BLANK_TIME = 'h ____: ____';

const QTB_TITLE: Record<string, string> = {
  en: 'TECHNICAL LOGBOOK',
  de: 'TECHNISCHES BORDBUCH',
  it: 'QUADERNO TECNICO DI BORDO',
};

function resolveQtbTitle(language: string | null | undefined): string {
  const lang = (language ?? 'it').split('-')[0].toLowerCase();
  return QTB_TITLE[lang] ?? QTB_TITLE.it;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatMinutesSpaced(minutes: number | null): string {
  if (minutes == null) return BLANK_TIME;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `h ${pad2(h)}: ${pad2(m)}`;
}

function formatTimeSpaced(iso: string | null, timezone: string): string {
  if (!iso) return BLANK_TIME;
  return `h ${formatTimeInTz(iso, timezone).replace(':', ': ')}`;
}

interface PageMeta {
  site: string | null;
  dateLabel: string | null;
  earliestStart: string | null;
  latestEnd: string | null;
  rpName: string | null;
  avgTemp: number | null;
}

function computePageMeta(missions: QtbMissionRow[], timezone: string): PageMeta {
  const site = missions.find((m) => m.location)?.location ?? null;

  const starts = missions.map((m) => m.actual_start).filter((v): v is string => !!v);
  const ends = missions.map((m) => m.actual_end).filter((v): v is string => !!v);
  const earliestStart = starts.length
    ? starts.reduce((a, b) => (new Date(a) < new Date(b) ? a : b))
    : null;
  const latestEnd = ends.length
    ? ends.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
    : null;

  let dateLabel: string | null = null;
  if (starts.length) {
    const firstDate = formatDateInTz(starts[0], timezone);
    const lastDate = formatDateInTz(starts[starts.length - 1], timezone);
    dateLabel = firstDate === lastDate ? firstDate : `${firstDate} - ${lastDate}`;
  }

  const pilotNames = Array.from(new Set(missions.map((m) => m.pilot_name).filter((v): v is string => !!v)));
  const rpName = pilotNames.length === 1 ? pilotNames[0] : null;

  const temps = missions.map((m) => m.weather_temperature).filter((v): v is number => v != null);
  const avgTemp = temps.length ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : null;

  return { site, dateLabel, earliestStart, latestEnd, rpName, avgTemp };
}

function buildNoteText(m: QtbMissionRow, timezone: string): string {
  const parts: string[] = [];
  if (m.actual_start && m.actual_end) {
    parts.push(`${formatTimeInTz(m.actual_start, timezone)}-${formatTimeInTz(m.actual_end, timezone)}`);
  }
  if (m.notes) parts.push(m.notes);
  return parts.join('  ·  ');
}

// Column widths (mm) taken 1:1 from the official QTB template's 13-column
// table grid (TS-UFM-MOD-11), converted from twips so every merged field
// keeps the same proportions as the source document.
const COL_WIDTHS = [27.65, 21.42, 6.15, 24.69, 2.65, 4.96, 20.07, 4.99, 20.37, 2.13, 2.31, 7.64, 24.76];

export async function generateQtbReportPdf(report: QtbReportData, timezone: string, language?: string): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const marginL = 20;
  const marginR = 20;

  const title = resolveQtbTitle(language);
  const droneSerial = report.drone?.serial_number || report.drone?.uas_serial_number || null;
  const modelLine = `${report.tool.model_name ?? '<UAS Model>'}   S/N   ${droneSerial ?? '_______________________'}`;

  const columnStyles: Record<number, { cellWidth: number }> = {};
  COL_WIDTHS.forEach((w, i) => { columnStyles[i] = { cellWidth: w }; });

  report.pages.forEach((page, pageIdx) => {
    if (pageIdx > 0) doc.addPage();

    const meta = computePageMeta(page.missions, timezone);

    const flightRows: any[][] = [];
    for (let i = 0; i < 10; i++) {
      const m = page.missions[i];
      flightRows.push([
        { content: String(i + 1), rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: m ? formatMinutesSpaced(m.flight_duration) : BLANK_TIME, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: '' },
        { content: m ? buildNoteText(m, timezone) : '', rowSpan: 2, styles: { halign: 'left', fontSize: 7 } },
      ]);
      flightRows.push([
        { content: '' },
      ]);
    }

    const body: any[][] = [
      // Row 0: logo (blank box) | title | form code
      [
        { content: '', rowSpan: 2, colSpan: 2 },
        { content: title, rowSpan: 2, colSpan: 9, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 12 } },
        { content: 'TS-UFM-MOD-11', colSpan: 2, styles: { halign: 'center', fontSize: 6.5 } },
      ],
      // Row 1: (logo/title continue) | page number
      [
        { content: `pag. ${String(page.pageNumber).padStart(2, '0')} di 50`, colSpan: 2, styles: { halign: 'center', fontSize: 6.5 } },
      ],
      // Row 2: spacer
      [{ content: '', colSpan: 13, styles: { minCellHeight: 1 } }],
      // Row 3: Site | Date | UAS Model/S-N
      [
        { content: `Site: ${meta.site ?? ''}`, colSpan: 2 },
        { content: `Date: ${meta.dateLabel ?? ''}`, colSpan: 3 },
        { content: modelLine, colSpan: 8, rowSpan: 2, styles: { valign: 'middle' } },
      ],
      // Row 4: Operational Authorisation (not tracked — kept blank as in template)
      [
        { content: 'Operational Authorisation N: ________________', colSpan: 5 },
      ],
      // Row 5: RP / Wind / Temp / Dew Point
      [
        { content: `RP: ${meta.rpName ?? ''}\nSignature:  ________________________`, colSpan: 5, rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'Wind [kt]:', colSpan: 2 },
        { content: `Temp [°C]: ${meta.avgTemp ?? ''}`, colSpan: 3 },
        { content: 'Dew Point [°C]:', colSpan: 3 },
      ],
      // Row 6: (RP continue) / Satellites / Kp / Visibility
      [
        { content: 'Satellites:', colSpan: 2 },
        { content: 'Kp:', colSpan: 3 },
        { content: 'Visibility [m]:', colSpan: 3 },
      ],
      // Row 7: VO / Mission Start Time
      [
        { content: 'VO:\nSignature:  ________________________', colSpan: 5, rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'Mission Start Time:', colSpan: 4 },
        { content: formatTimeSpaced(meta.earliestStart, timezone), colSpan: 4 },
      ],
      // Row 8: (VO continue) / Mission End Time
      [
        { content: 'Mission End Time:', colSpan: 4 },
        { content: formatTimeSpaced(meta.latestEnd, timezone), colSpan: 4 },
      ],
      // Row 9: flight table header
      [
        { content: 'Today Flights', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
        { content: 'Flight Duration', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
        { content: 'Batteries S/N', styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
        { content: 'Notes (type of mission, defects, observations, etc.)', colSpan: 9, styles: { halign: 'center', fontStyle: 'bold', fontSize: 7 } },
      ],
      // Rows 10-29: 10 flight entries (2 physical rows each)
      ...flightRows,
      // Row 30: summary
      [
        { content: 'Today Flight Time:', styles: { fontStyle: 'bold', fontSize: 7 } },
        { content: formatMinutesSpaced(page.todayFlightMinutes), colSpan: 2, styles: { halign: 'center' } },
        { content: 'Past Flight Time:', colSpan: 3, styles: { fontStyle: 'bold', fontSize: 7 } },
        { content: formatMinutesSpaced(page.pastFlightMinutes), colSpan: 2, styles: { halign: 'center' } },
        { content: 'Total Flight Time:', colSpan: 4, styles: { fontStyle: 'bold', fontSize: 7 } },
        { content: formatMinutesSpaced(page.totalFlightMinutes), styles: { halign: 'center' } },
      ],
      // Row 31: general observations
      [{ content: 'General observations:', colSpan: 13, styles: { minCellHeight: 16, valign: 'top' } }],
    ];

    autoTable(doc, {
      startY: 15,
      body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
        cellPadding: 1.4,
        valign: 'middle',
        overflow: 'linebreak',
      },
      columnStyles,
      margin: { left: marginL, right: marginR, top: 15, bottom: 16 },
    });

    // ── Footer — the only ReAdi branding on the page ──────────────────────
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Generated by ReAdi', pageW / 2, pageH - 8, { align: 'center' });
  });

  const blob = doc.output('blob');
  const fileSafeCode = (report.tool.tool_code ?? `system-${report.tool.tool_id}`).replace(/[^a-zA-Z0-9-_]/g, '_');
  triggerDownload(blob, `QTB_${fileSafeCode}_${report.range.startDate}_to_${report.range.endDate}.pdf`);
}
