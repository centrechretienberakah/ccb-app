"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export interface VerseRow {
  id: string;
  reference: string;
  verse_text: string;
  saved_at: string;
}
export interface CollectionRow {
  id: string;
  name: string;
  emoji: string | null;
}

/** Mes versets — versets enregistrés (favoris), collections, partage. */
export default function BibleVersetsClient({ verses: initial, collections }: { verses: VerseRow[]; collections: CollectionRow[] }) {
  const supabase = createClient();
  const [verses, setVerses] = useState<VerseRow[]>(initial);
  const [toast, setToast] = useState<string | null>(null);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2200); }

  async function remove(id: string) {
    if (!confirm("Retirer ce verset de tes favoris ?")) return;
    await supabase.from("user_saved_verses").delete().eq("id", id);
    setVerses((prev) => prev.filter((v) => v.id !== id));
    flash("Verset retiré.");
  }

  async function share(v: VerseRow) {
    const text = `« ${v.verse_text} »\n— ${v.reference}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: v.reference, text });
        return;
      }
    } catch { /* annulé */ }
    try { await navigator.clipboard.writeText(text + "\n\n📱 https://centrechretienberakah.com"); flash("Copié !"); } catch { /* noop */ }
  }

  return (
    <div style={{ background: "var(--page-bg)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "var(--font-body)", paddingBottom: 40 }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "var(--gold)", color: "#000", padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{toast}</div>
      )}

      <div style={{
        background: "linear-gradient(135deg, var(--violet-dark, #4C1D95) 0%, var(--violet, #5B21B6) 100%)",
        color: "#fff",
        paddingTop: "calc(12px + env(safe-area-inset-top, 0px))", paddingBottom: 12, paddingLeft: 12, paddingRight: 12,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <Link href="/bible" aria-label="Retour" style={{
          width: 34, height: 34, borderRadius: 999, background: "rgba(0,0,0,0.22)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "#fff", textDecoration: "none", fontSize: 20, flexShrink: 0,
        }}>←</Link>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-title)", fontWeight: 700, fontSize: 16, lineHeight: 1.1 }}>🔖 Mes versets</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{verses.length} enregistré{verses.length > 1 ? "s" : ""}</div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 0" }}>
        {/* Collections */}
        {collections.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Mes collections
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {collections.map((c) => (
                <Link key={c.id} href={`/bible/collection/${c.id}`} style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 7,
                  background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 999,
                  padding: "8px 14px", textDecoration: "none", color: "var(--text-primary)",
                  fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-sm)",
                }}>
                  <span>{c.emoji || "📁"}</span><span>{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Versets */}
        {verses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔖</div>
            <div style={{ fontSize: 15 }}>Aucun verset enregistré.</div>
            <p style={{ fontSize: 13, marginTop: 8 }}>Pendant la lecture, utilise ★ pour enregistrer tes versets préférés.</p>
            <Link href="/bible/lire" style={{
              display: "inline-block", marginTop: 16, background: "var(--gold)", color: "#000",
              borderRadius: 999, padding: "10px 22px", fontWeight: 700, fontSize: 13, textDecoration: "none",
            }}>📖 Lire la Bible</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {verses.map((v) => (
              <div key={v.id} style={{
                background: "var(--card-bg)", borderLeft: "3px solid var(--gold)",
                borderRadius: "0 var(--radius-lg, 14px) var(--radius-lg, 14px) 0",
                padding: 16, boxShadow: "var(--shadow-sm)",
              }}>
                <div style={{ fontWeight: 700, color: "var(--gold)", fontSize: 13, marginBottom: 6 }}>{v.reference}</div>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, fontStyle: "italic" }}>« {v.verse_text} »</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>
                    {new Date(v.saved_at).toLocaleDateString("fr-FR")}
                  </span>
                  <button onClick={() => share(v)} title="Partager" style={iconBtn}>↗</button>
                  <button onClick={() => remove(v.id)} title="Retirer" style={{ ...iconBtn, color: "var(--error, #DC2626)", background: "rgba(220,38,38,0.08)" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: "var(--surface-2)", border: "none", borderRadius: 8,
  padding: "6px 11px", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
};
