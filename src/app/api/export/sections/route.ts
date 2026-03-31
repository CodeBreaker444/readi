import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface Section {
  title: string;
  headers: string[];
  rows: string[][];
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: { format: string; sections: Section[]; title: string; filename: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { format, sections, title, filename } = body;

  if (!['xlsx', 'docx'].includes(format)) {
    return NextResponse.json({ error: 'Unsupported format. Use xlsx or docx.' }, { status: 400 });
  }

  if (!Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: 'sections must be a non-empty array.' }, { status: 400 });
  }

  if (format === 'xlsx') {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    for (const section of sections) {
      const { title: sheetTitle, headers, rows } = section;
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      ws['!cols'] = headers.map((h, i) => ({
        wch: Math.min(80, rows.reduce((max, r) => Math.max(max, String(r[i] ?? '').length), h.length + 2)),
      }));
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };

      const safeName = sheetTitle.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    }

    const buffer: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

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

    const exportedOn = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
      new Paragraph({ text: title ?? filename, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({
        children: [new TextRun({ text: `Exported on ${exportedOn}`, color: '64748B', size: 18 })],
      }),
      new Paragraph({ text: '' }),
    ];

    for (const section of sections) {
      const { title: sectionTitle, headers, rows } = section;

      children.push(new Paragraph({ text: sectionTitle, heading: HeadingLevel.HEADING_2 }));

      if (rows.length === 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'No data available.', color: '94A3B8', size: 18 })],
          })
        );
      } else {
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

        children.push(
          new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );
      }

      children.push(new Paragraph({ text: '' }));
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.docx"`,
        'Cache-Control': 'no-store',
        'X-Export-Duration-Ms': String(Date.now() - start),
      },
    });
  }

  return NextResponse.json({ error: 'Unhandled format' }, { status: 500 });
}
