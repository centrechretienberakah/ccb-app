// Génère une image PNG d'un verset façon "carte sociale media"
// 1080x1080 (Instagram), violet royal + or, signature CCB

import { BIBLE_THEME as T } from "./theme";

interface VerseImageInput {
  reference: string;
  text: string;
  versionShort?: string;
}

export async function generateVerseImage({ reference, text, versionShort }: VerseImageInput): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background gradient violet
  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, T.violet);
  grad.addColorStop(1, T.violetDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  // Or accent en haut
  const goldGrad = ctx.createLinearGradient(0, 0, 1080, 0);
  goldGrad.addColorStop(0, T.gold);
  goldGrad.addColorStop(1, "rgba(212,175,55,0)");
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, 0, 1080, 8);

  // Cadre intérieur subtil
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, 960, 960);

  // Quote mark décoratif
  ctx.fillStyle = "rgba(212,175,55,0.5)";
  ctx.font = "bold 240px Georgia, serif";
  ctx.fillText("“", 90, 280);

  // Texte verset (wrapping)
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Font size adaptatif selon longueur
  let fontSize = 44;
  if (text.length > 200) fontSize = 38;
  if (text.length > 320) fontSize = 32;
  if (text.length > 450) fontSize = 28;

  ctx.font = `italic ${fontSize}px Georgia, serif`;
  const maxWidth = 880;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * 1.4;
  const totalHeight = lines.length * lineHeight;
  const startY = 540 - totalHeight / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, 540, startY + i * lineHeight);
  });

  // Référence
  ctx.fillStyle = T.gold;
  ctx.font = "bold 38px Georgia, serif";
  const refText = versionShort ? `— ${reference.toUpperCase()} (${versionShort})` : `— ${reference.toUpperCase()}`;
  ctx.fillText(refText, 540, 880);

  // Signature CCB
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("✶ CENTRE CHRÉTIEN BERAKAH ✶", 540, 950);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "20px sans-serif";
  ctx.fillText("centrechretienberakah.com", 540, 985);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Télécharge le blob ou tente navigator.share avec image
export async function downloadOrShareVerseImage(blob: Blob, filename: string): Promise<"shared" | "downloaded"> {
  // Tente le partage natif avec image
  const nav = typeof navigator !== "undefined" ? navigator : null;
  if (nav && typeof nav.canShare === "function") {
    const file = new File([blob], filename, { type: "image/png" });
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file] });
        return "shared";
      } catch {
        // L'utilisateur a annulé ou erreur — fallback download
      }
    }
  }
  // Fallback : téléchargement
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return "downloaded";
}
