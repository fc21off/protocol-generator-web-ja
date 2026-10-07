import React, { useState } from "react";
import { X, Calendar, Layers, ArrowRight } from "lucide-react";
import { PROJECT_GROUPS, formatDateDe } from "../types/protocol";

interface NewProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (date: string, projectGroup: string) => void;
  projectGroups?: string[];
}

export const NewProtocolModal: React.FC<NewProtocolModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  projectGroups = PROJECT_GROUPS,
}) => {
  const [date, setDate] = useState(() => formatDateDe());
  const [projectGroup, setProjectGroup] = useState("");
  const [customGroup, setCustomGroup] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(date, projectGroup);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-transparent dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#4A227A] to-[#6B3E9E] text-white flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Neues Protokoll anlegen</h2>
            <p className="text-[11px] text-violet-200">
              Datum und Projektgruppe festlegen
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Datum */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#4A227A] dark:text-violet-400" />
              <span>Datum der Sitzung:</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="z.B. 21.05.2026"
                className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setDate(formatDateDe())}
                className="px-3 py-2 text-xs font-semibold text-[#4A227A] dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900/60 rounded-xl border border-violet-200 dark:border-violet-800/60 transition-colors shrink-0"
              >
                Heute
              </button>
            </div>
          </div>

          {/* Projektgruppe */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#4A227A] dark:text-violet-400" />
              <span>Projektgruppe / Gremium:</span>
            </label>
            {customGroup ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  required
                  value={projectGroup}
                  onChange={(e) => setProjectGroup(e.target.value)}
                  placeholder="Name der Projektgruppe eintragen..."
                  className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setCustomGroup(false)}
                  className="px-2.5 py-2 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Liste
                </button>
              </div>
            ) : (
              <select
                value={projectGroup}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setCustomGroup(true);
                    setProjectGroup("");
                  } else {
                    setProjectGroup(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 font-medium text-slate-800 dark:text-zinc-100"
              >
                <option value="">-- Projektgruppe auswählen --</option>
                {projectGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="__custom__">Eigene Bezeichnung eingeben...</option>
              </select>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#4A227A] hover:bg-[#381860] active:scale-98 transition-all shadow-md shadow-purple-900/20"
            >
              <span>Erstellen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
