'use client';

import { Operation } from '@/app/operations/table/page';
import { formatDateTimeInTz } from '@/lib/utils';

interface PostFlightData {
  flight_duration: number | null;
  actual_end: string | null;
  distance_flown: number | null;
  battery_charge_start: number | null;
  battery_charge_end: number | null;
  incident_flag: boolean | null;
  rth_unplanned: boolean | null;
  link_loss: boolean | null;
  deviation_flag: boolean | null;
  weather_temperature: number | null;
  notes: string | null;
  fk_mission_result_type_id: number | null;
}

interface MissionResultOption {
  mission_result_id: number;
  mission_result_code: string;
  mission_result_desc: string;
}

interface LucData {
  luc_procedure_progress: Record<string, Record<string, string>> | null;
  luc_completed_at: string | null;
  procedure: {
    procedure_id: number;
    procedure_name: string;
    procedure_code: string;
    procedure_steps: {
      tasks: {
        checklist: { checklist_id: number; checklist_code: string; checklist_name: string }[];
        communication: { communication_id: number; communication_code: string; communication_name: string }[];
        assignment: { assignment_id: number; assignment_code: string; assignment_name: string }[];
      };
    } | null;
  } | null;
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

async function fetchPostFlightData(missionId: number): Promise<{ flight: PostFlightData; result_options: MissionResultOption[] } | null> {
  try {
    const res = await fetch(`/api/operation/board/post-flight?mission_id=${missionId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

async function fetchLucData(missionId: number): Promise<LucData | null> {
  try {
    const res = await fetch(`/api/operation/missions/${missionId}/luc`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
// this component is used to generate report with luc proecedure details and things linked to mission
export async function generateMissionReport(op: Operation, timezone: string): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }, logoBase64, lucData, postFlightRes] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    fetchLogoBase64(),
    op.fk_luc_procedure_id ? fetchLucData(op.pilot_mission_id) : Promise.resolve(null),
    fetchPostFlightData(op.pilot_mission_id),
  ]);
  const pf = postFlightRes?.flight ?? null;
  const resultOptions = postFlightRes?.result_options ?? [];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm' });
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;

  const purple: [number, number, number] = [109, 40, 217];
  const slate800: [number, number, number] = [30, 41, 59];
  const slate500: [number, number, number] = [100, 116, 139];
  const slate300: [number, number, number] = [203, 213, 225];
  const emerald600: [number, number, number] = [5, 150, 105];
  const amber600: [number, number, number] = [217, 119, 6];
  const white: [number, number, number] = [255, 255, 255];
  const bgLight: [number, number, number] = [248, 250, 252];

  let y = 14;

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(...purple);
  doc.rect(0, 0, pageW, 28, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', pageW - 26, 4, 12, 12);
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('Mission Report', marginL, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 190, 255);
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · Readi Platform`,
    marginL,
    17,
  );

  y = 36;

  // ── Mission identity block ────────────────────────────────────────────────
  doc.setFillColor(...bgLight);
  doc.setDrawColor(...slate300);
  doc.setLineWidth(0.2);
  doc.roundedRect(marginL, y, contentW, 20, 2, 2, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slate800);
  doc.text(op.mission_name, marginL + 4, y + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate500);
  doc.text(`Code: ${op.mission_code}  ·  ID: #${op.pilot_mission_id}  ·  Status: ${op.status_name ?? '—'}`, marginL + 4, y + 13);

  if (op.mission_description) {
    doc.setFontSize(7.5);
    const descLines = doc.splitTextToSize(op.mission_description, contentW - 8);
    doc.text(descLines, marginL + 4, y + 18);
    y += descLines.length * 4;
  }

  y += 26;

  // ── Section helper ────────────────────────────────────────────────────────
  function sectionHeader(title: string) {
    if (y > pageH - 30) {
      doc.addPage();
      y = 16;
    }
    doc.setFillColor(...purple);
    doc.rect(marginL, y, 3, 5, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...purple);
    doc.text(title.toUpperCase(), marginL + 6, y + 4);
    doc.setDrawColor(...slate300);
    doc.setLineWidth(0.15);
    doc.line(marginL + 6 + doc.getTextWidth(title.toUpperCase()) + 2, y + 2.5, pageW - marginR, y + 2.5);
    y += 9;
  }

  function infoRow(label: string, value: string, col: 0 | 1 = 0) {
    const colW = (contentW - 6) / 2;
    const x = col === 0 ? marginL : marginL + colW + 6;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate500);
    doc.text(label, x, y);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slate800);
    const lines = doc.splitTextToSize(value || '—', colW - 2);
    doc.text(lines, x, y + 4);
    return lines.length * 4 + 6;
  }

function twoColRow(
  label1: string, val1: string,
  label2: string, val2: string,
) {
  if (!label1 && !label2) return;

  let h1 = 0;
  let h2 = 0;

  if (label1) {
    h1 = infoRow(label1, val1, 0);
  }

  if (label2) {
    h2 = infoRow(label2, val2, 1);
  }

  if (h1 > 0 || h2 > 0) {
    y += Math.max(h1, h2);
  }
}

