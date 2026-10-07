import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  ShadingType,
} from "docx";
import { ProtocolData } from "../types/protocol";
import jaLogo from "../assets/logo_ja.png";

const COLOR_PRIMARY = "4A227A";
const COLOR_SECONDARY = "7C3AED"; // Helles JA-Lila
const COLOR_TEXT = "1E293B";
const COLOR_MUTED = "64748B";
const COLOR_BORDER = "CBD5E1";
const COLOR_BOX_BG = "F8FAFC";
const COLOR_WHITE = "FFFFFF";

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "auto" };
const NO_TABLE_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

// Helper to convert Markdown inline styles (bold, italic, arrows, checkboxes) into TextRuns
function parseInlineRuns(text: string, baseFontSize = 21): TextRun[] {
  // Replace arrows
  let processed = text
    .replace(/-->/g, "→")
    .replace(/->/g, "→")
    .replace(/<--/g, "←")
    .replace(/<-/g, "←")
    .replace(/\[x\]/gi, "☑ ")
    .replace(/\[ \]/g, "☐ ");

  // Tokenize bold (**...**) and italic (*...*)
  const runs: TextRun[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(processed)) !== null) {
    if (match.index > lastIdx) {
      runs.push(
        new TextRun({
          text: processed.substring(lastIdx, match.index),
          size: baseFontSize,
          color: COLOR_TEXT,
          font: "Calibri",
        })
      );
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      runs.push(
        new TextRun({
          text: token.substring(2, token.length - 2),
          bold: true,
          size: baseFontSize,
          color: COLOR_TEXT,
          font: "Calibri",
        })
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      runs.push(
        new TextRun({
          text: token.substring(1, token.length - 1),
          italics: true,
          size: baseFontSize,
          color: COLOR_TEXT,
          font: "Calibri",
        })
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < processed.length) {
    runs.push(
      new TextRun({
        text: processed.substring(lastIdx),
        size: baseFontSize,
        color: COLOR_TEXT,
        font: "Calibri",
      })
    );
  }

  return runs.length > 0
    ? runs
    : [new TextRun({ text: "", size: baseFontSize, font: "Calibri" })];
}

// Check if a line is a markdown table separator (e.g. |---|---|)
function isTableSeparator(cells: string[]): boolean {
  return cells.every((c) => {
    const trimmed = c.trim();
    return (
      trimmed.length > 0 &&
      trimmed.split("").every((ch) => ch === "-" || ch === ":" || ch === " ")
    );
  });
}

// Parse markdown table rows
function parseTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.substring(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.substring(0, trimmed.length - 1);
  return trimmed.split("|").map((cell) => cell.trim());
}

// Convert a markdown block into an array of docx Paragraphs or Tables
function parseContentBlock(content: string): (Paragraph | Table)[] {
  if (!content || !content.trim()) {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "(Keine Angaben)",
            italics: true,
            color: COLOR_MUTED,
            size: 20,
            font: "Calibri",
          }),
        ],
        spacing: { before: 80, after: 80 },
      }),
    ];
  }

  const lines = content.split(/\r?\n/);
  const elements: (Paragraph | Table)[] = [];
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;

    const rowsData: string[][] = [];
    for (const tline of tableBuffer) {
      const cells = parseTableRow(tline);
      if (!isTableSeparator(cells)) {
        rowsData.push(cells);
      }
    }

    if (rowsData.length > 0) {
      const colCount = Math.max(...rowsData.map((r) => r.length));
      const colWidthPercent = Math.floor(100 / colCount);

      const tableRows = rowsData.map((rowCells, rowIdx) => {
        const isHeader = rowIdx === 0;
        return new TableRow({
          tableHeader: isHeader,
          children: Array.from({ length: colCount }).map((_, cIdx) => {
            const cellText = rowCells[cIdx] || "";
            return new TableCell({
              width: { size: colWidthPercent, type: WidthType.PERCENTAGE },
              shading: isHeader
                ? {
                    type: ShadingType.CLEAR,
                    fill: "EDE9FE",
                    color: "auto",
                  }
                : undefined,
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
                bottom: {
                  style: isHeader ? BorderStyle.DOUBLE : BorderStyle.SINGLE,
                  size: isHeader ? 8 : 4,
                  color: isHeader ? COLOR_PRIMARY : COLOR_BORDER,
                },
                left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
                right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
              },
              children: [
                new Paragraph({
                  children: parseInlineRuns(cellText, isHeader ? 20 : 19),
                  spacing: { before: 40, after: 40 },
                }),
              ],
            });
          }),
        });
      });

      elements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        })
      );
    }
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      tableBuffer.push(trimmed);
      continue;
    } else {
      flushTable();
    }

    if (!trimmed) {
      elements.push(
        new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [],
        })
      );
      continue;
    }

    // Bullet point / list item
    const isBullet =
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      trimmed.startsWith("• ");
    const isNumbered = /^\d+\.\s+/.test(trimmed);

    if (isBullet) {
      const textWithoutBullet = trimmed.replace(/^[-*•]\s+/, "");
      elements.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseInlineRuns(textWithoutBullet, 21),
          spacing: { before: 50, after: 50 },
        })
      );
    } else if (isNumbered) {
      elements.push(
        new Paragraph({
          children: parseInlineRuns(trimmed, 21),
          spacing: { before: 50, after: 50 },
        })
      );
    } else {
      elements.push(
        new Paragraph({
          children: parseInlineRuns(trimmed, 21),
          spacing: { before: 60, after: 60 },
        })
      );
    }
  }

  flushTable();
  return elements;
}

