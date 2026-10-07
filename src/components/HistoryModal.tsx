import React from "react";
import {
  X,
  History,
  Calendar,
  Clock,
  ArrowRight,
  Trash2,
  FileText,
} from "lucide-react";
import { ProtocolHistoryItem } from "../types/protocol";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ProtocolHistoryItem[];
  onSelectProtocol: (item: ProtocolHistoryItem) => void;
  onDeleteProtocol: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectProtocol,
  onDeleteProtocol,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const handleClear = () => {
    if (
      confirm(
        "Möchtest du den gesamten Verlauf wirklich leeren? Gespeicherte .json- oder .docx-Dateien auf deiner Festplatte bleiben davon unberührt."
      )
    ) {
      onClearHistory();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#4A227A] to-[#6B3E9E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Protokoll-Verlauf
              </h2>
              <p className="text-xs text-violet-200">
                Die letzten bis zu 10 bearbeiteten Protokolle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-bar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs shrink-0">
          <span className="font-medium text-slate-500 dark:text-zinc-400">
            {history.length} {history.length === 1 ? "Entwurf" : "Entwürfe"} im
            Verlauf (max. 10)
          </span>
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-medium flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Verlauf leeren</span>
            </button>
          )}
        </div>

        {/* List of Protocols */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/50 dark:bg-zinc-950/40">
          {history.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-4">
                <FileText className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-200 mb-1">
                Noch kein Verlauf vorhanden
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
                Sobald du an einem Protokoll arbeitest, wird dein Fortschritt
                automatisch hier im Browser zwischengespeichert.
              </p>
            </div>
          ) : (
            history.map((item, index) => {
              const snippet =
                item.data.topics ||
                item.data.summary ||
                item.data.nextSteps ||
                "Noch keine Inhalte eingetragen...";

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectProtocol(item)}
                  className="group p-4 rounded-2xl bg-white dark:bg-zinc-800 hover:bg-violet-50/60 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700/80 hover:border-violet-300 dark:hover:border-violet-500/50 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-[#4A227A] dark:group-hover:text-violet-300 transition-colors truncate">
                        {item.projectGroup || "Ohne Gruppe"}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-violet-100 dark:bg-violet-950/80 text-[#4A227A] dark:text-violet-300 rounded-full border border-violet-200 dark:border-violet-800/50 shrink-0">
                          Zuletzt bearbeitet
                        </span>
                      )}
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mb-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                        Sitzung: {item.date || "—"}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                        Bearbeitet: {item.formattedUpdatedAt}
                      </span>
                    </div>

                    {/* Content snippet */}
                    <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-1 italic">
                      "{snippet}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Möchtest du das Protokoll "${item.projectGroup} (${item.date})" wirklich aus dem Verlauf löschen?`
                          )
                        ) {
                          onDeleteProtocol(item.id);
                        }
                      }}
                      title="Aus dem Verlauf löschen"
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-zinc-700/80 text-[#4A227A] dark:text-violet-300 group-hover:bg-[#4A227A] dark:group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
