// Génère des arrière-plans virtuels CCB Meet (1280x720) via sharp + SVG.
// Exécuter : node scripts/gen-meet-bg.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "meet-bg");
mkdirSync(out, { recursive: true });

const W = 1280, H = 720;

const cross = (cx, cy, s, color, op = 1) => `
  <g fill="${color}" opacity="${op}">
    <rect x="${cx - s * 0.12}" y="${cy - s}" width="${s * 0.24}" height="${s * 2}" rx="${s * 0.06}"/>
    <rect x="${cx - s * 0.7}" y="${cy - s * 0.46}" width="${s * 1.4}" height="${s * 0.24}" rx="${s * 0.06}"/>
  </g>`;

const designs = {
  // 1) Branding CCB : dégradé violet → sombre + croix dorée discrète
  ccb: `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#5A2CA0"/>
          <stop offset="0.55" stop-color="#3E1C70"/>
          <stop offset="1" stop-color="#1A1230"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stop-color="#D4AF37" stop-opacity="0.18"/>
          <stop offset="1" stop-color="#D4AF37" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      <rect width="${W}" height="${H}" fill="url(#glow)"/>
      ${cross(W * 0.5, H * 0.42, 120, "#D4AF37", 0.16)}
      <text x="${W / 2}" y="${H - 54}" text-anchor="middle" font-family="Georgia, serif" font-size="34" letter-spacing="6" fill="#FFFFFF" opacity="0.85">CENTRE CHRÉTIEN BERAKAH</text>
      <text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" letter-spacing="3" fill="#D4AF37" opacity="0.8">FORMER · TRANSFORMER · BÉNIR</text>
    </svg>`,

  // 2) Croix lumineuse sur fond sombre
  croix: `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <radialGradient id="bg" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stop-color="#241A3D"/>
          <stop offset="1" stop-color="#0E0A1A"/>
        </radialGradient>
        <radialGradient id="halo" cx="0.5" cy="0.44" r="0.4">
          <stop offset="0" stop-color="#D4AF37" stop-opacity="0.55"/>
          <stop offset="1" stop-color="#D4AF37" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <ellipse cx="${W * 0.5}" cy="${H * 0.44}" rx="${W * 0.45}" ry="${H * 0.55}" fill="url(#halo)"/>
      ${cross(W * 0.5, H * 0.44, 165, "#F0DA8A", 0.95)}
      ${cross(W * 0.5, H * 0.44, 165, "#FFFFFF", 0.25)}
    </svg>`,

  // 3) Ciel / heavenly
  ciel: `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2A3A7A"/>
          <stop offset="0.5" stop-color="#6A4FA0"/>
          <stop offset="0.78" stop-color="#C98BA0"/>
          <stop offset="1" stop-color="#E8C06A"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#sky)"/>
      <g fill="#FFFFFF" opacity="0.6">
        <circle cx="220" cy="140" r="2.2"/><circle cx="420" cy="90" r="1.6"/><circle cx="900" cy="120" r="2"/>
        <circle cx="1080" cy="200" r="1.8"/><circle cx="650" cy="70" r="1.5"/><circle cx="160" cy="260" r="1.6"/>
      </g>
      <ellipse cx="${W / 2}" cy="${H + 120}" rx="${W * 0.6}" ry="180" fill="#FFFFFF" opacity="0.18"/>
    </svg>`,

  // 4) Vitrail géométrique violet/or/bleu
  vitrail: `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="#15102A"/>
      <g opacity="0.92">
        ${Array.from({ length: 8 }).map((_, i) => {
          const cols = ["#5A2CA0", "#3E1C70", "#7B4BC4", "#D4AF37", "#2A3A7A"];
          const x = (i % 4) * (W / 4);
          const y = Math.floor(i / 4) * (H / 2);
          return `<rect x="${x + 6}" y="${y + 6}" width="${W / 4 - 12}" height="${H / 2 - 12}" rx="14" fill="${cols[i % cols.length]}" opacity="0.85"/>`;
        }).join("")}
      </g>
      <rect width="${W}" height="${H}" fill="#000000" opacity="0.18"/>
      ${cross(W * 0.5, H * 0.5, 90, "#FFFFFF", 0.22)}
    </svg>`,
};

for (const [name, svg] of Object.entries(designs)) {
  await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toFile(join(out, `${name}.jpg`));
  console.log("écrit:", `public/meet-bg/${name}.jpg`);
}
console.log("OK — arrière-plans générés.");
