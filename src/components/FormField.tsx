import React, { useRef, useEffect, useCallback } from "react";
import { Toolbar } from "./Toolbar";

interface FormFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  minRows?: number;
  badgeExtra?: string;
}

function formatInline(raw: string): string {
  let text = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold: **text** -> <strong>text</strong>
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text* -> <em>$1</em>
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  // Arrow: -> -> →
  text = text.replace(/->/g, "→");

  return text;
}

// Convert stored markdown string into editable HTML
function markdownToHtml(md: string): string {
  if (!md) return "";
  const lines = md.split("\n");
  const htmlParts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line is start of markdown table
    if (trimmed.startsWith("|") && trimmed.includes("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }

      // Parse table rows
      const rows: string[][] = [];
      for (const tline of tableLines) {
        let parts = tline.trim().split("|").map((s) => s.trim());
        if (tline.trim().startsWith("|") && parts.length > 1) parts.shift();
        if (tline.trim().endsWith("|") && parts.length > 0) parts.pop();

        // Check if divider line like |---|---|
        const isSep = parts.every((p) => p.length > 0 && /^[:\- ]+$/.test(p));
        if (isSep) continue;

        rows.push(parts);
      }

      if (rows.length > 0) {
        let maxCols = rows.reduce((max, r) => Math.max(max, r.length), 1);
        let tableHtml = `<div class="protocol-table-wrapper my-2.5 relative group/tbl border border-slate-200 dark:border-zinc-700/80 rounded-lg overflow-hidden bg-white dark:bg-zinc-900/60 shadow-2xs" contenteditable="false">`;
        tableHtml += `<div class="flex flex-wrap items-center justify-between gap-1 px-2.5 py-1 bg-slate-50/90 dark:bg-zinc-800/60 border-b border-slate-200/80 dark:border-zinc-700/80 select-none text-[10px]">`;
        tableHtml += `<div class="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-medium">`;
        tableHtml += `<button type="button" onmousedown="event.preventDefault()" class="btn-add-row font-medium text-slate-600 dark:text-zinc-300 hover:text-[#4A227A] dark:hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer" title="Neue Zeile unten anfügen">+ Zeile</button>`;
        tableHtml += `<button type="button" onmousedown="event.preventDefault()" class="btn-add-col font-medium text-slate-600 dark:text-zinc-300 hover:text-[#4A227A] dark:hover:text-violet-300 px-1.5 py-0.5 rounded hover:bg-violet-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer" title="Neue Spalte rechts anfügen">+ Spalte</button>`;
        tableHtml += `</div>`;
        tableHtml += `<button type="button" onmousedown="event.preventDefault()" class="btn-delete-table font-medium text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer" title="Ganze Tabelle löschen">✕ Tabelle löschen</button>`;
        tableHtml += `</div>`;
        tableHtml += `<table class="protocol-table w-full table-fixed border-collapse text-xs">`;

        // Header (first row)
        const headerRow = rows[0];
        tableHtml += `<thead class="bg-slate-100/80 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200"><tr>`;
        for (let c = 0; c < maxCols; c++) {
          const cell = headerRow[c] || `Spalte ${c + 1}`;
          const formatted = formatInline(cell);
          tableHtml += `<th class="border-b border-r last:border-r-0 border-slate-200 dark:border-zinc-700/80 p-2 font-semibold text-left select-text focus:outline-none focus:bg-violet-50/50 dark:focus:bg-zinc-800/80 break-words group/th relative" contenteditable="true">`;
          tableHtml += `<div class="flex items-center justify-between gap-1">`;
          tableHtml += `<span class="outline-none flex-1">${formatted || "<br>"}</span>`;
          tableHtml += `<button type="button" contenteditable="false" onmousedown="event.preventDefault()" class="btn-del-this-col text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-1 py-0.5 rounded text-[10px] font-bold cursor-pointer select-none transition-colors" title="Diese Spalte löschen">✕</button>`;
          tableHtml += `</div></th>`;
        }
        // Action col header
        tableHtml += `<th class="action-col w-7 p-0 border-b border-slate-200 dark:border-zinc-700/80 bg-slate-100/50 dark:bg-zinc-800/50 select-none" contenteditable="false"></th>`;
        tableHtml += `</tr></thead>`;

        // Body (subsequent rows)
        tableHtml += `<tbody>`;
        for (let r = 1; r < rows.length; r++) {
          tableHtml += `<tr class="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors border-b last:border-b-0 border-slate-100 dark:border-zinc-800 group/tr">`;
          const row = rows[r];
          for (let c = 0; c < maxCols; c++) {
            const cell = row[c] || "";
            const formatted = formatInline(cell);
            tableHtml += `<td class="border-r border-slate-200 dark:border-zinc-700/80 p-2 text-slate-700 dark:text-zinc-300 select-text focus:outline-none focus:bg-violet-50/50 dark:focus:bg-zinc-800/80 break-words" contenteditable="true">${formatted || "<br>"}</td>`;
          }
          tableHtml += `<td class="action-col w-7 p-0 text-center border-slate-200 dark:border-zinc-700/80 select-none" contenteditable="false"><button type="button" onmousedown="event.preventDefault()" class="btn-del-this-row text-slate-300 hover:text-red-600 dark:hover:text-red-400 p-1 text-[11px] font-bold cursor-pointer transition-colors" title="Diese Zeile löschen">✕</button></td>`;
          tableHtml += `</tr>`;
        }
        tableHtml += `</tbody></table></div><div><br></div>`;
        htmlParts.push(tableHtml);
      }
      continue;
    }

    // Normal line
    const formatted = formatInline(line);
    htmlParts.push(`<div>${formatted || "<br>"}</div>`);
    i++;
  }

  return htmlParts.join("");
}

