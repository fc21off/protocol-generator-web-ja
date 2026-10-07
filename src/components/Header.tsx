import React, { useState, useRef, useEffect } from "react";
import {
  Save,
  FolderOpen,
  RotateCcw,
  CloudUpload,
  Cpu,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  FileText,
  History,
  Download,
} from "lucide-react";
import { CompilerStatus } from "../types/protocol";
import jaLogo from "../assets/logo_ja.png";
import jaLogoWhite from "../assets/logo_ja_white.png";

interface HeaderProps {
  onCompile: () => void;
  isCompiling: boolean;
  onExportDocx?: () => void;
  isExportingDocx?: boolean;
  onOpenHistory?: () => void;
  onSaveDraft: () => void;
  onLoadDraft: () => void;
  onReset: () => void;
  onOpenServerModal: () => void;
  compilerStatus: CompilerStatus | null;
  onOpenCompilerModal: () => void;
  onBackToHome?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onCompile,
  isCompiling,
  onExportDocx,
  isExportingDocx,
  onOpenHistory,
  onSaveDraft,
  onLoadDraft,
  onReset,
  onOpenServerModal,
  compilerStatus,
  onOpenCompilerModal,
  onBackToHome,
  theme,
  onToggleTheme,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDesktopDownload, setShowDesktopDownload] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        Boolean((window as any).__TAURI_INTERNALS__);
      // Check if user is actually running Windows OS
      const isWindows = /Windows NT|Win64|WOW64|Win32/i.test(navigator.userAgent);
      // iPadOS detection (modern iPads identify as MacIntel with touch points)
      const isIPad =
        /iPad/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      // General mobile or tablet detection
      const isMobileOrTablet =
        /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        isIPad ||
        ("ontouchstart" in window && !isWindows);
      // Only show for genuine Windows desktop PC in regular browser
      const isDesktop = !isStandalone && !isMobileOrTablet && isWindows && window.innerWidth >= 768;
      setShowDesktopDownload(isDesktop);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-3.5 sm:px-5 py-2.5 sm:py-3 shadow-xs select-none transition-colors">
      {/* Top Bar: Brand on Left, Theme & Options (and Desktop actions) on Right */}
      <div className="flex items-center justify-between gap-2">
        {/* Brand & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              title="Zurück zum Hauptmenü"
              className="p-1.5 -ml-1 text-slate-500 hover:text-[#4A227A] dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700/80 hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors shadow-xs shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <img
            src={theme === "dark" ? jaLogoWhite : jaLogo}
            alt="Jugendausschuss Logo"
            className="h-8 sm:h-10 w-auto max-w-[40px] sm:max-w-[48px] object-contain shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-[#4A227A] dark:text-violet-300 tracking-tight truncate">
              PROTOKOLL JUGENDAUSSCHUSS
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium hidden sm:block">
              Sitzungsprotokoll des Jugendausschusses Leonberg
            </p>
          </div>
        </div>

        {/* Right Area: Desktop Actions + Theme Toggle + Three-Dots Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative" ref={menuRef}>
          {/* Desktop Actions: PDF + Word buttons */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Compile Button */}
            <button
              type="button"
              onClick={onCompile}
              disabled={isCompiling}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#4A227A] via-[#6B3E9E] to-[#7c3aed] hover:opacity-95 active:scale-98 transition-all shadow-md shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompiling ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Erstelle PDF...</span>
                </>
              ) : (
                <>
                  <span>PDF Generieren</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Word (.docx) Export Button */}
            {onExportDocx && (
              <button
                type="button"
                onClick={onExportDocx}
                disabled={isExportingDocx}
                title="Protokoll als Microsoft Word-Dokument (.docx) exportieren"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-blue-50/60 dark:hover:bg-zinc-700/80 border border-slate-200 dark:border-zinc-700/80 hover:border-blue-300 dark:hover:border-blue-500/60 shadow-xs transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isExportingDocx ? (
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform" />
                )}
                <span>Word (.docx)</span>
              </button>
            )}
          </div>

          {/* Dark / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={theme === "dark" ? "Heller Modus aktivieren" : "Dunkler Modus aktivieren"}
            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700/80 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Three Dots Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title="Menü / Weitere Optionen"
            className={`p-2 rounded-xl border transition-colors shadow-xs ${
              isMenuOpen
                ? "bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-600 text-slate-900 dark:text-white"
                : "bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700/80 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700/80 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

        {/* Dropdown Menu Popup */}
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Compiler Status Item */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onOpenCompilerModal();
              }}
              className="w-full px-3.5 py-2 text-left text-xs flex items-center justify-between text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="font-medium">PDF-Dienst</span>
              </div>
              {compilerStatus?.isAvailable ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Bereit
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-3 h-3" />
                  Offline
                </span>
              )}
            </button>

            <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />

            {/* History Option */}
            {onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenHistory();
                }}
                className="w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
              >
                <History className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Protokoll-Verlauf (History)</span>
              </button>
            )}

            {/* Save Draft */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onSaveDraft();
              }}
              className="w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <Save className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <span>Entwurf speichern (.json)</span>
            </button>

            {/* Load Draft */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onLoadDraft();
              }}
              className="w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <span>Entwurf laden (.json)</span>
            </button>

            {/* Word Export in Dropdown */}
            {onExportDocx && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onExportDocx();
                }}
                className="w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Als Word (.docx) exportieren</span>
              </button>
            )}

            <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />

            {/* Server Settings / Upload */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onOpenServerModal();
              }}
              className="w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <CloudUpload className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Server-Ablage</span>
            </button>

            {/* Download Windows Desktop App (only in PC Browser, not in PWA and not on Mobile) */}
            {showDesktopDownload && (
              <>
                <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />
                <a
                  href="/downloads/Jugendausschuss_Protokoll_Generator_Setup.exe"
                  download="Jugendausschuss_Protokoll_Generator_Setup.exe"
                  title="Eigenständige App für schnelles Arbeiten am PC herunterladen (.exe)"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full px-3.5 py-2 text-left text-xs flex items-center justify-between text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <div className="flex flex-col">
                      <span className="font-medium">Desktop-App (.exe)</span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">Eigenständige App für schnelles Arbeiten am PC</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-200 dark:border-violet-800/50">
                    Windows
                  </span>
                </a>
              </>
            )}

            <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />

            {/* Reset Form */}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onReset();
              }}
              className="w-full px-3.5 py-2 text-left text-xs flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <span>Formular zurücksetzen</span>
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Mobile Action Row (Row 2): Pinned below title & top controls on phones */}
      <div className="flex sm:hidden items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80 w-full">
        {/* Mobile PDF Compile Button */}
        <button
          type="button"
          onClick={onCompile}
          disabled={isCompiling}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#4A227A] via-[#6B3E9E] to-[#7c3aed] active:scale-98 transition-all shadow-md shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCompiling ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Erstelle PDF...</span>
            </>
          ) : (
            <>
              <span>PDF Generieren</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        {/* Mobile Word Export Button */}
        {onExportDocx && (
          <button
            type="button"
            onClick={onExportDocx}
            disabled={isExportingDocx}
            title="Protokoll als Microsoft Word-Dokument (.docx) exportieren"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 active:scale-98 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExportingDocx ? (
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )}
            <span>Word (.docx)</span>
          </button>
        )}
      </div>
    </header>
  );
};
