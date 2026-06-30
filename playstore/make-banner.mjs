// Génère la bannière Play Store « Feature graphic » 1024×500 (PNG).
// Couleurs CCB : violet royal #5A2CA0 / or #D4AF37. Logo embarqué.
//
// Lancer :  node playstore/make-banner.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const logoB64 = readFileSync(join(root, "public", "icon-512x512.png")).toString("base64");

const W = 1024, H = 500;
const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5A2CA0"/>
      <stop offset="0.55" stop-color="#43208a"/>
      <stop offset="1" stop-color="#2a1456"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.22" cy="0.18" r="0.9">
      <stop offset="0" stop-color="#7B4FC4" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#7B4FC4" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="logoClip"><rect x="80" y="140" width="220" height="220" rx="48"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- liseré or haut -->
  <rect x="0" y="0" width="${W}" height="6" fill="#D4AF37"/>

  <!-- logo -->
  <rect x="76" y="136" width="228" height="228" rx="52" fill="#ffffff" opacity="0.06"/>
  <rect x="80" y="140" width="220" height="220" rx="48" fill="#ffffff"/>
  <image x="80" y="140" width="220" height="220" clip-path="url(#logoClip)"
         xlink:href="data:image/png;base64,${logoB64}" preserveAspectRatio="xMidYMid slice"/>

  <!-- textes -->
  <text x="356" y="218" font-family="Georgia, 'Times New Roman', serif" font-size="78" font-weight="700"
        fill="#D4AF37" letter-spacing="2">FAMILLE</text>
  <text x="356" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="78" font-weight="700"
        fill="#ffffff" letter-spacing="2">BERAKAH</text>

  <rect x="358" y="328" width="120" height="4" rx="2" fill="#D4AF37"/>

  <text x="356" y="372" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="600"
        fill="#E9DFF7" letter-spacing="3">CENTRE CHRÉTIEN BERAKAH</text>
  <text x="356" y="410" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="400"
        fill="#C9BBE6" letter-spacing="1">Former • Transformer • Bénir</text>
</svg>`;

await sharp(Buffer.from(svg))
  .png()
  .toFile(join(__dirname, "feature-graphic.png"));

console.log("OK → playstore/feature-graphic.png (1024x500)");
