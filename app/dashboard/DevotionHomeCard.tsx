"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UnifiedDevotion } from "@/lib/devotion/fetch";

const SIGNATURE = "Rév. Elvis NGUIFFO";
const PUBLIC_URL = "https://centrechretienberakah.com";

function fmtDate(d: string) {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return d;
  }
}

interface Props {
  devotion: UnifiedDevotion;
  userId: string | null;
  initialRead: boolean;
}

// Assure un ID réel en base (enregistre la méditation si fallback statique)
async function ensureDevotionId(d: UnifiedDevotion): Promise<string | null> {
  if (d.id) return d.id;
  try {
    const res = await fetch("/api/devotion/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: d.date, title: d.title, verse_ref: d.verse_ref,
        verse_text: d.verse_text, content: d.content, application: d.application,
        prayer: d.prayer, declaration: d.declaration,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) return null;
    return data.id as string;
  } catch {
    return null;
  }
}

export default function DevotionHomeCard({ devotion, userId, initialRead }: Props) {
  const [read, setRead] = useState(initialRead);
  const [marking, setMarking] = useState(false);
  const [shared, setShared] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) setCanSpeak(true);
    return () => { try { window.speechSynthesis?.cancel(); } catch { /* noop */ } };
  }, []);

  function toggleSpeak() {
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      if (speaking) { synth.cancel(); setSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(`${devotion.title}. ${devotion.verse_ref}. « ${devotion.verse_text} ». ${devotion.content}`);
      u.lang = "fr-FR"; u.rate = 0.98;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      synth.cancel();
      synth.speak(u);
      setSpeaking(true);
    } catch { setSpeaking(false); }
  }

  // Dédoublonnage défensif : ignore tout paragraphe identique déjà affiché.
  const paragraphs = (() => {
    const seen = new Set<string>();
    return devotion.content.split("\n\n").map((p) => p.trim()).filter((p) => {
      if (!p) return false;
      const k = p.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  })();
  const hasMore = paragraphs.length > 1 || !!devotion.application || !!devotion.prayer || !!devotion.declaration;

  function buildShareText(includeUrl: boolean) {
    const lines: string[] = [
      `☀ MÉDITONS ENSEMBLE — ${fmtDate(devotion.date).toUpperCase()}`,
      ``,
      `« ${devotion.title.toUpperCase()} »`,
      ``,
      `📖 ${devotion.verse_ref}`,
      `« ${devotion.verse_text} »`,
      ``,
      `✦ MÉDITATION`,
      devotion.content,
    ];
    if (devotion.application) { lines.push("", "💡 QUESTION DE RÉFLEXION", devotion.application); }
    if (devotion.prayer) { lines.push("", "🙏 PRIÈRE DU JOUR", devotion.prayer); }
    if (devotion.declaration) { lines.push("", "✦ DÉCLARATION DE FOI", devotion.declaration); }
    lines.push("", `— ${SIGNATURE}`);
    if (includeUrl) {
      lines.push("", "📱 Rejoignez le Centre Chrétien Berakah :", PUBLIC_URL);
    }
    return lines.join("\n");
  }

  async function handleShare() {
    let didShare = false;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `MÉDITONS ENSEMBLE — ${devotion.title}`,
          text: buildShareText(false),
          url: PUBLIC_URL,
        });
        didShare = true;
      }
    } catch { /* annulé */ }
    if (!didShare) {
      try {
        await navigator.clipboard.writeText(buildShareText(true));
        setShared(true);
        setTimeout(() => setShared(false), 2200);
      } catch { /* noop */ }
    }
  }

  async function markAsRead() {
    if (read || marking) return;
    if (!userId) { window.location.href = "/auth/login?redirect=/dashboard"; return; }
    setMarking(true);
    // Optimiste
    setRead(true);
    const devotionId = await ensureDevotionId(devotion);
    if (!devotionId) {
      // Pas d'ID → on garde l'état "lu" localement mais on ne persiste pas
      setMarking(false);
      return;
    }
    try {
      const sb = createClient();
      await sb.from("devotion_progress").upsert(
        { user_id: userId, devotion_id: devotionId },
        { onConflict: "user_id,devotion_id" },
      );
    } catch {
      // En cas d'échec on garde quand même l'affichage "lu" (best-effort)
    }
    setMarking(false);
  }

  return (
    <div className="dashboard-section">
      <div style={{
        position: "relative",
        background: "linear-gradient(160deg, var(--card-bg) 0%, var(--surface-2) 100%)",
        border: "1px solid var(--gold)",
        borderRadius: 20,
        padding: "22px 20px 20px",
        boxShadow: "0 6px 28px rgba(91, 33, 182,0.10), 0 2px 8px rgba(212,175,55,0.08)",
        overflow: "hidden",
      }}>
        {/* Filet doré décoratif en haut */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, transparent, var(--gold), transparent)",
        }} />

        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(145deg, #92400e, #d97706 55%, #fbbf24)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, boxShadow: "0 4px 12px rgba(251,191,36,0.35)",
          }}>☀️</div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-title)", fontSize: 16, fontWeight: 800,
              color: "var(--gold)", letterSpacing: "0.03em", lineHeight: 1.1,
            }}>
              MÉDITONS ENSEMBLE
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, textTransform: "capitalize" }}>
              {fmtDate(devotion.date)}
            </div>
          </div>
        </div>

        {/* Titre */}
        <h2 style={{
          fontFamily: "var(--font-title)", fontSize: 22, fontWeight: 800,
          color: "var(--text-primary)", margin: "0 0 14px", lineHeight: 1.25,
        }}>
          {devotion.title}
        </h2>

        {/* Verset */}
        <div style={{
          background: "rgba(91, 33, 182,0.06)",
          borderLeft: "3px solid var(--violet)",
          borderRadius: "0 12px 12px 0",
          padding: "12px 14px", marginBottom: 16,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "var(--gold)",
            marginBottom: 4, letterSpacing: "0.04em",
          }}>
            📖 {devotion.verse_ref}
          </div>
          <div style={{
            fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.55,
            fontStyle: "italic",
          }}>
            « {devotion.verse_text} »
          </div>
        </div>

        {/* Méditation — aperçu (1er paragraphe) puis le reste si déplié */}
        <div style={{ marginBottom: 14 }}>
          <SectionLabel>✦ Méditation</SectionLabel>
          {(expanded ? paragraphs : paragraphs.slice(0, 1)).map((p, i) => (
            <p key={i} style={{
              fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 10px",
            }}>
              {p}
            </p>
          ))}
        </div>

        {expanded && (
          <>
            {/* Question de réflexion */}
            {devotion.application && (
              <div style={{
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: 12, padding: "12px 14px", marginBottom: 14,
              }}>
                <SectionLabel>💡 Question de réflexion</SectionLabel>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                  {devotion.application}
                </p>
              </div>
            )}

            {/* Prière */}
            {devotion.prayer && (
              <div style={{ marginBottom: 14 }}>
                <SectionLabel>🙏 Prière du jour</SectionLabel>
                <p style={{
                  fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65,
                  margin: 0, fontStyle: "italic",
                }}>
                  {devotion.prayer}
                </p>
              </div>
            )}

            {/* Déclaration prophétique */}
            {devotion.declaration && (
              <div style={{
                background: "linear-gradient(135deg, rgba(91, 33, 182,0.10), rgba(212,175,55,0.10))",
                borderRadius: 12, padding: "12px 14px", marginBottom: 14,
                textAlign: "center",
              }}>
                <SectionLabel center>✦ Déclaration prophétique</SectionLabel>
                <p style={{
                  fontSize: 14.5, color: "var(--text-primary)", lineHeight: 1.55,
                  margin: 0, fontWeight: 600,
                }}>
                  {devotion.declaration}
                </p>
              </div>
            )}
          </>
        )}

        {/* Bouton lire la méditation complète / réduire */}
        {hasMore && (
          <button onClick={() => setExpanded((v) => !v)} style={{
            width: "100%", background: "transparent", border: "1px dashed var(--border)",
            borderRadius: 12, padding: "9px", marginBottom: 14,
            color: "var(--gold)", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
          }}>
            {expanded ? "▲ Réduire" : "▼ Lire la méditation complète"}
          </button>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={markAsRead}
            disabled={marking}
            style={{
              flex: "1 1 140px",
              background: read
                ? "rgba(74,222,128,0.15)"
                : "linear-gradient(135deg, var(--gold), var(--gold-dark))",
              color: read ? "#16a34a" : "#1a1206",
              border: read ? "1px solid rgba(74,222,128,0.4)" : "none",
              borderRadius: 999, padding: "11px 16px",
              fontWeight: 700, fontSize: 13.5,
              cursor: marking ? "wait" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              opacity: marking ? 0.7 : 1,
            }}
          >
            {read ? "✓ Lu aujourd'hui" : (marking ? "⏳ …" : "✓ Marquer comme lu")}
          </button>
          {canSpeak && (
            <button
              onClick={toggleSpeak}
              style={{
                flex: "0 1 auto",
                background: "var(--card-bg)",
                color: speaking ? "var(--violet)" : "var(--text-primary)",
                border: `1px solid ${speaking ? "var(--violet)" : "var(--border)"}`,
                borderRadius: 999, padding: "11px 16px",
                fontWeight: 700, fontSize: 13.5, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              {speaking ? "⏹ Stop" : "▶ Écouter"}
            </button>
          )}
          <button
            onClick={handleShare}
            style={{
              flex: "1 1 120px",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 999, padding: "11px 16px",
              fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            {shared ? "✓ Copié !" : "↗ Partager"}
          </button>
        </div>

      </div>
    </div>
  );
}

function SectionLabel({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div style={{
      fontSize: 11.5, fontWeight: 800, color: "var(--gold)",
      letterSpacing: "0.06em", textTransform: "uppercase",
      marginBottom: 6, textAlign: center ? "center" : "left",
    }}>
      {children}
    </div>
  );
}
