import { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteContents } from "@/lib/site-content";
import {
  DEFAULT_INTRO, DEFAULT_STATS_MD, DEFAULT_HISTOIRE_MD, DEFAULT_VISION, DEFAULT_MISSION,
  DEFAULT_VALUES_MD, DEFAULT_TEAM_MD, DEFAULT_CTA_TITLE, DEFAULT_CTA_BODY, DEFAULT_CONFESSION_MD,
} from "@/lib/about-defaults";

export const metadata: Metadata = { title: "À Propos — Centre Chrétien Berakah" };

/* Toute la page À propos est éditable depuis Admin → 📝 Pages (CMS) ; les
 * contenus par défaut vivent dans lib/about-defaults.ts (partagés avec l'admin). */

/* ── Parseurs (formats simples éditables) ── */
function parseStats(md: string): { value: string; label: string }[] {
  return md.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split("|");
    return { value: (p[0] || "").trim(), label: p.slice(1).join("|").trim() };
  });
}
function parseValues(md: string): { icon: string; title: string; desc: string }[] {
  return md.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split("|");
    return { icon: (p[0] || "").trim(), title: (p[1] || "").trim(), desc: (p[2] || "").trim() };
  });
}
function parseTeam(md: string): { name: string; role: string; photo?: string; desc: string }[] {
  return md.split(/\n-{3,}\n/).flatMap((block) => {
    const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const head = lines[0].split("|");
    const name = (head[0] || "").trim();
    if (!name) return [];
    const photo = (head[2] || "").trim();
    return [{
      name,
      role: (head[1] || "").trim(),
      ...(photo ? { photo } : {}),
      desc: lines.slice(1).join(" ").trim(),
    }];
  });
}

/* ── Mini-rendu markdown (titres ###/##/#, séparateurs ---, **gras**) ── */
function parseBold(text: string, k: string): ReactNode[] {
  return text.split("**").map((part, i) =>
    i % 2 === 1
      ? <strong key={`${k}-b${i}`} style={{ color: "var(--text-primary)" }}>{part}</strong>
      : <span key={`${k}-t${i}`}>{part}</span>,
  );
}
function renderMd(md: string): ReactNode[] {
  const out: ReactNode[] = [];
  md.split("\n").forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    const k = `m-${idx}`;
    if (line === "---") {
      out.push(<div key={k} style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />);
    } else if (line.startsWith("### ")) {
      out.push(<h3 key={k} style={{ fontSize: 15.5, fontWeight: 800, color: "var(--gold)", margin: "18px 0 10px" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      out.push(<div key={k} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{line.slice(3)}</div>);
    } else if (line.startsWith("# ")) {
      out.push(<h2 key={k} style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 2px" }}>{line.slice(2)}</h2>);
    } else {
      out.push(<p key={k} style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 12px" }}>{parseBold(line, k)}</p>);
    }
  });
  return out;
}

export default async function AProposPage() {
  const c = await getSiteContents([
    "a-propos", "a-propos-stats", "a-propos-histoire", "a-propos-vision",
    "a-propos-mission", "a-propos-valeurs", "a-propos-equipe", "a-propos-cta", "confession-foi",
  ]);
  const heroTitle = c["a-propos"]?.title || "Centre Chrétien Berakah";
  const heroIntro = c["a-propos"]?.body_md || DEFAULT_INTRO;
  const stats = parseStats(c["a-propos-stats"]?.body_md || DEFAULT_STATS_MD);
  const histoireMd = c["a-propos-histoire"]?.body_md || DEFAULT_HISTOIRE_MD;
  const vision = c["a-propos-vision"]?.body_md || DEFAULT_VISION;
  const mission = c["a-propos-mission"]?.body_md || DEFAULT_MISSION;
  const values = parseValues(c["a-propos-valeurs"]?.body_md || DEFAULT_VALUES_MD);
  const team = parseTeam(c["a-propos-equipe"]?.body_md || DEFAULT_TEAM_MD);
  const ctaTitle = c["a-propos-cta"]?.title || DEFAULT_CTA_TITLE;
  const ctaBody = c["a-propos-cta"]?.body_md || DEFAULT_CTA_BODY;
  const confessionMd = c["confession-foi"]?.body_md || DEFAULT_CONFESSION_MD;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 16px 80px" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>⛪</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, background: "linear-gradient(135deg, var(--text-primary), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10, lineHeight: 1.2 }}>
          {heroTitle}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1.7, maxWidth: 540, margin: "0 auto", whiteSpace: "pre-wrap" }}>
          {heroIntro}
        </p>
      </div>

      {/* Statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 48 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "20px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, var(--text-primary), var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Histoire */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📜</span> Notre Histoire
        </h2>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "24px 28px" }}>
          {renderMd(histoireMd)}
        </div>
      </div>

      {/* Vision & Mission */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 48 }}>
        <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "var(--radius-xl)", padding: "24px 22px" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🔭</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--gold)", marginBottom: 10 }}>Notre Vision</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{vision}</p>
        </div>
        <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "var(--radius-xl)", padding: "24px 22px" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🎯</div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--gold)", marginBottom: 10 }}>Notre Mission</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{mission}</p>
        </div>
      </div>

      {/* Valeurs */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>💎</span> Nos Valeurs Fondamentales
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {values.map((v, i) => (
            <div key={i} style={{ display: "flex", gap: 14, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "18px 20px", alignItems: "flex-start" }}>
              <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{v.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>{v.title}</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Équipe */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>👤</span> L&apos;Équipe
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {team.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 18, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "22px 24px", alignItems: "flex-start" }}>
              {t.photo ? (
                <img src={t.photo} alt={t.name} decoding="async" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(212,175,55,0.45)", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(212,175,55,0.15)", border: "2px solid rgba(212,175,55,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                  👥
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)", marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, marginBottom: 8 }}>{t.role}</div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notre Profession de Foi */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span>✝️</span> Notre Profession de Foi
        </h2>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "24px 28px" }}>
          {renderMd(confessionMd)}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: 28, background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "var(--radius-xl)", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🤝</div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>{ctaTitle}</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ctaBody}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/contact" style={{ background: "var(--gold)", color: "#000", borderRadius: "var(--radius-full)", padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Nous contacter →
          </a>
          <a href="/nous-suivre" style={{ background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: "var(--radius-full)", padding: "10px 22px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Nous suivre
          </a>
        </div>
      </div>

    </div>
  );
}
