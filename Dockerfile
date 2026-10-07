# ==============================================================================
# Dockerfile für den Jugendausschuss Leonberg - Protokoll Generator (Web & API)
# ==============================================================================

FROM node:22-bookworm-slim

# Installiere Abhängigkeiten für Tectonic & Schriftarten
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    fontconfig \
    libfontconfig1 \
    libgraphite2-3 \
    libharfbuzz0b \
    libicu72 \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Installiere Tectonic Standalone-Binary (schnell, autark, keine riesige TeX-Live-Installation nötig)
RUN curl -L https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz | tar -xz -C /usr/local/bin/

WORKDIR /app

# Kopiere Paket-Definitionen & installiere Dependencies
COPY package.json ./
RUN npm install

# Kopiere restliche Quellcodes
COPY . .

# Pre-warm Tectonic LaTeX-Pakete während des Image-Builds (verhindert Wartezeiten bei ersten Nutzeranfragen)
RUN node scripts/prewarm_tectonic.js || true

# Erstelle den optimierten Web-Production-Build (Vite -> dist/)
RUN npm run build

# Port für den Webserver
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Starte den kombinierten Web- & Compiler-Server
CMD ["node", "server.js"]
