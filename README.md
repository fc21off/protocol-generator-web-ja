# Jugendausschuss Leonberg - Protokoll Generator (Web-Version)

Dies ist der eigenständige, plattformunabhängige Web-Port des **Protokoll-Generators für den Jugendausschuss der Stadt Leonberg**.
Er läuft direkt im Webbrowser (Laptop, Tablet, Smartphone) und kann lokal oder auf einem Linux-VPS gehostet werden.

---

## Features
- **100% Tauri-frei**: Keine Desktop-Abhängigkeiten im Frontend. Läuft in jedem modernen Browser.
- **Identisches Design & UX**: Volle Unterstützung für Dark/Light Mode, JA-Farben (`#4A227A`, `#7C3AED`), Tabellen, Aufzählungen, Checkboxen, Formatierungsleiste.
- **Word-Export (.docx)**: Erzeugt Microsoft Word-Dateien direkt im Browser (kein Server nötig).
- **PDF-Kompilierung**: Hochqualitativer LaTeX-Satz über Tectonic / XeLaTeX serverseitig.
- **PDF-Vorschau & Digitale Unterschriften**: Unterschreiben per Maus, Touchpad oder Touch-Stift direkt auf dem Bildschirm mit automatischer Einbettung in das PDF (300 DPI).
- **Protokoll-Verlauf**: Die letzten bis zu 10 Entwürfe werden automatisch im Browser-LocalStorage zwischengespeichert und dedupliziert.
- **Docker-Ready**: Fertiges `Dockerfile` und `docker-compose.yml` für 1-Klick-Bereitstellung auf jedem VPS.

---

## Lokales Testen (ohne VPS)

Da auf deinem PC der Tectonic-Compiler bereits vorhanden ist, kannst du die Web-Version direkt lokal starten und testen:

### Option 1: Alles mit einem Befehl (Entwicklungsmodus mit Live-Reload)
```bash
npm run dev:all
```
- Öffnet den Vite-Entwicklungsserver auf `http://localhost:3000`
- Startet zeitgleich den Backend-Compiler-Server auf Port `3001`
- Änderungen an React-Komponenten werden sofort ohne Neuladen angezeigt.

### Option 2: Produktionsmodus (Eigenständiger Server)
```bash
npm run build
npm start
```
- Kompiliert das Frontend nach `dist/`
- Startet den Express-Server auf `http://localhost:3001` (liefert sowohl die Website als auch die PDF-Kompilierungs-API aus).

---

## Deployment auf einem VPS (Docker)

Sobald der echte VPS bereitsteht:

1. Projektordner auf den VPS kopieren (oder per Git klonen).
2. Starten mit:
   ```bash
   docker compose up -d --build
   ```
3. Die Web-App ist sofort unter Port `3000` erreichbar (oder über Nginx / Caddy Reverse-Proxy auf Port 80/443).
