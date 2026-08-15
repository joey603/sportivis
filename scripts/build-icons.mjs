import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Génère les icônes PNG de la PWA depuis le tracé du favicon, sans dépendance :
 * aucun convertisseur SVG n'est requis pour reconstruire les fichiers.
 *
 *   node scripts/build-icons.mjs
 */

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const BG = [10, 22, 40];
const ACCENT = [184, 242, 85];

// Repère du favicon (viewBox 0 0 32 32).
const DESIGN = 32;
const GLYPH = [
  [8, 22],
  [14, 10],
  [18, 18],
  [24, 10],
];
const STROKE = 2.5;
const SAMPLES = 4;

const TARGETS = [
  { file: 'icon-192.png', size: 192, radius: 0.25, glyph: 1 },
  { file: 'icon-512.png', size: 512, radius: 0.25, glyph: 1 },
  // Icône masquable : fond plein bord à bord, motif dans la zone sûre (80 %).
  { file: 'icon-maskable-512.png', size: 512, radius: 0, glyph: 0.72 },
  // iOS applique son propre arrondi : on fournit un carré plein.
  { file: 'apple-touch-icon.png', size: 180, radius: 0, glyph: 0.82 },
];

function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq
    ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq))
    : 0;
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Distance signée à un carré aux coins arrondis, négative à l'intérieur. */
function roundedBoxDistance(px, py, half, radius) {
  const qx = Math.abs(px) - half + radius;
  const qy = Math.abs(py) - half + radius;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    radius
  );
}

function render({ size, radius, glyph }) {
  const scale = size / DESIGN;
  const center = size / 2;
  const half = size / 2;
  const cornerRadius = radius * size;
  const points = GLYPH.map(([x, y]) => [
    center + (x - DESIGN / 2) * scale * glyph,
    center + (y - DESIGN / 2) * scale * glyph,
  ]);
  const halfStroke = (STROKE * scale * glyph) / 2;

  const pixels = Buffer.alloc(size * size * 4);
  const step = 1 / SAMPLES;
  const offset = step / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let bgHits = 0;
      let lineHits = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const px = x + offset + sx * step;
          const py = y + offset + sy * step;
          if (
            roundedBoxDistance(px - center, py - center, half, cornerRadius) <= 0
          ) {
            bgHits += 1;
          }
          let minDistance = Infinity;
          for (let i = 0; i < points.length - 1; i += 1) {
            minDistance = Math.min(
              minDistance,
              distanceToSegment(px, py, points[i], points[i + 1]),
            );
          }
          if (minDistance <= halfStroke) lineHits += 1;
        }
      }

      const total = SAMPLES * SAMPLES;
      const bgAlpha = bgHits / total;
      const lineAlpha = (lineHits / total) * bgAlpha;
      const index = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const base = BG[channel] * bgAlpha;
        pixels[index + channel] = Math.round(
          ACCENT[channel] * lineAlpha + base * (1 - lineAlpha),
        );
      }
      pixels[index + 3] = Math.round(bgAlpha * 255);
    }
  }

  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits par canal
  header[9] = 6; // RGBA
  header[12] = 0;

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filtre « none »
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const target of TARGETS) {
  const png = encodePng(render(target), target.size);
  writeFileSync(join(OUT_DIR, target.file), png);
  console.log(`${target.file} — ${target.size}px, ${(png.length / 1024).toFixed(1)} kB`);
}
