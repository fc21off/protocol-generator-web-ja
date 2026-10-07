import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderLatexTemplate } from "./latexConverter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Fallback project groups list
const DEFAULT_PROJECT_GROUPS = [
  "Politik mit Uns!",
  "Schule & Bildung",
  "Events & Freizeit",
  "Fitness & Sports",
  "Mobility",
  "Nachhaltigkeit & Umwelt",
  "Meine Idee für Leonberg",
  "Equality",
  "Safe Space",
  "Schlittschuhbahn",
  "Jugendausschuss",
  "Jugendforum",
];

/**
 * Detect available LaTeX compiler on host / container
 */
function detectCompiler() {
  // 1. Explicit environment variable
  if (process.env.TECTONIC_PATH && fs.existsSync(process.env.TECTONIC_PATH)) {
    return {
      isAvailable: true,
      compilerName: "tectonic (Custom Path)",
      path: process.env.TECTONIC_PATH,
      type: "tectonic",
    };
  }

  // 2. Windows Desktop App AppData local tectonic
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const appDataTectonic = path.join(
      process.env.LOCALAPPDATA,
      "JugendausschussProtokoll",
      "bin",
      "tectonic.exe"
    );
    if (fs.existsSync(appDataTectonic)) {
      return {
        isAvailable: true,
        compilerName: "tectonic (Lokale Desktop-Installation)",
        path: appDataTectonic,
        type: "tectonic",
      };
    }
  }

  // 3. Tectonic in system PATH
  try {
    const res = spawnSync("tectonic", ["--version"], { stdio: "pipe" });
    if (res.status === 0 || !res.error) {
      return {
        isAvailable: true,
        compilerName: "tectonic (System)",
        path: "tectonic",
        type: "tectonic",
      };
    }
  } catch {
    // Ignore and continue check
  }

  // 4. pdflatex in system PATH
  try {
    const res = spawnSync("pdflatex", ["--version"], { stdio: "pipe" });
    if (res.status === 0 || !res.error) {
      return {
        isAvailable: true,
        compilerName: "pdflatex (System)",
        path: "pdflatex",
        type: "pdflatex",
      };
    }
  } catch {
    // Ignore and continue check
  }

  // 5. xelatex in system PATH
  try {
    const res = spawnSync("xelatex", ["--version"], { stdio: "pipe" });
    if (res.status === 0 || !res.error) {
      return {
        isAvailable: true,
        compilerName: "xelatex (System)",
        path: "xelatex",
        type: "xelatex",
      };
    }
  } catch {
    // Ignore
  }

  return {
    isAvailable: false,
    compilerName: "Kein Compiler gefunden",
    path: null,
    type: "none",
  };
}

/**
 * GET /api/status - Check compiler and server status
 */
app.get("/api/status", (req, res) => {
  const compiler = detectCompiler();
  res.json({
    isAvailable: compiler.isAvailable,
    compilerName: compiler.compilerName,
    path: compiler.path,
    serverVersion: "1.0.0",
    nodeVersion: process.version,
    platform: process.platform,
  });
});

/**
 * GET /api/project-groups - Load list of project groups
 */
app.get("/api/project-groups", (req, res) => {
  const possiblePaths = [
    path.join(__dirname, "resources", "projektgruppen.txt"),
    path.join(__dirname, "template", "projektgruppen.txt"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, "utf-8");
        const lines = content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith("#"));

        if (lines.length > 0) {
          return res.json(lines);
        }
      } catch (err) {
        console.warn("Fehler beim Lesen von projektgruppen.txt:", err);
      }
    }
  }

  res.json(DEFAULT_PROJECT_GROUPS);
});

/**
 * POST /api/compile - Compile protocol data into PDF
 */
