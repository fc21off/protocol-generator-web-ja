import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAppIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background Gradient - Rich Jugendausschuss Purple
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#381463'); // Deep royal purple
  grad.addColorStop(0.5, '#4A227A'); // Official JA purple
  grad.addColorStop(1, '#662D91'); // Vibrant highlight purple

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle radial ambient glow in center
  const radialGlow = ctx.createRadialGradient(
    size / 2,
    size * 0.45,
    size * 0.05,
    size / 2,
    size * 0.45,
    size * 0.6
  );
  radialGlow.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, size, size);

  // Load the white JA logo via buffer
  const logoPath = path.resolve(__dirname, '../src/assets/logo_ja_white.png');
  const logoBuffer = fs.readFileSync(logoPath);
  const logo = await loadImage(logoBuffer);

  // Apple and Android guidelines recommend ~62-65% glyph size for safe zone
  const logoSize = Math.round(size * 0.62);
  const logoX = Math.round((size - logoSize) / 2);
  const logoY = Math.round((size - logoSize) / 2);

  // Drop shadow for logo emblem to make it pop
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = Math.round(size * 0.03);
  ctx.shadowOffsetY = Math.round(size * 0.015);

  ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

  // Reset shadow
  ctx.shadowColor = 'transparent';

  // Subtle inner border (1px)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = Math.max(1, Math.round(size * 0.005));
  ctx.strokeRect(0, 0, size, size);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated icon (${size}x${size}): ${outputPath}`);
}

async function main() {
  const publicDir = path.resolve(__dirname, '../public');

  await generateAppIcon(512, path.join(publicDir, 'icon-512.png'));
  await generateAppIcon(192, path.join(publicDir, 'icon-192.png'));
  await generateAppIcon(180, path.join(publicDir, 'apple-touch-icon.png'));

  console.log('All app icons generated successfully!');
}

main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
