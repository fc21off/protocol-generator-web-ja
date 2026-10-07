import React, { useState, useEffect } from "react";
import { Plus, FolderOpen, History, ArrowRight, Sun, Moon, Download } from "lucide-react";
import { ProtocolHistoryItem } from "../types/protocol";
import jaLogo from "../assets/logo_ja.png";
import jaLogoWhite from "../assets/logo_ja_white.png";

interface HomeScreenProps {
  onNewProtocol: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  latestHistoryItem?: ProtocolHistoryItem | null;
  onLoadDraft: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNewProtocol,
  onOpenHistory,
  historyCount,
  latestHistoryItem,
  onLoadDraft,
  theme,
  onToggleTheme,
}) => {
  const [showDesktopDownload, setShowDesktopDownload] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;
      // Standalone PWA mode check
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        Boolean((window as any).__TAURI_INTERNALS__);
      // Mobile / tablet user-agent check
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      // Only show on PC/Desktop running inside regular web browser
      const isDesktop = !isStandalone && !isMobileDevice && window.innerWidth >= 768;
      setShowDesktopDownload(isDesktop);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-linear-to-b from-slate-50 via-slate-100 to-slate-200/80 dark:from-[#09090b] dark:via-[#121215] dark:to-[#09090b] p-4 sm:p-6 select-none animate-in fade-in duration-200 transition-colors overflow-y-auto">
      {/* Top-Right Actions: Desktop App Download & Theme Toggle */}
      <div className="absolute top-5 right-5 flex items-center gap-2">
        {showDesktopDownload && (
          <a
            href="/downloads/Jugendausschuss_Protokoll_Generator_Setup.exe"
            download="Jugendausschuss_Protokoll_Generator_Setup.exe"
            title="Eigenständige App für schnelles Arbeiten am PC herunterladen (.exe)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-slate-700 dark:text-zinc-200 hover:bg-violet-50 dark:hover:bg-zinc-800 hover:text-[#4A227A] dark:hover:text-violet-300 hover:border-violet-300 dark:hover:border-violet-700/60 transition-all shadow-xs text-xs font-medium group"
          >
            <Download className="w-3.5 h-3.5 text-[#4A227A] dark:text-violet-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Desktop-App</span>
          </a>
        )}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Heller Modus aktivieren" : "Dunkler Modus aktivieren"}
          className="p-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      <div className="w-full max-w-lg flex flex-col items-center text-center space-y-8">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center space-y-3">
          <img
            src={theme === "dark" ? jaLogoWhite : jaLogo}
            alt="Jugendausschuss Logo"
            className="h-20 w-auto object-contain drop-shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-black text-[#4A227A] dark:text-violet-300 tracking-tight">
              PROTOKOLL JUGENDAUSSCHUSS
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1">
              Sitzungsprotokoll des Jugendausschusses Leonberg
            </p>
          </div>
        </div>

        {/* Big Create Protocol Button */}
        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={onNewProtocol}
            className="w-full p-6 rounded-3xl bg-white dark:bg-zinc-900/90 hover:bg-violet-50/50 dark:hover:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-800 hover:border-[#4A227A] dark:hover:border-violet-500 shadow-lg hover:shadow-xl transition-all duration-200 group flex items-center justify-between text-left active:scale-[0.99]"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#4A227A] to-[#6B3E9E] flex items-center justify-center text-white shadow-md shadow-purple-900/20 group-hover:scale-105 transition-transform">
                <Plus className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 group-hover:text-[#4A227A] dark:group-hover:text-violet-300 transition-colors">
                  Neues Protokoll erstellen
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Datum &amp; Gruppe wählen und Inhalte eintragen
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 group-hover:bg-[#4A227A] dark:group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center text-slate-400 dark:text-zinc-300 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* History & Load Draft Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={onOpenHistory}
              className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-violet-50/50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 shadow-xs transition-all flex items-center gap-3 text-left hover:border-violet-300 dark:hover:border-violet-500/50 active:scale-98 group"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-[#4A227A] dark:text-violet-300 flex items-center justify-center shrink-0 border border-transparent dark:border-violet-800/50 group-hover:scale-105 transition-transform">
                <History className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block truncate group-hover:text-[#4A227A] dark:group-hover:text-violet-300 transition-colors">
                    Protokoll-Verlauf
                  </span>
                  {historyCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold bg-violet-100 dark:bg-violet-900/60 text-[#4A227A] dark:text-violet-300 rounded-full">
                      {historyCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block truncate">
                  {latestHistoryItem
                    ? `${latestHistoryItem.projectGroup || "Ohne Gruppe"} • ${latestHistoryItem.date}`
                    : "Die letzten 10 Entwürfe"}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onLoadDraft}
              className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 shadow-xs transition-all flex items-center gap-3 text-left hover:border-slate-300 dark:hover:border-zinc-700 active:scale-98 group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center shrink-0 border border-transparent dark:border-zinc-700 group-hover:scale-105 transition-transform">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block truncate">
                  Entwurf öffnen (.json)
                </span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block truncate">
                  Gespeicherte Datei laden
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