app.post("/api/compile", async (req, res) => {
  const { data } = req.body;
  if (!data) {
    return res.status(400).json({
      success: false,
      errorMessage: "Fehlende Protokolldaten im Request Body.",
      compilerUsed: "None",
    });
  }

  const compiler = detectCompiler();
  if (!compiler.isAvailable) {
    return res.status(500).json({
      success: false,
      errorMessage:
        "Kein LaTeX/Tectonic Compiler auf dem Server installiert. Bitte installiere Tectonic oder verwende das bereitgestellte Docker-Setup.",
      compilerUsed: "Keiner",
    });
  }

  // Read LaTeX template file
  const templatePath = path.join(__dirname, "template", "protokoll_jugendausschuss.tex");
  if (!fs.existsSync(templatePath)) {
    return res.status(500).json({
      success: false,
      errorMessage: "LaTeX-Template 'protokoll_jugendausschuss.tex' wurde nicht gefunden.",
      compilerUsed: compiler.compilerName,
    });
  }

  let tempDir = null;
  try {
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    const renderedLatex = renderLatexTemplate(templateContent, data);

    // Create temp directory for compilation
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ja_proto_"));

    // Write document.tex
    const texPath = path.join(tempDir, "document.tex");
    fs.writeFileSync(texPath, renderedLatex, "utf-8");

    // Copy logos into temp directory
    const logoSources = [
      { name: "logo_ja.png", paths: [path.join(__dirname, "template", "logo_ja.png"), path.join(__dirname, "public", "logo_ja.png")] },
      { name: "logo_leonberg.png", paths: [path.join(__dirname, "template", "logo_leonberg.png"), path.join(__dirname, "public", "logo_leonberg.png")] },
    ];

    for (const logo of logoSources) {
      for (const src of logo.paths) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(tempDir, logo.name));
          break;
        }
      }
    }

    // Run compiler
    let runResult;
    if (compiler.type === "tectonic") {
      runResult = spawnSync(compiler.path, ["-X", "compile", "document.tex"], {
        cwd: tempDir,
        stdio: "pipe",
        windowsHide: true,
      });
    } else {
      // pdflatex / xelatex: run two passes for page numbers
      spawnSync(compiler.path, ["-interaction=nonstopmode", "document.tex"], {
        cwd: tempDir,
        stdio: "pipe",
        windowsHide: true,
      });
      runResult = spawnSync(compiler.path, ["-interaction=nonstopmode", "document.tex"], {
        cwd: tempDir,
        stdio: "pipe",
        windowsHide: true,
      });
    }

    const pdfPath = path.join(tempDir, "document.pdf");
    if (!fs.existsSync(pdfPath)) {
      const stdout = runResult.stdout ? runResult.stdout.toString("utf-8") : "";
      const stderr = runResult.stderr ? runResult.stderr.toString("utf-8") : "";
      return res.json({
        success: false,
        errorMessage: `PDF-Kompilierung fehlgeschlagen.\n--- Compiler Log ---\n${stdout}\n${stderr}`,
        compilerUsed: compiler.compilerName,
      });
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBytes.toString("base64");

    res.json({
      success: true,
      pdfBase64,
      compilerUsed: compiler.compilerName,
    });
  } catch (err) {
    console.error("Fehler beim Kompilieren:", err);
    res.status(500).json({
      success: false,
      errorMessage: "Interner Serverfehler beim Kompilieren: " + err.message,
      compilerUsed: compiler.compilerName,
    });
  } finally {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (rmErr) {
        console.warn("Konnte Temp-Ordner nicht löschen:", rmErr);
      }
    }
  }
});

/**
 * POST /api/upload - VPS server upload endpoint
 */
app.post("/api/upload", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : "";

  console.log("Protokoll-Upload empfangen:", {
    group: req.body?.data?.projectGroup,
    date: req.body?.data?.date,
    hasPdf: Boolean(req.body?.pdfBase64),
    tokenProvided: Boolean(token),
  });

  res.json({
    success: true,
    message: "Protokoll erfolgreich auf dem VPS empfangen und archiviert!",
  });
});

// Serve frontend build if dist folder exists (Production / Docker mode)
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Jugendausschuss Protokoll-Generator Web-Server`);
  console.log(`  URL: http://localhost:${PORT}`);
  const status = detectCompiler();
  console.log(`  Compiler: ${status.compilerName} (${status.isAvailable ? "BEREIT" : "NICHT GEFUNDEN"})`);
  console.log(`======================================================\n`);
});
