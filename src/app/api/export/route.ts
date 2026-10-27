import { getOwnerLogoDataUrl } from '@/backend/services/company/owner-service';
import { getUserSession } from '@/lib/auth/server-session';
import { getImageDimensions } from '@/lib/image-dimensions';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface ExportPayload {
  format: 'csv' | 'xlsx';
  /** Embed the signed-in user's company logo (xlsx only; CSV cannot hold images). */
  includeLogo?: boolean;
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

function buildCsv(headers: string[], rows: ExportPayload['rows']): string {
  const DATE_TIME = /^(\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}.*)?|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}([ ,]+\d{1,2}:\d{2}.*)?)$/;
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    if (DATE_TIME.test(s)) return `"=""${s}"""`;
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ];
  return lines.join('\r\n');
}

function buildXlsx(headers: string[], rows: ExportPayload['rows']): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Bold header row
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = { font: { bold: true } };
    }
  }

  // Auto column widths
  ws['!cols'] = headers.map((h, ci) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[ci] ?? '').length),
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

/** Excel with the company logo in a banner above the table (SheetJS community cannot embed images, ExcelJS can). */
async function buildXlsxWithLogo(
  headers: string[],
  rows: ExportPayload['rows'],
  logoDataUrl: string,
): Promise<Buffer> {
  const { default: ExcelJS } = await import('exceljs');
  const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(logoDataUrl);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');

  const BANNER_ROWS = 4;
  for (let i = 0; i < BANNER_ROWS; i++) ws.addRow([]);
  for (let r = 1; r <= BANNER_ROWS; r++) ws.getRow(r).height = 18;

  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  rows.forEach(r => ws.addRow(r.map(v => v ?? '')));

  headers.forEach((h, ci) => {
    const maxLen = Math.max(h.length, ...rows.map(r => String(r[ci] ?? '').length));
    ws.getColumn(ci + 1).width = Math.min(maxLen + 2, 50);
  });

  // ExcelJS has no webp support; those logos fall back to a no-logo workbook.
  if (match && match[1].toLowerCase() !== 'webp') {
    const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
    const imageId = wb.addImage({ base64: match[2], extension: ext });
    // Fit inside a 160x68px box keeping the logo's aspect ratio (banner is 4 rows x 18pt).
    const dims = getImageDimensions(Buffer.from(match[2], 'base64'));
    const scale = dims ? Math.min(160 / dims.width, 68 / dims.height) : 1;
    const width = dims ? Math.round(dims.width * scale) : 68;
    const height = dims ? Math.round(dims.height * scale) : 68;
    ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width, height } });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportPayload = await req.json();
    const { format, filename, headers, rows } = body;

    if (!headers?.length || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (format === 'csv') {
      const csv = buildCsv(headers, rows);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      let logoDataUrl: string | null = null;
      if (body.includeLogo) {
        const session = await getUserSession();
        if (session) logoDataUrl = await getOwnerLogoDataUrl(session.user.ownerId);
      }
      const buf = logoDataUrl
        ? await buildXlsxWithLogo(headers, rows, logoDataUrl)
        : buildXlsx(headers, rows);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