// Creates a styled content section card (mimicking LaTeX \begin{contentbox})
function createSectionCard(
  title: string,
  content: string,
  subtitle?: string
): Table {
  const contentElements = parseContentBlock(content);

  const innerChildren: (Paragraph | Table)[] = [
    // Header Pill paragraph
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 40, after: subtitle ? 30 : 120 },
      children: [
        new TextRun({
          text: `  ${title}  `,
          bold: true,
          color: COLOR_WHITE,
          size: 21,
          font: "Calibri",
          shading: {
            type: ShadingType.CLEAR,
            fill: COLOR_PRIMARY,
            color: "auto",
          },
        }),
      ],
    }),
  ];

  if (subtitle) {
    innerChildren.push(
      new Paragraph({
        spacing: { before: 0, after: 120 },
        children: [
          new TextRun({
            text: subtitle,
            italics: true,
            size: 17,
            color: COLOR_MUTED,
            font: "Calibri",
          }),
        ],
      })
    );
  }

  innerChildren.push(...contentElements);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: {
              type: ShadingType.CLEAR,
              fill: COLOR_BOX_BG,
              color: "auto",
            },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
            },
            children: innerChildren,
          }),
        ],
      }),
    ],
  });
}

// Fetch logo as Uint8Array
async function loadLogoImage(): Promise<Uint8Array | null> {
  try {
    const res = await fetch(jaLogo);
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.warn("Logo konnte für Word-Export nicht geladen werden:", err);
    return null;
  }
}

/**
 * Generates a complete, beautifully styled Word document (.docx) from ProtocolData.
 */