function serializeTable(tableEl: HTMLElement): string {
  const trs = Array.from(tableEl.querySelectorAll("tr"));
  if (trs.length === 0) return "";
  const tableLines: string[] = [];
  let maxCols = 0;

  const rowData = trs.map((tr) => {
    const cells = Array.from(tr.querySelectorAll("th, td"))
      .filter((c) => !c.classList.contains("action-col"))
      .map((cell) => {
        const clone = cell.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("button, .btn-del-this-col, .btn-del-this-row").forEach((b) => b.remove());
        clone.querySelectorAll("strong, b").forEach((b) => {
          b.outerHTML = `**${b.textContent}**`;
        });
        clone.querySelectorAll("em, i").forEach((i) => {
          i.outerHTML = `*${i.textContent}*`;
        });
        return clone.textContent ? clone.textContent.replace(/\n/g, " ").trim() : "";
      });
    if (cells.length > maxCols) maxCols = cells.length;
    return cells;
  });

  if (rowData.length > 0 && maxCols > 0) {
    // Header row
    const header = rowData[0];
    while (header.length < maxCols) header.push("");
    tableLines.push(`| ${header.join(" | ")} |`);

    // Separator row
    const sep = Array(maxCols).fill("---");
    tableLines.push(`| ${sep.join(" | ")} |`);

    // Body rows
    for (let r = 1; r < rowData.length; r++) {
      const row = rowData[r];
      while (row.length < maxCols) row.push("");
      tableLines.push(`| ${row.join(" | ")} |`);
    }
  }
  return `\n\n${tableLines.join("\n")}\n\n`;
}

// Convert editable HTML back into clean markdown string
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  const container = document.createElement("div");
  container.innerHTML = html;

  const serializeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Directly handle table wrapper and ignore everything outside <table>
      if (el.classList.contains("protocol-table-wrapper")) {
        const table = el.querySelector("table");
        return table ? serializeTable(table) : "";
      }

      if (tag === "table") {
        return serializeTable(el);
      }

      // If inside table wrapper but not table, ignore (e.g. delete button, etc.)
      if (el.closest(".protocol-table-wrapper") && !el.closest("table")) {
        return "";
      }

      if (tag === "strong" || tag === "b") {
        let inner = "";
        el.childNodes.forEach((c) => {
          inner += serializeNode(c);
        });
        return `**${inner}**`;
      }

      if (tag === "em" || tag === "i") {
        let inner = "";
        el.childNodes.forEach((c) => {
          inner += serializeNode(c);
        });
        return `*${inner}*`;
      }

      if (tag === "br") {
        return "\n";
      }

      if (tag === "div" || tag === "p") {
        let inner = "";
        el.childNodes.forEach((c) => {
          inner += serializeNode(c);
        });
        return inner ? `\n${inner}` : "\n";
      }

      let result = "";
      el.childNodes.forEach((c) => {
        result += serializeNode(c);
      });
      return result;
    }
    return "";
  };

  let text = serializeNode(container);
  // Normalize whitespace & line endings
  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