  // ── Timeline ──────────────────────────────────────────────────────────────
  sectionHeader('Timeline');
  twoColRow(
    'Scheduled Start', formatDateTimeInTz(op.scheduled_start, timezone),
    'Actual Start', formatDateTimeInTz(op.actual_start, timezone),
  );
  twoColRow(
    'Actual End', formatDateTimeInTz(op.actual_end, timezone),
    'Flight Duration', op.flight_duration != null ? `${op.flight_duration} min` : '—',
  );
  y += 4;

  // ── Personnel & Equipment ─────────────────────────────────────────────────
  sectionHeader('Personnel & Equipment');
  twoColRow(
    'Pilot in Command', op.pilot_name || '—',
    'Drone System', op.tool_code || '—',
  );
  twoColRow(
    'Location', op.location || '—',
    '', '',
  );
  y += 4;

  // ── Mission Details ───────────────────────────────────────────────────────
  sectionHeader('Mission Details');
  twoColRow(
    'Client', op.client_name || '—',
    'Mission Plan', op.planning_name || '—',
  );
  twoColRow(
    'Category', op.category_name || '—',
    'Type', op.type_name || '—',
  );
  y += 4;

  // ── Flight Results ────────────────────────────────────────────────────────
  sectionHeader('Flight Results');

  const resultName = pf?.fk_mission_result_type_id
    ? (resultOptions.find(r => r.mission_result_id === pf.fk_mission_result_type_id)?.mission_result_desc ?? '—')
    : '—';

  const distFlown = (pf?.distance_flown ?? op.distance_flown) != null
    ? `${(pf?.distance_flown ?? op.distance_flown)!.toLocaleString()} m`
    : '—';
  const flightDur = (pf?.flight_duration ?? op.flight_duration) != null
    ? `${pf?.flight_duration ?? op.flight_duration} min`
    : '—';

  twoColRow('Distance Flown', distFlown, 'Flight Duration', flightDur);
  twoColRow( 'Mission Result', resultName, '', '');
  twoColRow(
    'Battery Start', pf?.battery_charge_start != null ? `${pf.battery_charge_start}%` : '—',
    'Battery End', pf?.battery_charge_end != null ? `${pf.battery_charge_end}%` : '—',
  );
  twoColRow(
    'Weather Temp', pf?.weather_temperature != null ? `${pf.weather_temperature}°C` : '—',
    '', '',
  );

