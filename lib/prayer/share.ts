// Helper de partage prière — façon Méditons (UPPERCASE + CCB)
const APP_URL = "https://centrechretienberakah.com";

interface SharePrayerInput {
  title?: string | null;
  content: string;
  category?: string;
  isAnonymous?: boolean;
  authorName?: string;
  isAnswered?: boolean;
  answeredWith?: string | null;
}

export async function sharePrayer(p: SharePrayerInput): Promise<"shared" | "copied" | "failed"> {
  const titleLine = p.title ? `🙏 ${p.title.toUpperCase()}` : "🙏 DEMANDE DE PRIÈRE";
  const author = p.isAnonymous ? "Demande anonyme" : (p.authorName || "Un membre du CCB");
  let body = `${titleLine}\n— ${author}\n\n« ${p.content} »`;

  if (p.isAnswered && p.answeredWith) {
    body += `\n\n✨ TÉMOIGNAGE D'EXAUCEMENT :\n« ${p.answeredWith} »`;
  }

  body += `\n\nIntercédons ensemble — Centre Chrétien Berakah :`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: titleLine,
        text: body,
        url: `${APP_URL}/prayer`,
      });
      return "shared";
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return "failed";
      // fallback clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(`${body} ${APP_URL}/prayer`);
    return "copied";
  } catch {
    return "failed";
  }
}
