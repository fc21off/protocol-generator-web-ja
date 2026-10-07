import React, { useState } from "react";
import {
  CloudUpload,
  X,
  Server,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ProtocolData } from "../types/protocol";

interface ServerUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProtocolData;
  pdfBase64: string | null;
}

export const ServerUploadModal: React.FC<ServerUploadModalProps> = ({
  isOpen,
  onClose,
  data,
  pdfBase64,
}) => {
  const [serverUrl, setServerUrl] = useState(
    () => localStorage.getItem("ja_server_url") || "/api/upload"
  );
  const [token, setToken] = useState(
    () => localStorage.getItem("ja_server_token") || ""
  );
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  if (!isOpen) return null;

  const handleUpload = async () => {
    setIsUploading(true);
    setStatusMessage({ type: null, text: "" });

    // Save configuration in localStorage
    localStorage.setItem("ja_server_url", serverUrl);
    localStorage.setItem("ja_server_token", token);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token.trim()) {
        headers["Authorization"] = `Bearer ${token.trim()}`;
      }

      const response = await fetch(serverUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          data,
          pdfBase64: pdfBase64 || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server antwortete mit HTTP-Status ${response.status} (${response.statusText})`);
      }

      const result = await response.json();
      setStatusMessage({
        type: "success",
        text: result.message || "Protokoll erfolgreich auf den Server übertragen!",
      });
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setStatusMessage({
        type: "error",
        text: `Übertragung fehlgeschlagen: ${errStr}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-violet-900 to-[#4A227A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CloudUpload className="w-5 h-5 text-violet-300" />
            <h2 className="text-sm font-bold tracking-tight">
              Server-Ablage / Übertragung
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

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/40 rounded-xl border border-violet-100 dark:border-violet-900/60 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
            <span className="font-bold text-[#4A227A] dark:text-violet-300">Zentrale Speicherung:</span> Übertrage fertige Protokolle und PDFs direkt an den Server zur sicheren Ablage und Archivierung.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Server-Adresse / Ziel-URL</span>
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="/api/upload oder https://beispiel.de/api/upload"
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 font-mono placeholder:text-slate-400 dark:placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Zugangs-Passwort / Token (optional)</span>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Passwort oder Token (optional)..."
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-400 font-mono placeholder:text-slate-400 dark:placeholder:text-zinc-600"
            />
          </div>

          {/* Status feedback */}
          {statusMessage.type && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-tight">{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors"
          >
            Schließen
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#4A227A] hover:bg-[#381860] transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Übertrage...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Jetzt Übertragen</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
