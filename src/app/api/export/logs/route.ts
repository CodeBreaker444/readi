import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: { format: string; headers: string[]; rows: string[][]; title: string; filename: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { format, headers, rows, title, filename } = body;

  if (!['xlsx', 'docx'].includes(format)) {
    return NextResponse.json({ error: 'Unsupported format. Use xlsx or docx.' }, { status: 400 });
  }

  if (!Array.isArray(headers) || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'headers and rows must be arrays.' }, { status: 400 });
  }

  if (format === 'xlsx') {
    const XLSX = await import('xlsx');

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    ws['!cols'] = headers.map((h, i) => ({
      wch: Math.min(80, Math.max(h.length + 2, ...rows.map((r) => String(r[i] ?? '').length))),
    }));

    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logs');
    const buffer: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    console.log(`[export/logs] xlsx generated in ${Date.now() - start}ms for ${rows.length} rows`);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.xlsx"`,
        'Cache-Control': 'no-store',
        'X-Export-Duration-Ms': String(Date.now() - start),
      },
    });
  }

  if (format === 'docx') {
    const {
      Document,
      Packer,
      Paragraph,
      Table,
      TableRow,
      TableCell,
      WidthType,
      TextRun,
      HeadingLevel,
      BorderStyle,
      AlignmentType,
    } = await import('docx');

    const VIOLET = '6D28D9';
    const BORDER_COLOR = 'E2E8F0';
    const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
    const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map(
        (h) =>
          new TableCell({
            borders: cellBorders,
            shading: { fill: VIOLET },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })],
              }),
            ],
          })
      ),
    });

    const dataRows = rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: cell, size: 18 })],
                  }),
                ],
              })
          ),
        })
    );

    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const exportedOn = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: title ?? filename, heading: HeadingLevel.HEADING_1 }),
            new Paragraph({
              children: [
                new TextRun({ text: `Exported on ${exportedOn}`, color: '64748B', size: 18 }),
              ],
            }),
            new Paragraph({ text: '' }),
            table,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    console.log(`[export/logs] docx generated in ${Date.now() - start}ms for ${rows.length} rows`);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.docx"`,
        'Cache-Control': 'no-store',
        'X-Export-Duration-Ms': String(Date.now() - start),
      },
    });
  }

  return NextResponse.json({ error: 'Unhandled format' }, { status: 500 });
}
