/**
 * LaTeX converter and template renderer matching the Rust implementation
 */

export function escapeLatexSpecialChars(input) {
  if (!input) return "";
  let result = "";
  for (const c of input) {
    switch (c) {
      case "&":
        result += "\\&";
        break;
      case "%":
        result += "\\%";
        break;
      case "$":
        result += "\\$";
        break;
      case "#":
        result += "\\#";
        break;
      case "_":
        result += "\\_";
        break;
      case "{":
        result += "\\{";
        break;
      case "}":
        result += "\\}";
        break;
      case "~":
        result += "\\textasciitilde{}";
        break;
      case "^":
        result += "\\textasciicircum{}";
        break;
      case "\\":
        result += "\\textbackslash{}";
        break;
      default:
        result += c;
    }
  }
  return result;
}

export function formatInlineMarkdown(escapedInput) {
  if (!escapedInput) return "";
  let text = escapedInput;

  // Arrows
  text = text.replaceAll("--&gt;", "$\\rightarrow$");
  text = text.replaceAll("-&gt;", "$\\rightarrow$");
  text = text.replaceAll("->", "$\\rightarrow$");
  text = text.replaceAll("&lt;--", "$\\leftarrow$");
  text = text.replaceAll("&lt;-", "$\\leftarrow$");
  text = text.replaceAll("<-", "$\\leftarrow$");

  // Checkboxes
  text = text.replaceAll("[x]", "\\textbf{[\\checkmark]}");
  text = text.replaceAll("[X]", "\\textbf{[\\checkmark]}");
  text = text.replaceAll("[ ]", "[${\\;}$]");

  // Bold: **text**
  text = text.replace(/\*\*(.*?)\*\*/g, "\\textbf{$1}");

  // Italic: *text* (avoiding double asterisks)
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "\\textit{$1}");

  return text;
}

function isTableSeparator(cells) {
  return cells.every((c) => {
    const trimmed = c.trim();
    return (
      trimmed.length > 0 &&
      trimmed.split("").every((ch) => ch === "-" || ch === ":" || ch === " ")
    );
  });
}

function parseTableRow(line) {
  let trimmed = line.trim();
  let parts = trimmed.split("|");
  if (trimmed.startsWith("|") && parts.length > 1) {
    parts.shift();
  }
  if (trimmed.endsWith("|") && parts.length > 0) {
    parts.pop();
  }
  return parts.map((s) => s.trim());
}

export function tableToLatex(lines) {
  const rows = [];
  for (const line of lines) {
    const cells = parseTableRow(line);
    if (cells.length === 0) continue;
    if (isTableSeparator(cells)) continue;
    rows.push(cells);
  }

  if (rows.length === 0) return "";

  const colCount = Math.max(...rows.map((r) => r.length), 1);
  if (colCount === 0) return "";

  let tex = "\\vspace{1.5mm}\\noindent\n";
  const colSpec = `@{}` + ` *{${colCount}}{>{{\\raggedright\\arraybackslash}}X}` + ` @{}`;
  tex += `\\begin{tabularx}{\\linewidth}{${colSpec}}\n`;
  tex += `\\toprule\n`;

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const formattedCells = [];

    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      const cellText = row[colIdx] || "";
      const escaped = escapeLatexSpecialChars(cellText);
      let formatted = formatInlineMarkdown(escaped);
      if (rowIdx === 0 && !formatted.startsWith("\\textbf{")) {
        formatted = `\\textbf{${formatted}}`;
      }
      formattedCells.push(formatted);
    }

    tex += formattedCells.join(" & ") + " \\\\\n";

    if (rowIdx === 0) {
      tex += "\\midrule\n";
    }
  }

  tex += "\\bottomrule\n";
  tex += "\\end{tabularx}\n\\vspace{1.5mm}\\par\n";

  return tex;
}