// Helper to insert text at selection in contentEditable
function insertTextAtSelection(text: string) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  sel.removeAllRanges();
  sel.addRange(range);
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  placeholder,
  value,
  onChange,
  minRows = 3,
  badgeExtra,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isInternalChangeRef = useRef(false);

  const linesCount = value ? value.split("\n").length : 0;
  const charsCount = value.length;

  // Synchronize incoming value from props to editor HTML
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    const currentMarkdown = htmlToMarkdown(editor.innerHTML);
    if (currentMarkdown !== value) {
      editor.innerHTML = markdownToHtml(value);
    }
  }, [value]);

  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const md = htmlToMarkdown(editor.innerHTML);
    isInternalChangeRef.current = true;
    onChange(md);
  }, [onChange]);

  // Click handler to catch delete table, row and col button clicks
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Delete this specific column (from column header ✕ button)
    const delThisColBtn = target.closest(".btn-del-this-col");
    if (delThisColBtn) {
      e.preventDefault();
      e.stopPropagation();
      const th = delThisColBtn.closest("th");
      const table = delThisColBtn.closest("table");
      if (th && table) {
        const headerRow = table.querySelector("thead tr");
        if (headerRow) {
          const headerCells = Array.from(headerRow.querySelectorAll("th")).filter(
            (c) => !c.classList.contains("action-col")
          );
          if (headerCells.length > 1) {
            const colIndex = headerCells.indexOf(th);
            if (colIndex >= 0) {
              th.remove();
              const bodyRows = table.querySelectorAll("tbody tr");
              bodyRows.forEach((tr) => {
                const dataCells = Array.from(tr.querySelectorAll("td")).filter(
                  (c) => !c.classList.contains("action-col")
                );
                if (dataCells[colIndex]) {
                  dataCells[colIndex].remove();
                }
              });
              handleInput();
            }
          }
        }
      }
      return;
    }

    // Delete this specific row (from row ✕ button)
    const delThisRowBtn = target.closest(".btn-del-this-row");
    if (delThisRowBtn) {
      e.preventDefault();
      e.stopPropagation();
      const tr = delThisRowBtn.closest("tr");
      const wrapper = delThisRowBtn.closest(".protocol-table-wrapper");
      const tbody = tr?.parentElement;
      if (tr && tbody) {
        tr.remove();
        if (tbody.children.length === 0 && wrapper) {
          wrapper.remove();
        }
        handleInput();
      }
      return;
    }

    // Add Row
    const addRowBtn = target.closest(".btn-add-row");
    if (addRowBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = addRowBtn.closest(".protocol-table-wrapper");
      const currentTable = wrapper?.querySelector("table");
      if (currentTable) {
        const tbody = currentTable.querySelector("tbody") || currentTable;
        const headerRow = currentTable.querySelector("thead tr");
        const dataCols = headerRow
          ? Array.from(headerRow.querySelectorAll("th")).filter((c) => !c.classList.contains("action-col"))
          : [];
        const colCount = dataCols.length > 0 ? dataCols.length : 3;

        const newTr = document.createElement("tr");
        newTr.className = "hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors border-b last:border-b-0 border-slate-100 dark:border-zinc-800 group/tr";
        for (let c = 0; c < colCount; c++) {
          const newTd = document.createElement("td");
          newTd.className = "border-r border-slate-200 dark:border-zinc-700/80 p-2 text-slate-700 dark:text-zinc-300 select-text focus:outline-none focus:bg-violet-50/50 dark:focus:bg-zinc-800/80 break-words";
          newTd.contentEditable = "true";
          newTd.innerHTML = "<br>";
          newTr.appendChild(newTd);
        }
        const actionTd = document.createElement("td");
        actionTd.className = "action-col w-7 p-0 text-center border-slate-200 dark:border-zinc-700/80 select-none";
        actionTd.contentEditable = "false";
        actionTd.innerHTML = `<button type="button" onmousedown="event.preventDefault()" class="btn-del-this-row text-slate-300 hover:text-red-600 dark:hover:text-red-400 p-1 text-[11px] font-bold cursor-pointer transition-colors" title="Diese Zeile löschen">✕</button>`;
        newTr.appendChild(actionTd);

        tbody.appendChild(newTr);
        handleInput();

        setTimeout(() => {
          const firstTd = newTr.querySelector("td");
          if (firstTd) firstTd.focus();
        }, 10);
      }
      return;
    }

    // Add Column
    const addColBtn = target.closest(".btn-add-col");
    if (addColBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = addColBtn.closest(".protocol-table-wrapper");
      const currentTable = wrapper?.querySelector("table");
      if (currentTable) {
        const headerRow = currentTable.querySelector("thead tr");
        if (headerRow) {
          const headerCells = Array.from(headerRow.querySelectorAll("th")).filter(
            (c) => !c.classList.contains("action-col")
          );
          const currentCols = headerCells.length;
          const actionTh = headerRow.querySelector("th.action-col");

          const newTh = document.createElement("th");
          newTh.className = "border-b border-r last:border-r-0 border-slate-200 dark:border-zinc-700/80 p-2 font-semibold text-left select-text focus:outline-none focus:bg-violet-50/50 dark:focus:bg-zinc-800/80 break-words group/th relative";
          newTh.contentEditable = "true";
          newTh.innerHTML = `<div class="flex items-center justify-between gap-1"><span class="outline-none flex-1">Spalte ${currentCols + 1}</span><button type="button" contenteditable="false" onmousedown="event.preventDefault()" class="btn-del-this-col text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-1 py-0.5 rounded text-[10px] font-bold cursor-pointer select-none transition-colors" title="Diese Spalte löschen">✕</button></div>`;

          if (actionTh) {
            headerRow.insertBefore(newTh, actionTh);
          } else {
            headerRow.appendChild(newTh);
          }
        }

        const bodyRows = currentTable.querySelectorAll("tbody tr");
        bodyRows.forEach((tr) => {
          const actionTd = tr.querySelector("td.action-col");
          const newTd = document.createElement("td");
          newTd.className = "border-r border-slate-200 dark:border-zinc-700/80 p-2 text-slate-700 dark:text-zinc-300 select-text focus:outline-none focus:bg-violet-50/50 dark:focus:bg-zinc-800/80 break-words";
          newTd.contentEditable = "true";
          newTd.innerHTML = "<br>";

          if (actionTd) {
            tr.insertBefore(newTd, actionTd);
          } else {
            tr.appendChild(newTd);
          }
        });

        handleInput();
      }
      return;
    }

    // Delete Entire Table
    const deleteBtn = target.closest(".btn-delete-table");
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deleteBtn.closest(".protocol-table-wrapper");
      if (wrapper) {
        wrapper.remove();
        handleInput();
      }
      return;
    }
  };

  // Smart Key Handlers for lists and table navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      document.execCommand("bold");
      handleInput();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      document.execCommand("italic");
      handleInput();
      return;
    }

    // Ctrl+A / Cmd+A inside a table cell -> select only the current cell contents
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        while (node && node !== editorRef.current && node.nodeName !== "TD" && node.nodeName !== "TH") {
          node = node.parentNode;
        }

        if (node && (node.nodeName === "TD" || node.nodeName === "TH")) {
          e.preventDefault();
          const cell = node as HTMLElement;
          const target = cell.querySelector("span") || cell;
          const range = document.createRange();
          range.selectNodeContents(target);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
      }
    }

    // Backspace handling inside table
    if (e.key === "Backspace") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        while (node && node !== editorRef.current && node.nodeName !== "TD" && node.nodeName !== "TH") {
          node = node.parentNode;
        }

        if (node && (node.nodeName === "TD" || node.nodeName === "TH")) {
          const currentCell = node as HTMLElement;
          const currentTable = currentCell.closest("table");
          const tableWrapper = currentCell.closest(".protocol-table-wrapper");

          if (currentTable) {
            const allCells = Array.from(currentTable.querySelectorAll("th, td")).filter(
              (c) => !c.classList.contains("action-col")
            );
            const areAllEmpty = allCells.every(
              (c) => !c.textContent || c.textContent.trim() === ""
            );

            // If entire table is empty and Backspace is pressed, delete the whole table!
            if (areAllEmpty && tableWrapper) {
              e.preventDefault();
              tableWrapper.remove();
              handleInput();
              return;
            }
          }
        }
      }
    }

    // Tab key inside table cell -> move to next cell or add row
    if (e.key === "Tab") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).startContainer;
        while (node && node !== editorRef.current && node.nodeName !== "TD" && node.nodeName !== "TH") {
          node = node.parentNode;
        }

        if (node && (node.nodeName === "TD" || node.nodeName === "TH")) {
          e.preventDefault();
          const currentCell = node as HTMLElement;
          const currentTable = currentCell.closest("table");
          if (currentTable) {
            // Get all editable data cells (excluding action delete column)
            const cells = Array.from(currentTable.querySelectorAll("th, td")).filter(
              (c) => !c.classList.contains("action-col") && c.getAttribute("contenteditable") !== "false"
            );
            const currentIndex = cells.indexOf(currentCell);

            const focusCell = (targetCell: HTMLElement) => {
              targetCell.focus();
              const span = targetCell.querySelector("span");
              const focusTarget = span || targetCell;
              const r = document.createRange();
              r.selectNodeContents(focusTarget);
              r.collapse(false);
              const s = window.getSelection();
              if (s) {
                s.removeAllRanges();
                s.addRange(r);
              }
            };

            if (e.shiftKey) {
              // Previous cell
              if (currentIndex > 0) {
                focusCell(cells[currentIndex - 1] as HTMLElement);
              }
            } else {
              // Next cell
              if (currentIndex >= 0 && currentIndex < cells.length - 1) {
                focusCell(cells[currentIndex + 1] as HTMLElement);
              } else if (currentIndex === cells.length - 1 || currentIndex >= 0) {
                // At last cell: automatically add a new row to table!
                const tbody = currentTable.querySelector("tbody") || currentTable;
                const headerRow = currentTable.querySelector("thead tr") || currentTable.querySelector("tr");
                const dataCols = headerRow
                  ? Array.from(headerRow.querySelectorAll("th, td")).filter(
                      (c) => !c.classList.contains("action-col") && c.getAttribute("contenteditable") !== "false"
                    )
                  : [];
                const colCount = dataCols.length > 0 ? dataCols.length : 3;

                const newTr = document.createElement("tr");
                newTr.className = "hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition-colors border-b last:border-b-0 border-slate-100 dark:border-zinc-800 group/tr";
                for (let c = 0; c < colCount; c++) {
                  const newTd = document.createElement("td");
                  newTd.className = "border-r border-slate-200 dark:border-zinc-700/80 p-2 text-slate-700 dark:text-zinc-300 select-text focus:outline-none focus:bg-violet-50/50 dark:focus:bg-zinc-800/80 break-words";
                  newTd.contentEditable = "true";
                  newTd.innerHTML = "<br>";
                  newTr.appendChild(newTd);
                }
                const actionTd = document.createElement("td");
                actionTd.className = "action-col w-7 p-0 text-center border-slate-200 dark:border-zinc-700/80 select-none";
                actionTd.contentEditable = "false";
                actionTd.innerHTML = `<button type="button" onmousedown="event.preventDefault()" class="btn-del-this-row text-slate-300 hover:text-red-600 dark:hover:text-red-400 p-1 text-[11px] font-bold cursor-pointer transition-colors" title="Diese Zeile löschen">✕</button>`;
                newTr.appendChild(actionTd);

                tbody.appendChild(newTr);
                handleInput();

                setTimeout(() => {
                  const firstTd = newTr.querySelector("td");
                  if (firstTd) focusCell(firstTd as HTMLElement);
                }, 10);
              }
            }
            return;
          }
        }
      }
    }

    // Enter key
    if (e.key === "Enter" && !e.shiftKey) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);

      // If inside table cell, prevent inserting full paragraph outside cell
      let cellNode: Node | null = range.startContainer;
      while (cellNode && cellNode !== editorRef.current && cellNode.nodeName !== "TD" && cellNode.nodeName !== "TH") {
        cellNode = cellNode.parentNode;
      }
      if (cellNode && (cellNode.nodeName === "TD" || cellNode.nodeName === "TH")) {
        // Allow soft line break inside cell
        e.preventDefault();
        document.execCommand("insertLineBreak");
        handleInput();
        return;
      }

      // Get line text before cursor
      let node: Node | null = range.startContainer;
      let text = node.textContent || "";
      let offset = range.startOffset;

      const textBefore = text.substring(0, offset);

      // Check bullet list: "• ", "- ", "* "
      const bulletMatch = textBefore.match(/^(\s*)([•\-\*])\s*(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const content = bulletMatch[3];

        if (content.trim() === "") {
          // Empty bullet line -> clear bullet
          node.textContent = "";
          document.execCommand("insertParagraph");
        } else {
          document.execCommand("insertParagraph");
          insertTextAtSelection("• ");
        }
        handleInput();
        return;
      }

      // Check numbered list: "1. ", "2. ", etc.
      const numberMatch = textBefore.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (numberMatch) {
        e.preventDefault();
        const currentNum = parseInt(numberMatch[2], 10);
        const content = numberMatch[3];

        if (content.trim() === "") {
          // Empty number line -> clear number
          node.textContent = "";
          document.execCommand("insertParagraph");
        } else {
          document.execCommand("insertParagraph");
          insertTextAtSelection(`${currentNum + 1}. `);
        }
        handleInput();
        return;
      }
    }
  };

  const handleBold = () => {
    const editor = editorRef.current;
    if (editor) editor.focus();
    document.execCommand("bold");
    handleInput();
  };

  const handleItalic = () => {
    const editor = editorRef.current;
    if (editor) editor.focus();
    document.execCommand("italic");
    handleInput();
  };

  const handleBullet = () => {
    const editor = editorRef.current;
    if (editor) editor.focus();
    insertTextAtSelection("• ");
    handleInput();
  };

  const handleNumber = () => {
    const editor = editorRef.current;
    if (editor) editor.focus();

    // Check existing numbers
    const lines = value.split("\n");
    let nextNum = 1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].trim().match(/^(\d+)\./);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
        break;
      }
    }

    insertTextAtSelection(`${nextNum}. `);
    handleInput();
  };

  const handleArrow = () => {
    const editor = editorRef.current;
    if (editor) editor.focus();
    insertTextAtSelection(" → ");
    handleInput();
  };

  const handleInsertTable = (tableMarkdown: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const currentVal = htmlToMarkdown(editor.innerHTML).trim();
    let newVal = "";
    if (!currentVal) {
      newVal = tableMarkdown;
    } else {
      newVal = `${currentVal}\n\n${tableMarkdown}`;
    }

    editor.innerHTML = markdownToHtml(newVal);
    isInternalChangeRef.current = true;
    onChange(newVal);

    // Focus first body cell of the newly added table
    setTimeout(() => {
      const tables = editor.querySelectorAll("table");
      if (tables.length > 0) {
        const lastTable = tables[tables.length - 1];
        const firstCell = lastTable.querySelector("tbody td") as HTMLElement;
        if (firstCell) firstCell.focus();
      }
    }, 20);
  };

  return (
    <div className="bg-white dark:bg-zinc-900/90 rounded-xl border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:border-violet-300 dark:hover:border-violet-500/50 transition-all overflow-hidden flex flex-col group focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 dark:focus-within:border-violet-400">
      {/* Header section with JA pill badge */}
      <div className="px-3.5 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wide text-slate-900 dark:text-zinc-100">
            {label}
          </span>
          {badgeExtra && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              {badgeExtra}
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono flex items-center gap-1.5">
          <span>{linesCount} Zeilen</span>
          <span>•</span>
          <span>{charsCount} Zeichen</span>
        </div>
      </div>

      {/* Text formatting toolbar */}
      <Toolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onBullet={handleBullet}
        onNumber={handleNumber}
        onArrow={handleArrow}
        onInsertTable={handleInsertTable}
      />

      {/* Rich WYSIWYG Editable Area */}
      <div className="relative p-3 bg-white dark:bg-zinc-900/90 rounded-b-xl" onClick={handleEditorClick}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder || "Hier Text eintragen..."}
          style={{ minHeight: `${minRows * 26}px` }}
          className="w-full bg-transparent text-sm text-slate-800 dark:text-zinc-100 focus:outline-none leading-relaxed font-sans empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:dark:text-zinc-600 [&_strong]:font-bold [&_strong]:text-slate-900 [&_strong]:dark:text-zinc-50 [&_em]:italic [&_em]:text-slate-800 [&_em]:dark:text-zinc-200"
        />
      </div>
    </div>
  );
};
