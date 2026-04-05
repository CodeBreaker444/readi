import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export interface ExportPayload {
  format: 'csv' | 'xlsx';
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

function buildCsv(headers: string[], rows: ExportPayload['rows']): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
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
      const buf = buildXlsx(headers, rows);
      return new NextResponse(buf.buffer as ArrayBuffer, {
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