export function textToLatexBlock(input) {
  if (!input || !input.trim()) {
    return "\\textit{\\small\\color{subtleGray}-- Keine Angaben --}";
  }

  const lines = input.split(/\r?\n/);
  let output = "";
  let inItemize = false;
  let inEnumerate = false;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const lineTrimmed = line.trim();

    if (!lineTrimmed) {
      if (inItemize) {
        output += "\\end{itemize}\n";
        inItemize = false;
      }
      if (inEnumerate) {
        output += "\\end{enumerate}\n";
        inEnumerate = false;
      }
      output += "\\vspace{1.5mm}\\par\n";
      i++;
      continue;
    }

    // Check for markdown table
    if (lineTrimmed.startsWith("|") && lineTrimmed.includes("|")) {
      if (inItemize) {
        output += "\\end{itemize}\n";
        inItemize = false;
      }
      if (inEnumerate) {
        output += "\\end{enumerate}\n";
        inEnumerate = false;
      }

      const tableLines = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().includes("|")
      ) {
        tableLines.push(lines[i]);
        i++;
      }

      const tableLatex = tableToLatex(tableLines);
      output += tableLatex;
      continue;
    }

    // Check for bullet list item: •, - , * , +
    const isBullet =
      lineTrimmed.startsWith("•") ||
      lineTrimmed.startsWith("- ") ||
      lineTrimmed.startsWith("* ") ||
      lineTrimmed.startsWith("+ ");

    // Check for numbered item: "1. ", "2. ", etc.
    const matchNum = lineTrimmed.match(/^(\d+)\.\s+(.*)$/);

    if (isBullet) {
      if (inEnumerate) {
        output += "\\end{enumerate}\n";
        inEnumerate = false;
      }
      if (!inItemize) {
        output +=
          "\\begin{itemize}\\setlength{\\itemsep}{1.5pt}\\setlength{\\parskip}{0pt}\n";
        inItemize = true;
      }

      let itemContent = "";
      if (lineTrimmed.startsWith("•")) {
        itemContent = lineTrimmed.replace(/^•\s*/, "");
      } else {
        itemContent = lineTrimmed.substring(2).trim();
      }

      const escaped = escapeLatexSpecialChars(itemContent);
      const formatted = formatInlineMarkdown(escaped);
      output += `  \\item ${formatted}\n`;
    } else if (matchNum) {
      if (inItemize) {
        output += "\\end{itemize}\n";
        inItemize = false;
      }
      if (!inEnumerate) {
        output +=
          "\\begin{enumerate}\\setlength{\\itemsep}{1.5pt}\\setlength{\\parskip}{0pt}\n";
        inEnumerate = true;
      }

      const itemContent = matchNum[2].trim();
      const escaped = escapeLatexSpecialChars(itemContent);
      const formatted = formatInlineMarkdown(escaped);
      output += `  \\item ${formatted}\n`;
    } else {
      if (inItemize) {
        output += "\\end{itemize}\n";
        inItemize = false;
      }
      if (inEnumerate) {
        output += "\\end{enumerate}\n";
        inEnumerate = false;
      }

      const escaped = escapeLatexSpecialChars(lineTrimmed);
      const formatted = formatInlineMarkdown(escaped);
      output += `${formatted} \\par\n`;
    }

    i++;
  }

  if (inItemize) {
    output += "\\end{itemize}\n";
  }
  if (inEnumerate) {
    output += "\\end{enumerate}\n";
  }

  return output.trimEnd();
}

export function renderLatexTemplate(templateStr, data) {
  const dateStr = !data.date || !data.date.trim()
    ? "\\rule[-1.5pt]{4.5cm}{0.6pt}"
    : `\\textbf{${escapeLatexSpecialChars(data.date)}}`;

  const projectGroupStr = !data.projectGroup || !data.projectGroup.trim()
    ? "\\rule[-1.5pt]{9.5cm}{0.6pt}"
    : `\\textbf{${escapeLatexSpecialChars(data.projectGroup)}}`;

  const nextMeetingStr = !data.nextMeeting || !data.nextMeeting.trim()
    ? "\\rule[-1.5pt]{10.5cm}{0.6pt}"
    : `\\textbf{${escapeLatexSpecialChars(data.nextMeeting)}}`;

  const speakerStr = !data.speakerName || !data.speakerName.trim()
    ? ""
    : `\\textbf{${escapeLatexSpecialChars(data.speakerName)}}`;

  const recorderStr = !data.recorderName || !data.recorderName.trim()
    ? ""
    : `\\textbf{${escapeLatexSpecialChars(data.recorderName)}}`;

  let tex = templateStr;
  tex = tex.replaceAll("{{DATE_PLACEHOLDER}}", dateStr);
  tex = tex.replaceAll("{{PROJECT_GROUP_PLACEHOLDER}}", projectGroupStr);
  tex = tex.replaceAll("{{ATTENDEES_PLACEHOLDER}}", textToLatexBlock(data.attendees));
  tex = tex.replaceAll("{{TOPICS_PLACEHOLDER}}", textToLatexBlock(data.topics));
  tex = tex.replaceAll("{{SUMMARY_PLACEHOLDER}}", textToLatexBlock(data.summary));
  tex = tex.replaceAll("{{NEXT_STEPS_PLACEHOLDER}}", textToLatexBlock(data.nextSteps));
  tex = tex.replaceAll("{{SUPPORT_PLACEHOLDER}}", textToLatexBlock(data.support));
  tex = tex.replaceAll("{{NEXT_ATTENDEES_PLACEHOLDER}}", textToLatexBlock(data.nextAttendees));
  tex = tex.replaceAll("{{NEXT_MEETING_PLACEHOLDER}}", nextMeetingStr);
  tex = tex.replaceAll("{{SPEAKER_NAME_PLACEHOLDER}}", speakerStr);
  tex = tex.replaceAll("{{RECORDER_NAME_PLACEHOLDER}}", recorderStr);

  return tex;
}
