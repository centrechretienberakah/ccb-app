// Helpers d'envoi de notifications push pour le module Jesus Daily TV.
// Utilisent l'endpoint existant /api/notifications/send.

interface SendOpts {
  title: string;
  body: string;
  url?: string;
  audience?: "all" | "admins" | "user_ids";
  userIds?: string[];
}

async function sendPush(opts: SendOpts): Promise<{ sent: number; failed: number } | null> {
  try {
    const res = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Notifie tous les abonnés qu'une nouvelle vidéo vient d'être publiée.
 * Requiert le rôle moderator+ (audience "all").
 */
export async function notifyJdtvNewVideo(opts: {
  videoTitle: string;
  videoSlug: string;
  categoryName?: string | null;
  speaker?: string | null;
}): Promise<boolean> {
  const where = opts.categoryName ? ` dans ${opts.categoryName}` : "";
  const author = opts.speaker ? ` — ${opts.speaker}` : "";
  const result = await sendPush({
    title: `✨ Nouvelle vidéo${where}`,
    body: `${opts.videoTitle}${author}`,
    url: `/jesus-daily/video/${opts.videoSlug}`,
    audience: "all",
  });
  return Boolean(result && result.sent >= 0);
}

/**
 * Notifie tous les abonnés qu'une diffusion LIVE vient de démarrer.
 * Requiert le rôle moderator+ (audience "all").
 */
export async function notifyJdtvLiveNow(opts: {
  videoTitle: string;
  videoSlug: string;
  speaker?: string | null;
}): Promise<boolean> {
  const author = opts.speaker ? ` — ${opts.speaker}` : "";
  const result = await sendPush({
    title: `🔴 EN DIRECT — Rejoins maintenant`,
    body: `${opts.videoTitle}${author}`,
    url: `/jesus-daily/video/${opts.videoSlug}`,
    audience: "all",
  });
  return Boolean(result && result.sent >= 0);
}
