import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Layers,
  ChevronRight,
  AlertCircle,
  UserCheck,
  CheckCircle2,
} from "lucide-react";

import {
  ProtocolData,
  ProtocolHistoryItem,
  INITIAL_PROTOCOL_DATA,
  PROJECT_GROUPS,
  CompileResult,
  CompilerStatus,
  formatDateDe,
} from "./types/protocol";
import { Header } from "./components/Header";
import { FormField } from "./components/FormField";
import { PdfViewerModal } from "./components/PdfViewerModal";
import { ServerUploadModal } from "./components/ServerUploadModal";
import { CompilerModal } from "./components/CompilerModal";
import { HomeScreen } from "./components/HomeScreen";
import { NewProtocolModal } from "./components/NewProtocolModal";
import { HistoryModal } from "./components/HistoryModal";
import { useHistoryState } from "./hooks/useHistoryState";
import { generateProtocolDocx } from "./utils/docxExport";
import {
  getProtocolHistory,
  saveToProtocolHistory,
  deleteFromProtocolHistory,
  clearProtocolHistory,
} from "./utils/historyManager";

export function App() {
  const [currentScreen, setCurrentScreen] = useState<"home" | "editor">("home");
  const [isNewProtocolModalOpen, setIsNewProtocolModalOpen] = useState(false);

  const {
    state: data,
    setState: setData,
    undo,
    redo,
    resetHistory,
  } = useHistoryState<ProtocolData>(() => {
    const saved = localStorage.getItem("ja_protocol_draft_autosave");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_PROTOCOL_DATA;
      }
    }
    return INITIAL_PROTOCOL_DATA;
  });

  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [compilerUsed, setCompilerUsed] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [compilerStatus, setCompilerStatus] = useState<CompilerStatus | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isCompilerModalOpen, setIsCompilerModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [protocolHistory, setProtocolHistory] = useState<ProtocolHistoryItem[]>(() =>
    getProtocolHistory()
  );
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(() => {
    return localStorage.getItem("ja_current_protocol_id") || null;
  });

  useEffect(() => {
    if (currentHistoryId) {
      localStorage.setItem("ja_current_protocol_id", currentHistoryId);
    } else {
      localStorage.removeItem("ja_current_protocol_id");
    }
  }, [currentHistoryId]);

  const [isSaving, setIsSaving] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [customGroup, setCustomGroup] = useState(false);
  const [projectGroups, setProjectGroups] = useState<string[]>(PROJECT_GROUPS);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("ja_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Initialize theme from localStorage or OS preference
  useEffect(() => {
    const saved = localStorage.getItem("ja_theme");
    const initialTheme = (saved === "dark" || saved === "light")
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(initialTheme);
  }, []);

  // Load project groups from web API
  useEffect(() => {
    fetch("/api/project-groups")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((groups: string[]) => {
        if (groups && groups.length > 0) {
          setProjectGroups(groups);
        }
      })
      .catch((err) => {
        console.warn("Konnte Projektgruppen nicht vom Backend laden, nutze Standard-Liste:", err);
      });
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    localStorage.setItem("ja_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Auto-save draft and sync to history in localStorage
  useEffect(() => {
    localStorage.setItem("ja_protocol_draft_autosave", JSON.stringify(data));
    const res = saveToProtocolHistory(data, currentHistoryId);
    if (res.activeId !== currentHistoryId) {
      setCurrentHistoryId(res.activeId);
    }
    setProtocolHistory(res.history);
  }, [data, currentHistoryId]);

  // Check compiler status on startup
  const fetchCompilerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const status: CompilerStatus = await res.json();
        setCompilerStatus(status);
      }
    } catch (e) {
      console.warn("Backend-Compiler-Status nicht erreichbar:", e);
      setCompilerStatus({
        isAvailable: false,
        compilerName: "Backend nicht erreichbar",
        path: null,
      });
    }
  }, []);

  useEffect(() => {
    fetchCompilerStatus();
  }, [fetchCompilerStatus]);

  // Update helper
  const updateField = (field: keyof ProtocolData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Start new protocol handler
  const handleStartNewProtocol = (date: string, projectGroup: string) => {
    const newId = `proto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setCurrentHistoryId(newId);
    resetHistory({
      ...INITIAL_PROTOCOL_DATA,
      id: newId,
      date,
      projectGroup,
    });
    setPdfBase64(null);
    setErrorMessage(null);
    setIsNewProtocolModalOpen(false);
    setCurrentScreen("editor");
  };

  // Select protocol from history
  const handleSelectProtocolFromHistory = (item: ProtocolHistoryItem) => {
    setCurrentHistoryId(item.id);
    resetHistory({
      ...item.data,
      id: item.id,
    });
    setPdfBase64(null);
    setErrorMessage(null);
    setIsHistoryModalOpen(false);
    setCurrentScreen("editor");
  };

  // Delete protocol from history
  const handleDeleteProtocolFromHistory = (id: string) => {
    const updated = deleteFromProtocolHistory(id);
    setProtocolHistory(updated);
    if (currentHistoryId === id) {
      setCurrentHistoryId(null);
    }
  };

  // Clear entire history
  const handleClearHistory = () => {
    clearProtocolHistory();
    setProtocolHistory([]);
    setCurrentHistoryId(null);
  };

  // Compile Handler via Web API
  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        let errText = "";
        try {
          const errJson = await response.json();
          errText = errJson.errorMessage || errJson.message || "";
        } catch {
          errText =
            response.status === 504
              ? "Zeitüberschreitung: Die PDF-Erstellung hat zu lange gedauert. Bitte versuche es noch einmal."
              : `HTTP-Status ${response.status} (${response.statusText || "Fehler"})`;
        }
        setErrorMessage(`Serverfehler bei der PDF-Erstellung: ${errText}`);
        return;
      }

      const result: CompileResult = await response.json();
      if (result.success && result.pdfBase64) {
        setPdfBase64(result.pdfBase64);
        setCompilerUsed(result.compilerUsed);
        setIsPdfModalOpen(true);
      } else {
        setErrorMessage(
          result.errorMessage || "PDF-Erstellung fehlgeschlagen."
        );
      }
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Verbindung zum Server fehlgeschlagen oder Server offline: ${errStr}`);
    } finally {
      setIsCompiling(false);
    }
  }, [data]);

  // Shortcut listener (Ctrl+Enter to compile, Ctrl+Z to undo, Ctrl+Y / Ctrl+Shift+Z to redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if modals are open
      if (isPdfModalOpen || isServerModalOpen || isCompilerModalOpen || isNewProtocolModalOpen) {
        return;
      }

      if (currentScreen !== "editor") return;

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleCompile();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentScreen, handleCompile, undo, redo, isPdfModalOpen, isServerModalOpen, isCompilerModalOpen, isNewProtocolModalOpen]);

  // Helper for generating sanitized default filename
  const getPdfFilename = () => {
    const group = data.projectGroup
      ? data.projectGroup.trim().replace(/[/\\?%*:|"<>]/g, "_")
      : "";
    const date = data.date
      ? data.date.trim().replace(/[./\\]/g, "-").replace(/[/\\?%*:|"<>]/g, "_")
      : "";

    if (group && date) {
      return `${group}_${date}.pdf`;
    } else if (group) {
      return `${group}.pdf`;
    } else if (date) {
      return `Protokoll_${date}.pdf`;
    } else {
      return "Protokoll_Jugendausschuss.pdf";
    }
  };

  const getDocxFilename = () => {
    return getPdfFilename().replace(/\.pdf$/, ".docx");
  };

  // Export as Word (.docx) file (Browser Download)
  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      const blob = await generateProtocolDocx(data);
      const defaultFilename = getDocxFilename();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Fehler beim Word-Export:", err);
      alert("Fehler beim Erstellen des Word-Dokuments: " + String(err));
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Save Draft as .json file (Browser Download)
  const handleSaveDraft = () => {
    try {
      const baseName = getPdfFilename().replace(/\.pdf$/, "");
      const defaultFilename = `${baseName}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Fehler beim Speichern des Entwurfs:", err);
    }
  };

  // Load Draft from .json file (Browser File Input)
  const handleLoadDraft = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const parsed = JSON.parse(content);
            const fileId = parsed.id || `proto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            parsed.id = fileId;
            setCurrentHistoryId(fileId);
            resetHistory(parsed);
            setCurrentScreen("editor");
          } catch (jsonErr) {
            alert("Ungültige JSON-Datei.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Save PDF (Browser Download)
  const handleSavePdf = (signedBase64?: string) => {
    const targetBase64 = signedBase64 || pdfBase64;
    if (!targetBase64) return;
    if (signedBase64 && signedBase64 !== pdfBase64) {
      setPdfBase64(signedBase64);
    }
    setIsSaving(true);
    try {
      const defaultFilename = getPdfFilename();
      const a = document.createElement("a");
      a.href = `data:application/pdf;base64,${targetBase64}`;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Fehler beim Herunterladen des PDFs:", err);
      alert("Fehler beim Herunterladen des PDFs: " + String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Möchtest du das aktuelle Formular wirklich zurücksetzen?")) {
      resetHistory(INITIAL_PROTOCOL_DATA);
      setPdfBase64(null);
      setErrorMessage(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100/90 dark:bg-[#09090b] text-slate-800 dark:text-zinc-100 antialiased overflow-hidden font-sans transition-colors">
      {currentScreen === "home" ? (
        <>
          <HomeScreen
            onNewProtocol={() => setIsNewProtocolModalOpen(true)}
            onOpenHistory={() => setIsHistoryModalOpen(true)}
            historyCount={protocolHistory.length}
            latestHistoryItem={protocolHistory[0] || null}
            onLoadDraft={handleLoadDraft}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          <NewProtocolModal
            isOpen={isNewProtocolModalOpen}
            onClose={() => setIsNewProtocolModalOpen(false)}
            onCreate={handleStartNewProtocol}
            projectGroups={projectGroups}
          />
        </>
      ) : (
        <>
          {/* Top Header */}
          <Header
            onCompile={handleCompile}
            isCompiling={isCompiling}
            onExportDocx={handleExportDocx}
            isExportingDocx={isExportingDocx}
            onOpenHistory={() => setIsHistoryModalOpen(true)}
            onSaveDraft={handleSaveDraft}
            onLoadDraft={handleLoadDraft}
            onReset={handleReset}
            onOpenServerModal={() => setIsServerModalOpen(true)}
            compilerStatus={compilerStatus}
            onOpenCompilerModal={() => setIsCompilerModalOpen(true)}
            onBackToHome={() => setCurrentScreen("home")}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start justify-between gap-3 animate-slide-down shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Fehler bei der PDF-Generierung</p>
                  <pre className="mt-1 font-mono text-[11px] whitespace-pre-wrap bg-rose-100/70 dark:bg-rose-900/40 p-2 rounded-lg text-rose-900 dark:text-rose-200 max-h-48 overflow-y-auto">
                    {errorMessage}
                  </pre>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 font-bold text-sm px-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Container */}
          <div className="flex-1 flex flex-col overflow-hidden px-3 sm:px-4 md:px-8 py-3 sm:py-4 max-w-7xl w-full mx-auto">
            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto pr-0 sm:pr-2 space-y-4 sm:space-y-5 pb-12">
              {/* ============================================================ */}
              {/* STAMMDATEN (DATUM & PROJEKTGRUPPE)                            */}
              {/* ============================================================ */}
              <section className="bg-white dark:bg-zinc-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                    Stammdaten der Sitzung
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-[11px] sm:text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Auto-Save aktiv
                    </span>
                    <span className="hidden sm:inline text-slate-400 dark:text-zinc-600">|</span>
                    <span className="hidden sm:inline font-mono text-[11px] bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-slate-600 dark:text-zinc-400">
                      Strg + Enter = PDF
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Datum */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#4A227A] dark:text-violet-400" />
                      <span>Datum der Sitzung:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={data.date}
                        onChange={(e) => updateField("date", e.target.value)}
                        placeholder="z.B. 21.05.2026"
                        className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateField("date", formatDateDe())
                        }
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
                          value={data.projectGroup}
                          onChange={(e) => updateField("projectGroup", e.target.value)}
                          placeholder="Name der Gruppe eintragen..."
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
                      <div className="flex items-center gap-2">
                        <select
                          value={data.projectGroup}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setCustomGroup(true);
                              updateField("projectGroup", "");
                            } else {
                              updateField("projectGroup", e.target.value);
                            }
                          }}
                          className="flex-1 px-3.5 py-2 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 font-medium text-slate-800 dark:text-zinc-100"
                        >
                          <option value="">-- Gruppe auswählen --</option>
                          {projectGroups.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                          <option value="__custom__">Eigene Bezeichnung eingeben...</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ============================================================ */}
              {/* FORMULARFELDER                                               */}
              {/* ============================================================ */}
              <div className="space-y-4">
                {/* Anwesende Mitglieder */}
                <FormField
                  label="Anwesende Mitglieder:"
                  value={data.attendees}
                  onChange={(val) => updateField("attendees", val)}
                  minRows={3}
                />

                {/* Hauptthemen des Treffens */}
                <FormField
                  label="Hauptthemen des Treffens:"
                  value={data.topics}
                  onChange={(val) => updateField("topics", val)}
                  minRows={3}
                />

                {/* Zusammenfassung der wichtigsten besprochenen Punkte */}
                <FormField
                  label="Zusammenfassung der wichtigsten besprochenen Punkte:"
                  value={data.summary}
                  onChange={(val) => updateField("summary", val)}
                  minRows={6}
                />

                {/* Nächste Schritte */}
                <FormField
                  label="Nächste Schritte - wer jeweils zuständig & bis wann fertig?"
                  value={data.nextSteps}
                  onChange={(val) => updateField("nextSteps", val)}
                  minRows={4}
                />

                {/* Ist Unterstützung benötigt? */}
                <FormField
                  label="Ist Unterstützung benötigt? Wann und wie?"
                  value={data.support}
                  onChange={(val) => updateField("support", val)}
                  minRows={3}
                />

                {/* Wer muss beim nächsten Treffen zwingend dabei sein? */}
                <FormField
                  label="Wer muss beim nächsten Treffen zwingend dabei sein?"
                  value={data.nextAttendees}
                  onChange={(val) => updateField("nextAttendees", val)}
                  minRows={3}
                />

                {/* Nächstes Treffen & Unterschriften Block */}
                <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-wide">
                      Nächstes Treffen &amp; Unterschriften
                    </h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                      Ort &amp; Zeit des nächsten Treffens:
                    </label>
                    <input
                      type="text"
                      value={data.nextMeeting}
                      onChange={(e) => updateField("nextMeeting", e.target.value)}
                      placeholder="z.B Mittwoch, 09.09.2026, Online"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                    />
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 italic mt-1 block">
                      (falls schon festgelegt, sonst möglichst zeitnah nachschicken)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                        <span>Gruppensprecher*in (Druckschrift):</span>
                      </label>
                      <input
                        type="text"
                        value={data.speakerName}
                        onChange={(e) => updateField("speakerName", e.target.value)}
                        placeholder="Vorname Nachname"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                      />
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-1">
                        Unterschriftsfeld links
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                        <span>Protokollant*in (Druckschrift):</span>
                      </label>
                      <input
                        type="text"
                        value={data.recorderName}
                        onChange={(e) => updateField("recorderName", e.target.value)}
                        placeholder="Vorname Nachname"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                      />
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-1">
                        Unterschriftsfeld rechts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Bottom Quick Bar */}
          <div className="bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-lg">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Jugendausschuss Vorlage bereit</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCompile}
                disabled={isCompiling}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#4A227A] hover:bg-[#381860] active:scale-98 transition-all shadow-md shadow-purple-900/20 disabled:opacity-50"
              >
                {isCompiling ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Erstelle PDF...</span>
                  </>
                ) : (
                  <>
                    <span>Vorschau &amp; Protokoll Erstellen</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* PDF Preview Modal */}
      <PdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfBase64={pdfBase64}
        onDownload={(signedBase64) => handleSavePdf(signedBase64)}
        onExportDocx={handleExportDocx}
        onUpload={(signedBase64) => {
          if (signedBase64) setPdfBase64(signedBase64);
          setIsPdfModalOpen(false);
          setIsServerModalOpen(true);
        }}
        isSaving={isSaving}
        compilerUsed={compilerUsed}
      />

      {/* Server Upload Modal */}
      <ServerUploadModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        data={data}
        pdfBase64={pdfBase64}
      />

      {/* Compiler Setup Modal */}
      <CompilerModal
        isOpen={isCompilerModalOpen}
        onClose={() => setIsCompilerModalOpen(false)}
        compilerStatus={compilerStatus}
        onRefreshStatus={fetchCompilerStatus}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={protocolHistory}
        onSelectProtocol={handleSelectProtocolFromHistory}
        onDeleteProtocol={handleDeleteProtocolFromHistory}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
}

export default App;
