// Helpers serveur partagés entre les routes API de paiement
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

/** Client admin Supabase (service role) — pour update via webhook sans contexte user */
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── PayPal ──────────────────────────────────────────────────────────
export function getPayPalConfig() {
  const env = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();
  const base = env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
  return {
    env,
    base,
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
    webhookId: process.env.PAYPAL_WEBHOOK_ID ?? "",
  };
}

let cachedToken: { token: string; expires: number } | null = null;
/** Obtient un access token PayPal (avec petit cache mémoire). */
export async function getPayPalAccessToken(): Promise<string | null> {
  const cfg = getPayPalConfig();
  if (!cfg.clientId || !cfg.clientSecret) return null;
  if (cachedToken && cachedToken.expires > Date.now() + 30_000) return cachedToken.token;

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(`${cfg.base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in * 1000),
  };
  return data.access_token;
}

// ─── Notch Pay ───────────────────────────────────────────────────────
export function getNotchPayConfig() {
  return {
    base: "https://api.notchpay.co",
    publicKey: process.env.NEXT_PUBLIC_NOTCH_PAY_PUBLIC_KEY ?? "",
    secretKey: process.env.NOTCH_PAY_SECRET_KEY ?? "",
    webhookHash: process.env.NOTCH_PAY_WEBHOOK_HASH ?? "",
  };
}

// ─── Utilitaire conversion vers la devise PayPal (EUR/USD seulement) ─
/**
 * PayPal n'accepte pas XAF. On envoie en EUR ou USD.
 * - EUR par défaut (1 EUR ≈ 656 XAF)
 * - Pour USD : 1 USD ≈ 600 XAF
 */
export function toPayPalAmount(amountXaf: number, currency: "EUR" | "USD" = "EUR"): { value: string; currency_code: "EUR" | "USD" } {
  const rate = currency === "EUR" ? 656 : 600;
  const native = (amountXaf / rate).toFixed(2);
  return { value: native, currency_code: currency };
}
