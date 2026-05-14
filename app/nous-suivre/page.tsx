import { Metadata } from "next";
import { getSiteContent } from "@/lib/site-content";

export const metadata: Metadata = { title: "Nous Suivre — CCB" };

const DEFAULT_PLATFORMS = [
  { name: "YouTube", handle: "@CentreChrétienBerakah", url: "https://youtube.com/@centrechretienberakah", emoji: "▶️", color: "#FF0000", bg: "rgba(255,0,0,0.08)", border: "rgba(255,0,0,0.25)", desc: "Sermons, enseignements, Jesus Daily et tous nos cultes en replay", cta: "S'abonner" },
  { name: "Facebook", handle: "Centre Chrétien Berakah", url: "https://facebook.com/centrechretienberakah", emoji: "📘", color: "#1877F2", bg: "rgba(24,119,242,0.08)", border: "rgba(24,119,242,0.25)", desc: "Annonces, photos, événements et interactions avec la communauté", cta: "Aimer la page" },
  { name: "Instagram", handle: "@ccb_berakah", url: "https://instagram.com/ccb_berakah", emoji: "📸", color: "#E1306C", bg: "rgba(225,48,108,0.08)", border: "rgba(225,48,108,0.25)", desc: "Stories, reels, photos inspirantes et coulisses du ministère", cta: "Suivre" },
  { name: "TikTok", handle: "@jesusdaily_ccb", url: "https://tiktok.com/@jesusdaily_ccb", emoji: "🎵", color: "#69C9D0", bg: "rgba(105,201,208,0.08)", border: "rgba(105,201,208,0.25)", desc: "Jesus Daily — podcast d'évangélisation de 45 secondes chaque matin", cta: "Suivre" },
  { name: "WhatsApp", handle: "Canal CCB", url: "https://whatsapp.com/channel/CCB", emoji: "💬", color: "#25D366", bg: "rgba(37,211,102,0.08)", border: "rgba(37,211,102,0.25)", desc: "Annonces rapides, versets du jour et messages d'encouragement", cta: "Rejoindre le canal" },
  { name: "Newsletter", handle: "centrechretienberakah@gmail.com", url: "mailto:centrechretienberakah@gmail.com?subject=Inscription Newsletter CCB", emoji: "📧", color: "#D4AF37", bg: "rgba(212,175,55,0.08)", border: "rgba(212,175,55,0.25)", desc: "Lettre hebdomadaire : messages, annonces et ressources du ministère", cta: "S'inscrire" },
];

export default async function NousSuivrePage() {
  const cms = await getSiteContent("nous-suivre");
  const cmsPlatforms = Array.isArray(cms?.data_json?.platforms) ? (cms.data_json.platforms as typeof DEFAULT_PLATFORMS) : null;
  const PLATFORMS = cmsPlatforms && cmsPlatforms.length > 0 ? cmsPlatforms : DEFAULT_PLATFORMS;
  const title = cms?.title || "Restez Connectés";
  const intro = cms?.body_md || "Suivez le Centre Chrétien Berakah sur toutes les plateformes pour ne manquer aucun message, aucun live ni aucune ressource spirituelle.";
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📡</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg, var(--text-primary), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>
          {title}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6, maxWidth: 480, margin: "0 auto", whiteSpace: "pre-wrap" }}>
          {intro}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {PLATFORMS.map((p) => (
          <a key={p.name} href={p.url} target={p.url.startsWith("mailto") ? undefined : "_blank"} rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 18, background: p.bg, border: `1px solid ${p.border}`, borderRadius: "var(--radius-xl)", padding: "18px 22px", textDecoration: "none", transition: "transform 0.15s ease" }}>
            <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: p.bg, border: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
              {p.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.handle}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>{p.desc}</p>
            </div>
            <div style={{ background: p.color, color: "#fff", borderRadius: "var(--radius-full)", padding: "7px 14px", fontSize: 12, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>
              {p.cta} →
            </div>
          </a>
        ))}
      </div>
      <div style={{ marginTop: 36, padding: 20, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", textAlign: "center" }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>🙏</div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          En nous suivant, vous participez à la diffusion de l&apos;Évangile.<br/>
          <strong style={{ color: "var(--text-primary)" }}>Partagez nos contenus</strong> et contribuez à l&apos;impact du ministère.
        </p>
      </div>
    </div>
  );
}
