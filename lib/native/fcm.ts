import crypto from "node:crypto";

/**
 * Envoi de notifications via Firebase Cloud Messaging (API HTTP v1).
 * Côté SERVEUR uniquement. Aucune dépendance externe : on signe nous-mêmes
 * le JWT du service account et on échange contre un access token OAuth2.
 *
 * Configuration (Vercel) :
 *   FIREBASE_SERVICE_ACCOUNT = contenu JSON du compte de service Firebase
 *   (Console Firebase → Paramètres → Comptes de service → Générer une clé).
 *
 * Sans cette variable → isFcmConfigured() = false, tout est no-op (le web-push
 * existant continue de fonctionner normalement).
 */

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<ServiceAccount>;
    if (j.client_email && j.private_key && j.project_id) {
      return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, "\n"), project_id: j.project_id };
    }
  } catch { /* JSON invalide */ }
  return null;
}

export function isFcmConfigured(): boolean {
  return getServiceAccount() !== null;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cachedAccess: { token: string; expMs: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  if (cachedAccess && Date.now() < cachedAccess.expMs - 60_000) return cachedAccess.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  let signature: string;
  try {
    signature = b64url(crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key));
  } catch {
    return null;
  }
  const jwt = `${unsigned}.${signature}`;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedAccess = { token: data.access_token, expMs: Date.now() + (data.expires_in ?? 3600) * 1000 };
    return data.access_token;
  } catch {
    return null;
  }
}

export interface FcmMessage {
  title?: string;
  body?: string;
  data?: Record<string, string>;
  channelId?: string;
  priority?: "high" | "normal";
  /** Durée de vie du message (s). Utile pour les appels (~45 s). */
  ttlSeconds?: number;
}

export interface FcmResult {
  sent: number;
  failed: number;
  invalidTokens: string[];
}

/**
 * Envoie `msg` à une liste de tokens FCM. Renvoie les tokens invalides
 * (à supprimer côté appelant).
 */
export async function sendFcm(tokens: string[], msg: FcmMessage): Promise<FcmResult> {
  const sa = getServiceAccount();
  if (!sa || tokens.length === 0) return { sent: 0, failed: 0, invalidTokens: [] };
  const access = await getAccessToken(sa);
  if (!access) return { sent: 0, failed: tokens.length, invalidTokens: [] };

  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  await Promise.all(tokens.map(async (token) => {
    const message: Record<string, unknown> = { token };
    if (msg.title || msg.body) message.notification = { title: msg.title ?? "", body: msg.body ?? "" };
    if (msg.data) message.data = msg.data;
    const android: Record<string, unknown> = {
      priority: msg.priority === "normal" ? "NORMAL" : "HIGH",
    };
    if (msg.ttlSeconds) android.ttl = `${msg.ttlSeconds}s`;
    // Bloc "notification" seulement pour les messages d'AFFICHAGE (title/body).
    // Les messages data-only (appels) le laissent vide → le natif gère l'UI.
    if (msg.title || msg.body) {
      android.notification = {
        ...(msg.channelId ? { channel_id: msg.channelId } : {}),
        default_sound: true,
      };
    }
    message.android = android;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) { sent++; return; }
      failed++;
      const txt = (await res.text().catch(() => "")) || "";
      // Token expiré / désinscrit → à nettoyer
      if (res.status === 404 || /UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/i.test(txt)) {
        invalidTokens.push(token);
      }
    } catch {
      failed++;
    }
  }));

  return { sent, failed, invalidTokens };
}