export async function generateProtocolDocx(data: ProtocolData): Promise<Blob> {
  const logoBytes = await loadLogoImage();

  // Header section (Logo on left, Title on right)
  const headerCells: TableCell[] = [];

  if (logoBytes) {
    headerCells.push(
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        borders: {
          top: NO_BORDER,
          bottom: NO_BORDER,
          left: NO_BORDER,
          right: NO_BORDER,
        },
        margins: { top: 0, bottom: 0, left: 0, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new ImageRun({
                data: logoBytes,
                type: "png",
                transformation: {
                  width: 72,
                  height: 72,
                },
              }),
            ],
          }),
        ],
      })
    );
  }

  headerCells.push(
    new TableCell({
      width: { size: logoBytes ? 80 : 100, type: WidthType.PERCENTAGE },
      borders: {
        top: NO_BORDER,
        bottom: NO_BORDER,
        left: NO_BORDER,
        right: NO_BORDER,
      },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "PROTOKOLL JUGENDAUSSCHUSS",
              bold: true,
              size: 32,
              color: COLOR_PRIMARY,
              font: "Calibri",
            }),
          ],
          spacing: { after: 40 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Jugendausschuss der Stadt Leonberg",
              bold: true,
              size: 24,
              color: COLOR_SECONDARY,
              font: "Calibri",
            }),
          ],
          spacing: { after: 20 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Protokollvorlage für Projektgruppen",
              size: 19,
              color: COLOR_MUTED,
              font: "Calibri",
            }),
          ],
        }),
      ],
    })
  );

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_TABLE_BORDERS,
    rows: [
      new TableRow({
        children: headerCells,
      }),
    ],
  });

  // Metadata Table (Datum, Projektgruppe)
  const metaParagraphs = [
    new Paragraph({
      spacing: { before: 180, after: 60 },
      children: [
        new TextRun({
          text: "Datum: ",
          bold: true,
          size: 24,
          color: COLOR_TEXT,
          font: "Calibri",
        }),
        new TextRun({
          text: data.date || "—",
          size: 24,
          color: COLOR_TEXT,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 180 },
      children: [
        new TextRun({
          text: "Projektgruppe: ",
          bold: true,
          size: 24,
          color: COLOR_TEXT,
          font: "Calibri",
        }),
        new TextRun({
          text: data.projectGroup || "—",
          size: 24,
          color: COLOR_PRIMARY,
          bold: true,
          font: "Calibri",
        }),
      ],
    }),
  ];

  // Spacers helper
  const cardSpacer = () =>
    new Paragraph({
      spacing: { before: 140, after: 140 },
      children: [],
    });

  // Section Cards
  const box1 = createSectionCard(
    "Anwesende Mitglieder:",
    data.attendees
  );
  const box2 = createSectionCard(
    "Hauptthemen des Treffens:",
    data.topics
  );
  const box3 = createSectionCard(
    "Zusammenfassung der wichtigsten besprochenen Punkte:",
    data.summary
  );
  const box4 = createSectionCard(
    "Nächste Schritte - wer jeweils zuständig & bis wann fertig?",
    data.nextSteps
  );
  const box5 = createSectionCard(
    "Ist Unterstützung benötigt? Wann und wie?",
    data.support,
    "(von Sprecher*innen, Stadtjugendref, Verwaltung, …)"
  );
  const box6 = createSectionCard(
    "Wer muss beim nächsten Treffen zwingend dabei sein?",
    data.nextAttendees,
    "(Sprecher*innen, Stadtjugendref, Kooperationspartner, …)"
  );

  // Next Meeting
  const nextMeetingParagraphs = [
    new Paragraph({
      spacing: { before: 200, after: 40 },
      children: [
        new TextRun({
          text: "Ort & Zeit des nächsten Treffens: ",
          bold: true,
          size: 22,
          color: COLOR_TEXT,
          font: "Calibri",
        }),
        new TextRun({
          text: data.nextMeeting || "—",
          size: 22,
          color: COLOR_TEXT,
          font: "Calibri",
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: "(falls schon festgelegt, sonst bitte möglichst zeitnah nachschicken!)",
          italics: true,
          size: 18,
          color: COLOR_MUTED,
          font: "Calibri",
        }),
      ],
    }),
  ];

  // Signature Boxes (Speaker & Recorder)
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          // Speaker Signature
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
            },
            children: [
              new Paragraph({
                spacing: { before: 60, after: 450 },
                children: [
                  new TextRun({
                    text: `Name in Druckschrift: ${data.speakerName || ""}`,
                    size: 18,
                    color: COLOR_MUTED,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 60, after: 40 },
                children: [
                  new TextRun({
                    text: "Unterschrift Gruppensprecher*in",
                    bold: true,
                    size: 19,
                    color: COLOR_TEXT,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          // Empty spacer cell between
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: {
              top: NO_BORDER,
              bottom: NO_BORDER,
              left: NO_BORDER,
              right: NO_BORDER,
            },
            children: [new Paragraph({ children: [] })],
          }),
          // Recorder Signature
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
              right: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
            },
            children: [
              new Paragraph({
                spacing: { before: 60, after: 450 },
                children: [
                  new TextRun({
                    text: `Name in Druckschrift: ${data.recorderName || ""}`,
                    size: 18,
                    color: COLOR_MUTED,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 60, after: 40 },
                children: [
                  new TextRun({
                    text: "Unterschrift Protokollant*in",
                    bold: true,
                    size: 19,
                    color: COLOR_TEXT,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Assemble document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1200,
              right: 1200,
            },
          },
        },
        children: [
          headerTable,
          new Paragraph({ spacing: { before: 100, after: 100 }, children: [] }),
          ...metaParagraphs,
          box1,
          cardSpacer(),
          box2,
          cardSpacer(),
          box3,
          cardSpacer(),
          box4,
          cardSpacer(),
          box5,
          cardSpacer(),
          box6,
          ...nextMeetingParagraphs,
          signatureTable,
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
