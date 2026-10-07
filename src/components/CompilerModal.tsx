import React, { useState } from "react";
import {
  Cpu,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Globe,
  Loader2,
} from "lucide-react";
import { CompilerStatus } from "../types/protocol";

interface CompilerModalProps {
  isOpen: boolean;
  onClose: () => void;
  compilerStatus: CompilerStatus | null;
  onRefreshStatus: () => void;
}

export const CompilerModal: React.FC<CompilerModalProps> = ({
  isOpen,
  onClose,
  compilerStatus,
  onRefreshStatus,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshStatus();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white flex items-center justify-between border-b border-transparent dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-violet-400" />
            <h2 className="text-sm font-bold tracking-tight">
              PDF-Dienst &amp; Server-Status
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl border bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
            {compilerStatus?.isAvailable ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                <span>PDF-Dienst:</span>
                <span
                  className={
                    compilerStatus?.isAvailable
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-amber-700 dark:text-amber-300"
                  }
                >
                  {compilerStatus?.isAvailable ? "Bereit" : "Aktuell nicht erreichbar"}
                </span>
              </div>
              <p className="text-slate-600 dark:text-zinc-300">
                Status:{" "}
                <strong className="text-slate-900 dark:text-zinc-100">
                  {compilerStatus?.isAvailable ? "Online (Bereit)" : "Offline"}
                </strong>
              </p>
              {compilerStatus?.platform && (
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Server-System: {compilerStatus.platform}
                </p>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-zinc-300 space-y-2 bg-violet-50/60 dark:bg-violet-950/40 p-3.5 rounded-xl border border-violet-100 dark:border-violet-900/60">
            <p className="font-semibold text-[#4A227A] dark:text-violet-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>PDF- und Dokumentenerstellung</span>
            </p>
            <p>
              PDF-Dokumente werden über den Server in hoher Druckqualität inklusive Unterschriftenfeld gerendert. Word-Dokumente (.docx) werden direkt auf deinem Gerät erzeugt.
            </p>
            <p>
              Alle Eingaben verbleiben auf deinem Gerät und werden nur bei der PDF-Generierung kurzzeitig zur Verarbeitung übertragen.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors"
          >
            Schließen
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#4A227A] hover:bg-[#381860] transition-colors shadow-xs disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Status aktualisieren</span>
          </button>
        </div>
      </div>
    </div>
  );
};
