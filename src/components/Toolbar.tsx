import React, { useState, useRef, useEffect } from "react";
import {
  List,
  ListOrdered,
  Bold,
  Italic,
  ArrowRight,
  Table as TableIcon,
  ChevronDown,
  Grid2X2,
  Grid3X3,
} from "lucide-react";

interface ToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onBullet: () => void;
  onNumber: () => void;
  onArrow: () => void;
  onInsertTable: (tableMarkdown: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onBold,
  onItalic,
  onBullet,
  onNumber,
  onArrow,
  onInsertTable,
}) => {
  const [showTableMenu, setShowTableMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowTableMenu(false);
      }
    };
    if (showTableMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTableMenu]);

  const handleSelectTable = (markdown: string) => {
    setShowTableMenu(false);
    onInsertTable(markdown);
  };

  return (
    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100/90 dark:bg-[#09090b]/80 border-b border-slate-200/80 dark:border-zinc-800 rounded-t-lg text-slate-700 dark:text-zinc-300 text-xs select-none overflow-x-auto no-scrollbar touch-pan-x whitespace-nowrap scroll-smooth w-full">
      <span className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-zinc-500 uppercase mr-1 shrink-0">
        Format
      </span>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onBullet();
        }}
        title="Aufzählungspunkt (•)"
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-zinc-700 hover:text-[#4A227A] dark:hover:text-violet-300 border border-slate-200 dark:border-zinc-700/80 hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors shadow-xs active:scale-95"
      >
        <List className="w-3.5 h-3.5" />
        <span className="font-medium">Punkt</span>
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onNumber();
        }}
        title="Nummerierte Liste (1.)"
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-zinc-700 hover:text-[#4A227A] dark:hover:text-violet-300 border border-slate-200 dark:border-zinc-700/80 hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors shadow-xs active:scale-95"
      >
        <ListOrdered className="w-3.5 h-3.5" />
        <span className="font-medium">Nummer</span>
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onBold();
        }}
        title="Fett formatieren (Strg+B)"
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-zinc-700 hover:text-[#4A227A] dark:hover:text-violet-300 border border-slate-200 dark:border-zinc-700/80 hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors shadow-xs active:scale-95"
      >
        <Bold className="w-3.5 h-3.5" />
        <span className="font-medium font-bold">Fett</span>
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onItalic();
        }}
        title="Kursiv formatieren (Strg+I)"
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-zinc-700 hover:text-[#4A227A] dark:hover:text-violet-300 border border-slate-200 dark:border-zinc-700/80 hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors shadow-xs active:scale-95"
      >
        <Italic className="w-3.5 h-3.5" />
        <span className="font-medium italic">Kursiv</span>
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onArrow();
        }}
        title="Pfeil (→)"
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-zinc-700 hover:text-[#4A227A] dark:hover:text-violet-300 border border-slate-200 dark:border-zinc-700/80 hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors shadow-xs active:scale-95"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="font-medium">Pfeil</span>
      </button>

      {/* Table Dropdown */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowTableMenu(!showTableMenu)}
          title="Tabelle einfügen"
          className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-zinc-700 hover:text-[#4A227A] dark:hover:text-violet-300 border border-slate-200 dark:border-zinc-700/80 hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors shadow-xs active:scale-95"
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span className="font-medium">Tabelle</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {showTableMenu && (
          <div className="absolute left-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-50 animate-in fade-in-50 duration-75">
            <button
              type="button"
              onClick={() =>
                handleSelectTable(
                  "| Spalte 1 | Spalte 2 |\n| --- | --- |\n|  |  |"
                )
              }
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 dark:text-zinc-200 hover:bg-violet-50 dark:hover:bg-zinc-800 hover:text-[#4A227A] dark:hover:text-violet-300 transition-colors"
            >
              <Grid2X2 className="w-3.5 h-3.5 opacity-70 shrink-0" />
              <span className="font-medium">2 × 2 Tabelle</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleSelectTable(
                  "| Spalte 1 | Spalte 2 | Spalte 3 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |"
                )
              }
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 dark:text-zinc-200 hover:bg-violet-50 dark:hover:bg-zinc-800 hover:text-[#4A227A] dark:hover:text-violet-300 transition-colors"
            >
              <Grid3X3 className="w-3.5 h-3.5 opacity-70 shrink-0" />
              <span className="font-medium">3 × 3 Tabelle</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
