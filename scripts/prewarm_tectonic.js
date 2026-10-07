import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderLatexTemplate } from "../latexConverter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function prewarm() {
  console.log("Pre-warming Tectonic LaTeX cache...");

  const templatePath = path.resolve(__dirname, "../template/protokoll_jugendausschuss.tex");
  if (!fs.existsSync(templatePath)) {
    console.error("Template not found at:", templatePath);
    process.exit(1);
  }

  const dummyData = {
    metadata: {
      projectGroup: "Jugendausschuss",
      date: "2026-10-07",
      startTime: "18:00",
      endTime: "20:00",
      location: "Jugendhaus Leonberg",
      attendees: ["Test Person 1", "Test Person 2"],
      guests: ["Gast 1"],
      recorder: "Protokollant Test",
      speaker: "Sprecher Test",
      nextMeeting: "14.10.2026",
    },
    blocks: {
      topics: "- Thema 1: Besprechung\n- Thema 2: Planung",
      decisions: "1. Beschluss gefasst: Einstimmig",
      tasks: "- [x] Aufgabe erledigt @Max\n- [ ] Aufgabe offen @Anna",
      support: "Keine Unterstützung benötigt.",
      nextAttendees: "Alle Mitglieder.",
    },
  };

  const templateContent = fs.readFileSync(templatePath, "utf-8");
  const renderedLatex = renderLatexTemplate(templateContent, dummyData);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tectonic_prewarm_"));
  const texPath = path.join(tempDir, "document.tex");
  fs.writeFileSync(texPath, renderedLatex, "utf-8");

  // Copy logos
  const logoJa = path.resolve(__dirname, "../public/logo_ja.png");
  const logoLeonberg = path.resolve(__dirname, "../public/logo_leonberg.png");
  if (fs.existsSync(logoJa)) fs.copyFileSync(logoJa, path.join(tempDir, "logo_ja.png"));
  if (fs.existsSync(logoLeonberg)) fs.copyFileSync(logoLeonberg, path.join(tempDir, "logo_leonberg.png"));

  console.log("Running tectonic to download packages and compile test document...");
  const result = spawnSync("tectonic", ["-X", "compile", "document.tex"], {
    cwd: tempDir,
    stdio: "inherit",
  });

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });

  if (result.status !== 0) {
    console.warn("Tectonic pre-warm exited with status:", result.status);
  } else {
    console.log("Tectonic LaTeX bundle successfully pre-cached!");
  }
}

prewarm().catch((err) => {
  console.warn("Prewarm script encountered an error (continuing build):", err);
});
