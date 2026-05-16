// Helper de partage façon Méditons : UPPERCASE + lien CCB + navigator.share
// Retourne true si effectivement partagé/copié.

const APP_URL = "https://ccb-app.com";

interface ShareVerseInput {
  reference: string;
  text: string;
  versionShort?: string;
}

export async function shareBibleVerse(v: ShareVerseInput): Promise<"shared" | "copied" | "failed"> {
  const header = `📖 MA BIBLE — ${v.reference.toUpperCase()}${v.versionShort ? ` (${v.versionShort})` : ""}`;
  const body = `« ${v.text} »`;
  const cta = `Lis la Bible avec moi sur Centre Chrétien Berakah :`;
  const fullText = `${header}\n\n${body}\n\n${cta}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: header,
        text: fullText,
        url: `${APP_URL}/bible`,
      });
      return "shared";
    } catch (err) {
      // AbortError = annulation utilisateur, pas grave
      if ((err as Error)?.name === "AbortError") return "failed";
      // Fallback clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(`${fullText} ${APP_URL}/bible`);
    return "copied";
  } catch {
    return "failed";
  }
}

// Helper notif staff (mêmes audiences que Devotion)
export async function notifyBibleStaff(title: string, body: string, url = "/bible"): Promise<void> {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, url, audience: "admins" }),
    });
  } catch {
    // noop
  }
}
