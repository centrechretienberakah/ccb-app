// Helpers d'envoi de notifications push pour le module Dons.
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
  } catch { return null; }
}

/**
 * Notifie le donateur (si user_id présent) que son don a été confirmé.
 */
export async function notifyDonorConfirmation(opts: {
  userId: string;
  amount: string;
  receiptNumber?: string | null;
  recordId: string;
}): Promise<boolean> {
  const result = await sendPush({
    title: "🙏 Don confirmé — Merci !",
    body: `Ton don de ${opts.amount} a été reçu et enregistré${opts.receiptNumber ? ` (reçu ${opts.receiptNumber})` : ""}.`,
    url: `/dons/recu/${opts.recordId}`,
    audience: "user_ids",
    userIds: [opts.userId],
  });
  return Boolean(result);
}

/**
 * Notifie tous les abonnés (audience all) qu'un palier de campagne est franchi.
 */
export async function notifyMilestone(opts: {
  campaignTitle: string;
  campaignSlug: string;
  milestone: 25 | 50 | 75 | 100;
}): Promise<boolean> {
  const emoji = opts.milestone === 100 ? "🎉" : opts.milestone >= 75 ? "🔥" : opts.milestone >= 50 ? "✨" : "💜";
  const title = opts.milestone === 100
    ? `🎉 Objectif atteint !`
    : `${emoji} ${opts.milestone}% atteint`;
  const body = opts.milestone === 100
    ? `La campagne "${opts.campaignTitle}" a atteint son objectif. Gloire à Dieu !`
    : `La campagne "${opts.campaignTitle}" a franchi le palier des ${opts.milestone}%.`;
  const result = await sendPush({
    title, body,
    url: `/dons?campaign=${opts.campaignSlug}`,
    audience: "all",
  });
  return Boolean(result);
}