  // Boolean safety flags row
  if (pf) {
    const flags = [
      { label: 'Incident', val: pf.incident_flag },
      { label: 'RTH Unplanned', val: pf.rth_unplanned },
      { label: 'Link Loss', val: pf.link_loss },
      { label: 'Deviation', val: pf.deviation_flag },
    ];
    if (y > pageH - 30) { doc.addPage(); y = 16; }
    const colW = contentW / flags.length;
    flags.forEach(({ label, val }, i) => {
      const x = marginL + i * colW;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate500);
      doc.text(label, x, y);
      const isYes = val === true;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isYes ? amber600[0] : emerald600[0], isYes ? amber600[1] : emerald600[1], isYes ? amber600[2] : emerald600[2]);
      doc.text(val === null ? '—' : isYes ? 'Yes' : 'No', x, y + 4);
    });
    y += 12;
  }

  // Post-flight notes (separate from pilot notes)
  if (pf?.notes) {
    if (y > pageH - 30) { doc.addPage(); y = 16; }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate500);
    doc.text('Post-Flight Notes', marginL, y);
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate800);
    const pfNoteLines = doc.splitTextToSize(pf.notes, contentW);
    doc.text(pfNoteLines, marginL, y);
    y += pfNoteLines.length * 4 + 4;
  }

  y += 4;

  // ── Pilot Notes ───────────────────────────────────────────────────────────
  if (op.notes) {
    sectionHeader('Pilot Notes');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate800);
    const noteLines = doc.splitTextToSize(op.notes, contentW);
    doc.text(noteLines, marginL, y);
    y += noteLines.length * 4 + 6;
  }

  // ── LUC Procedure ─────────────────────────────────────────────────────────
  if (lucData?.procedure) {
    const proc = lucData.procedure;
    const progress = lucData.luc_procedure_progress ?? {};
    const tasks = proc.procedure_steps?.tasks;

    sectionHeader(`LUC Procedure — ${proc.procedure_name} (${proc.procedure_code})`);

    const lucStatus = lucData.luc_completed_at ? 'COMPLETED' : 'PENDING';
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(lucStatus === 'COMPLETED' ? emerald600[0] : amber600[0], lucStatus === 'COMPLETED' ? emerald600[1] : amber600[1], lucStatus === 'COMPLETED' ? emerald600[2] : amber600[2]);
    doc.text(`Overall Status: ${lucStatus}`, marginL, y);
    if (lucData.luc_completed_at) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...slate500);
      doc.text(`Completed at: ${formatDateTimeInTz(lucData.luc_completed_at, timezone)}`, marginL + 60, y);
    }
    y += 8;

    // Checklist items table
    if (tasks?.checklist?.length) {
      const checklistRows = tasks.checklist.map((item) => [
        item.checklist_name,
        item.checklist_code,
        progress.checklist?.[item.checklist_code] === 'Y' ? '✓ Done' : '✗ Pending',
      ]);

      if (y > pageH - 40) { doc.addPage(); y = 16; }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...slate800);
      doc.text('Checklist Items', marginL, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Item', 'Code', 'Status']],
        body: checklistRows,
        styles: { fontSize: 7.5, cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 }, overflow: 'linebreak' },
        headStyles: { fillColor: purple, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: contentW * 0.6 },
          1: { cellWidth: contentW * 0.2 },
          2: { cellWidth: contentW * 0.2 },
        },
        bodyStyles: { textColor: slate800 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const val = data.cell.raw as string;
            data.cell.styles.textColor = val.startsWith('✓') ? emerald600 : amber600;
            data.cell.styles.fontStyle = 'bold';
          }
        },
        alternateRowStyles: { fillColor: bgLight },
        margin: { left: marginL, right: marginR, bottom: 16 },
        tableLineColor: slate300,
        tableLineWidth: 0.1,
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Assignment items table
    if (tasks?.assignment?.length) {
      const assignRows = tasks.assignment.map((item) => [
        item.assignment_name,
        item.assignment_code,
        progress.assignment?.[item.assignment_code] === 'Y' ? '✓ Done' : '✗ Pending',
      ]);

      if (y > pageH - 40) { doc.addPage(); y = 16; }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...slate800);
      doc.text('Assignment Items', marginL, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Item', 'Code', 'Status']],
        body: assignRows,
        styles: { fontSize: 7.5, cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 }, overflow: 'linebreak' },
        headStyles: { fillColor: purple, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: contentW * 0.6 },
          1: { cellWidth: contentW * 0.2 },
          2: { cellWidth: contentW * 0.2 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const val = data.cell.raw as string;
            data.cell.styles.textColor = val.startsWith('✓') ? emerald600 : amber600;
            data.cell.styles.fontStyle = 'bold';
          }
        },
        alternateRowStyles: { fillColor: bgLight },
        margin: { left: marginL, right: marginR, bottom: 16 },
        tableLineColor: slate300,
        tableLineWidth: 0.1,
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Communication items table
    if (tasks?.communication?.length) {
      const commRows = tasks.communication.map((item) => [
        item.communication_name,
        item.communication_code,
        progress.communication?.[item.communication_code] === 'Y' ? '✓ Done' : '✗ Pending',
      ]);

      if (y > pageH - 40) { doc.addPage(); y = 16; }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...slate800);
      doc.text('Communication Items', marginL, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Item', 'Code', 'Status']],
        body: commRows,
        styles: { fontSize: 7.5, cellPadding: { top: 2.5, right: 4, bottom: 2.5, left: 4 }, overflow: 'linebreak' },
        headStyles: { fillColor: purple, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: contentW * 0.6 },
          1: { cellWidth: contentW * 0.2 },
          2: { cellWidth: contentW * 0.2 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const val = data.cell.raw as string;
            data.cell.styles.textColor = val.startsWith('✓') ? emerald600 : amber600;
            data.cell.styles.fontStyle = 'bold';
          }
        },
        alternateRowStyles: { fillColor: bgLight },
        margin: { left: marginL, right: marginR, bottom: 16 },
        tableLineColor: slate300,
        tableLineWidth: 0.1,
      });
    }
  }

  // ── Footer on every page ───────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...slate300);
    doc.setLineWidth(0.3);
    doc.line(marginL, pageH - 12, pageW - marginR, pageH - 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slate500);
    doc.text('Generated by Readi Platform', marginL, pageH - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageW - marginR, pageH - 7, { align: 'right' });
  }

  const blob = doc.output('blob');
  triggerDownload(blob, `Mission_Report_${op.mission_code}.pdf`);
}
