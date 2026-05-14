import { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";

export const metadata: Metadata = { title: "Faire un Don — CCB" };

const DEFAULT_MODES = [
  { emoji: "📱", title: "Mobile Money", detail: "MTN MoMo / Orange Money", info: "+243 XXX XXX XXX", color: "#FFD700", bg: "rgba(255,215,0,0.08)", border: "rgba(255,215,0,0.3)" },
  { emoji: "🏦", title: "Virement Bancaire", detail: "Compte CCB — Équateur Bank", info: "IBAN: CD00 0000 0000 0000", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.3)" },
  { emoji: "✉️", title: "Par Courrier", detail: "Enveloppe au bureau de l'église", info: "Av. de l'Église, Kinshasa", color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.3)" },
  { emoji: "📧", title: "Contact direct", detail: "Nous écrire pour coordonner", info: "centrechretienberakah@gmail.com", color: "#f472b6", bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.3)" },
];

const USES = [
  { emoji: "🎙️", label: "Production de messages & enseignements" },
  { emoji: "📺", label: "Équipement livestream & studio" },
  { emoji: "🎓", label: "Formation et bourses pour jeunes" },
  { emoji: "🏗️", label: "Construction et entretien du lieu de culte" },
  { emoji: "🌍", label: "Missions et évangélisation" },
  { emoji: "🤲", label: "Actions sociales et aide aux familles" },
];

export default async function DonsPage() {
  const cms = await getSiteContent("dons");
  const cmsModes = Array.isArray(cms?.data_json?.modes) ? (cms.data_json.modes as typeof DEFAULT_MODES) : null;
  const MODES = cmsModes && cmsModes.length > 0 ? cmsModes : DEFAULT_MODES;
  const heroTitle = cms?.title || "Soutenir le Ministère";
  const heroIntro = cms?.body_md || "Votre générosité permet au Centre Chrétien Berakah de continuer à proclamer l'Évangile, former des disciples et transformer des vies pour la gloire de Dieu.";
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 16px 80px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>💝</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>
          {heroTitle}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6, maxWidth: 460, margin: "0 auto", whiteSpace: "pre-wrap" }}>
          {heroIntro}
        </p>
      </div>

      {/* Verset */}
      <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: 32, textAlign: "center" }}>
        <p style={{ fontStyle: "italic", color: "var(--text-primary)", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
          &ldquo;Que chacun donne comme il l&apos;a résolu en son cœur, sans tristesse ni contrainte ;
          car Dieu aime celui qui donne avec joie.&rdquo;
        </p>
        <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, display: "block", marginTop: 6 }}>— 2 Corinthiens 9:7</span>
      </div>

      {/* Comment donner */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
        💳 Comment donner
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
        {MODES.map((m) => (
          <div key={m.title} style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: "var(--radius-xl)", padding: "18px 16px" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{m.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>{m.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{m.detail}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: m.color, wordBreak: "break-all" }}>{m.info}</div>
          </div>
        ))}
      </div>

      {/* À quoi ça sert */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
        🙏 Vos dons servent à
      </h2>
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "20px 24px", marginBottom: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {USES.map((u) => (
            <div key={u.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{u.emoji}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.3 }}>{u.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "var(--radius-xl)", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>📬</div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 16px" }}>
          Pour un reçu ou pour coordonner un don important, contactez-nous directement.
        </p>
        <Link href="/contact" style={{ display: "inline-block", background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "10px 24px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          Nous contacter →
        </Link>
      </div>
    </div>
  );
}
