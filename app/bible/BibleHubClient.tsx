"use client";

import Link from "next/link";
import { useState } from "react";
import { BIBLE_THEME as T, BIBLE_FONTS as F } from "@/lib/bible/theme";
import { createClient } from "@/lib/supabase/client";

interface SavedVerseLite {
  id: string;
  reference: string;
  verse_text: string;
  saved_at: string;
}

interface CollectionLite {
  id: string;
  name: string;
  emoji: string | null;
}

interface LastReadLite {
  book_name: string;
  chapter: number;
  read_at: string;
}

interface Props {
  lastRead: LastReadLite | null;
  chaptersRead: number;
  savedVerses: SavedVerseLite[];
  collections: CollectionLite[];
  userId: string;
}

// ─── Icônes Lucide-style inline (stroke 2, line cap round) ──────────
const ICON_SIZE = 22;
function BookOpenIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
function SparklesIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
function CalendarIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="18" height="18" x="3" y="4" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
    </svg>
  );
}
function TrendingUpIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  );
}
function HeadphonesIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1v-6a9 9 0 0 1 18 0v6a1 1 0 0 1-1 1h-2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
    </svg>
  );
}
function SunriseIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2v6M5.2 11.2l1.4 1.4M2 18h2M20 18h2M17.4 12.6l1.4-1.4"/>
      <path d="M22 22H2"/><path d="M16 18a4 4 0 0 0-8 0"/>
    </svg>
  );
}
function SearchIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  );
}
function PlayCircleIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8" fill={color}/>
    </svg>
  );
}
function PlusIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}
function ArrowRightIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  );
}
function BookmarkIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function FolderIcon({ size = ICON_SIZE, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
    </svg>
  );
}

export default function BibleHubClient({
  lastRead,
  chaptersRead,
  savedVerses,
  collections: initialCollections,
  userId,
}: Props) {
  const supabase = createClient();
  const [collections, setCollections] = useState<CollectionLite[]>(initialCollections);
  const [toast, setToast] = useState<string | null>(null);
  const [newCollName, setNewCollName] = useState("");
  const [newCollEmoji, setNewCollEmoji] = useState("📖");
  const [showNewColl, setShowNewColl] = useState(false);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function createCollection() {
    const name = newCollName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("bible_verse_collections")
      .insert({ user_id: userId, name, emoji: newCollEmoji || "📖" })
      .select()
      .single();
    if (error) { flash("Erreur création."); return; }
    setCollections((prev) => [data as CollectionLite, ...prev]);
    setNewCollName("");
    setNewCollEmoji("📖");
    setShowNewColl(false);
    flash(`Collection « ${name} » créée !`);
  }

  return (
    <div style={{
      background: T.bg,
      minHeight: "100vh",
      color: T.text,
      fontFamily: F.body,
      paddingBottom: 80,
    }}>
      {/* ─── Styles globaux ─── */}
      <style>{`
        @keyframes ccb-bib-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ccb-bib-card { transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
        .ccb-bib-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(90,44,160,0.10); }
        .ccb-bib-card:active { transform: translateY(0) scale(0.985); }
        .ccb-bib-tile:active { transform: scale(0.96); }
        .ccb-bib-hscroll { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding-bottom: 6px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
        .ccb-bib-hscroll::-webkit-scrollbar { display: none; }
        .ccb-bib-hscroll > * { scroll-snap-align: start; }
      `}</style>

      {/* ─── Toast ─── */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: T.violet, color: "#fff", padding: "10px 22px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: "0 10px 30px rgba(90,44,160,0.35)",
          fontFamily: F.body,
          animation: "ccb-bib-fade-up 220ms ease-out",
        }}>{toast}</div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 22px" }}>

        {/* ─── Hero compact ─── */}
        <section style={{
          background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
          borderRadius: 22, padding: "20px 22px 22px",
          color: "#fff", position: "relative", overflow: "hidden",
          boxShadow: "0 14px 30px rgba(90,44,160,0.25)",
          marginBottom: 18,
        }}>
          {/* Décoratif subtil (sparkles) */}
          <div aria-hidden style={{
            position: "absolute", right: -10, top: -10, opacity: 0.12,
            transform: "rotate(12deg)",
          }}>
            <SparklesIcon size={130} color={T.gold} />
          </div>

          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: "rgba(255,255,255,0.14)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.gold,
              boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
            }}>
              <BookOpenIcon size={26} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: F.title, fontSize: 22, margin: 0,
                fontWeight: 700, letterSpacing: 0.6, lineHeight: 1.1,
              }}>Ma Bible</h1>
              <p style={{
                margin: "3px 0 0", fontSize: 12.5,
                opacity: 0.85, fontStyle: "italic", letterSpacing: 0.2,
              }}>
                « Ta parole est une lampe à mes pieds »
              </p>
            </div>
          </div>

          {/* Stats inline */}
          <div style={{
            position: "relative",
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            background: "rgba(0,0,0,0.18)",
            borderRadius: 14, padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <HeroStat value={chaptersRead} label="Chapitres" />
            <HeroStat value={savedVerses.length} label="Versets" />
            <HeroStat value={collections.length} label="Collections" />
          </div>
        </section>

        {/* ─── Continuer la lecture (full-width primary card) ─── */}
        {lastRead && (
          <Link
            href={`/bible/read/${encodeURIComponent(lastRead.book_name)}/${lastRead.chapter}`}
            style={{ textDecoration: "none", display: "block", marginBottom: 18 }}>
            <div className="ccb-bib-card" style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 18,
              padding: "16px 18px",
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 2px 12px rgba(31,26,51,0.04)",
              cursor: "pointer",
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldDark} 100%)`,
                color: "#1F1A33",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 14px rgba(212,175,55,0.35)",
              }}>
                <PlayCircleIcon size={26} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, color: T.textMuted, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2,
                }}>Continuer la lecture</div>
                <div style={{
                  fontFamily: F.title, fontSize: 17, fontWeight: 700,
                  color: T.text, lineHeight: 1.15,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {lastRead.book_name} · chapitre {lastRead.chapter}
                </div>
              </div>
              <ArrowRightIcon size={18} color={T.violet} />
            </div>
          </Link>
        )}

        {/* ─── Action principale : Lire la Bible (hero CTA) ─── */}
        {!lastRead && (
          <Link href="/bible/lire" style={{ textDecoration: "none", display: "block", marginBottom: 18 }}>
            <div className="ccb-bib-card" style={{
              background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
              borderRadius: 18, padding: "20px 20px",
              color: "#fff",
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 8px 22px rgba(90,44,160,0.30)",
              cursor: "pointer",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: T.gold,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <BookOpenIcon size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: F.title, fontSize: 18, fontWeight: 700,
                  letterSpacing: 0.3,
                }}>Lire la Bible</div>
                <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
                  66 livres · 13 versions
                </div>
              </div>
              <ArrowRightIcon size={20} color="#fff" />
            </div>
          </Link>
        )}

        {/* ─── Actions principales (grille premium) ─── */}
        <SectionTitle>Explore</SectionTitle>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12, marginBottom: 22,
        }}>
          <ActionTile
            href="/bible/lire"
            icon={<BookOpenIcon size={22} color={T.violet} />}
            label="Toute la Bible"
            sub="AT · NT · 66 livres"
            tone="violet"
          />
          <ActionTile
            href="/bible/theme"
            icon={<SparklesIcon size={22} color={T.goldDark} />}
            label="Plans thématiques"
            sub="13 thèmes guidés"
            tone="gold"
          />
          <ActionTile
            href="/plan-biblique"
            icon={<CalendarIcon size={22} color={T.violet} />}
            label="Plan annuel"
            sub="Lecture guidée"
            tone="neutral"
          />
          <ActionTile
            href="/bible/progression"
            icon={<TrendingUpIcon size={22} color={T.violet} />}
            label="Ma progression"
            sub="Stats & badges"
            tone="neutral"
          />
          <ActionTile
            href="/dashboard"
            icon={<SunriseIcon size={22} color={T.goldDark} />}
            label="Verset du jour"
            sub="Méditation matinale"
            tone="gold"
          />
          <ActionTile
            href="/bible/lire"
            icon={<HeadphonesIcon size={22} color={T.textMuted} />}
            label="Audio Bible"
            sub="Bientôt disponible"
            tone="muted"
          />
        </div>

        {/* ─── Recherche full-width ─── */}
        <Link href="/bible/recherche" style={{ textDecoration: "none", display: "block", marginBottom: 22 }}>
          <div className="ccb-bib-card" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12,
            cursor: "pointer", boxShadow: "0 2px 10px rgba(31,26,51,0.03)",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: T.violetSoft, color: T.violet,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <SearchIcon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: T.text,
                fontFamily: F.body,
              }}>Rechercher</div>
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
                Mots-clés · références · thèmes
              </div>
            </div>
            <ArrowRightIcon size={16} color={T.textMuted} />
          </div>
        </Link>

        {/* ─── Collections (horizontal scroll moderne) ─── */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <SectionTitle noMargin>Mes collections</SectionTitle>
          <button onClick={() => setShowNewColl(true)} style={{
            background: "none", border: "none",
            color: T.violet, fontSize: 11.5, fontWeight: 700,
            fontFamily: F.body, cursor: "pointer", textTransform: "uppercase",
            letterSpacing: 0.6, padding: 0,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <PlusIcon size={14} /> Nouvelle
          </button>
        </div>

        {showNewColl && (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: 14, marginBottom: 14,
            animation: "ccb-bib-fade-up 220ms ease-out",
          }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                placeholder="📖"
                value={newCollEmoji}
                onChange={(e) => setNewCollEmoji(e.target.value)}
                maxLength={2}
                style={{
                  width: 50, padding: "10px", textAlign: "center", fontSize: 18,
                  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
                  color: T.text, fontFamily: F.body, outline: "none",
                }}
              />
              <input
                placeholder="Nom (ex: Foi, Combat spirituel…)"
                value={newCollName}
                onChange={(e) => setNewCollName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createCollection(); }}
                autoFocus
                style={{
                  flex: 1, padding: "10px 12px", fontSize: 14,
                  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
                  color: T.text, fontFamily: F.body, outline: "none",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button onClick={() => setShowNewColl(false)} style={btnLink}>Annuler</button>
              <button onClick={createCollection} style={btnViolet}>Créer</button>
            </div>
          </div>
        )}

        <div className="ccb-bib-hscroll" style={{ marginBottom: savedVerses.length > 0 ? 22 : 16 }}>
          {collections.length === 0 ? (
            <button onClick={() => setShowNewColl(true)} className="ccb-bib-tile" style={{
              flex: "0 0 220px",
              background: T.card,
              border: `1.5px dashed ${T.violet}`,
              borderRadius: 16, padding: "26px 18px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              cursor: "pointer", color: T.violet,
              fontFamily: F.body,
              transition: "transform 160ms ease, background 160ms ease",
            }}>
              <FolderIcon size={28} color={T.violet} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>Crée ta première collection</div>
              <div style={{ fontSize: 11, opacity: 0.7, textAlign: "center" }}>
                Organise tes versets favoris par thème.
              </div>
            </button>
          ) : (
            <>
              {collections.map((c, i) => (
                <Link
                  key={c.id} href={`/bible/collection/${c.id}`}
                  className="ccb-bib-tile"
                  style={{
                    flex: "0 0 140px", height: 140,
                    background: `linear-gradient(160deg, ${i % 3 === 0 ? T.violet : i % 3 === 1 ? T.violetDark : T.goldDark} 0%, ${i % 3 === 0 ? T.violetDark : i % 3 === 1 ? T.violet : T.gold} 100%)`,
                    borderRadius: 16, padding: "14px 14px",
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                    color: "#fff", textDecoration: "none",
                    boxShadow: "0 6px 18px rgba(31,26,51,0.10)",
                    transition: "transform 160ms ease, box-shadow 160ms ease",
                  } as React.CSSProperties}>
                  <div style={{ fontSize: 28, lineHeight: 1 }}>{c.emoji || "📖"}</div>
                  <div>
                    <div style={{
                      fontFamily: F.title, fontSize: 13.5, fontWeight: 700,
                      lineHeight: 1.2,
                      display: "-webkit-box", WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2, overflow: "hidden",
                    }}>{c.name}</div>
                  </div>
                </Link>
              ))}
              <button onClick={() => setShowNewColl(true)} className="ccb-bib-tile" style={{
                flex: "0 0 140px", height: 140,
                background: "transparent",
                border: `1.5px dashed ${T.violet}`,
                borderRadius: 16,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 6, color: T.violet, cursor: "pointer",
                fontFamily: F.body,
                transition: "transform 160ms ease",
              }}>
                <PlusIcon size={22} color={T.violet} />
                <div style={{ fontSize: 11.5, fontWeight: 700 }}>Nouvelle</div>
              </button>
            </>
          )}
        </div>

        {/* ─── Versets sauvegardés ─── */}
        {savedVerses.length > 0 && (
          <>
            <SectionTitle>Mes versets favoris</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              {savedVerses.map((v) => (
                <div key={v.id} className="ccb-bib-card" style={{
                  background: T.card, borderRadius: 14,
                  padding: "14px 16px",
                  border: `1px solid ${T.borderSoft}`,
                  borderLeft: `3px solid ${T.gold}`,
                  boxShadow: "0 2px 10px rgba(31,26,51,0.03)",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 11.5, fontWeight: 700, color: T.violet, marginBottom: 6,
                    fontFamily: F.body, textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    <BookmarkIcon size={12} color={T.gold} />
                    {v.reference}
                  </div>
                  <p style={{
                    margin: 0, fontSize: 13.5, color: T.textSoft, lineHeight: 1.6,
                    fontStyle: "italic", fontFamily: F.body,
                  }}>« {v.verse_text} »</p>
                </div>
              ))}
            </div>
            <Link href="/bible/lire" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: T.violet, fontSize: 13, fontWeight: 700,
              textDecoration: "none", padding: "8px 0",
              fontFamily: F.body,
            }}>
              Voir tous mes versets <ArrowRightIcon size={14} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────
function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontFamily: F.title, fontSize: 20, fontWeight: 800,
        color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      <div style={{
        fontSize: 10, opacity: 0.78, marginTop: 3,
        textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600,
      }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children, noMargin = false }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <h2 style={{
      fontFamily: F.body, fontSize: 11, fontWeight: 700,
      color: T.textMuted, textTransform: "uppercase",
      letterSpacing: 0.12 + "em", margin: noMargin ? 0 : "0 0 10px",
    }}>{children}</h2>
  );
}

function ActionTile({ href, icon, label, sub, tone }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  tone: "violet" | "gold" | "neutral" | "muted";
}) {
  const bg = tone === "violet" ? T.violetSoft
    : tone === "gold" ? "rgba(212,175,55,0.10)"
    : tone === "muted" ? "rgba(133,124,149,0.08)"
    : T.card;
  const iconBg = tone === "violet" ? "rgba(90,44,160,0.12)"
    : tone === "gold" ? "rgba(212,175,55,0.18)"
    : tone === "muted" ? "rgba(133,124,149,0.12)"
    : T.violetSoft;
  return (
    <Link href={href} className="ccb-bib-card" style={{
      background: bg,
      border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "14px 14px",
      display: "flex", flexDirection: "column", gap: 10,
      textDecoration: "none", color: T.text,
      cursor: "pointer",
      boxShadow: "0 1px 4px rgba(31,26,51,0.03)",
    } as React.CSSProperties}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <div>
        <div style={{
          fontFamily: F.title, fontWeight: 700, fontSize: 14.5,
          color: T.text, lineHeight: 1.2,
        }}>{label}</div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{sub}</div>
      </div>
    </Link>
  );
}

// ─── Styles partagés ─────────────────────────────────────────────────
const btnViolet: React.CSSProperties = {
  background: T.violet,
  color: "#fff",
  padding: "9px 16px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
  border: "none",
  cursor: "pointer",
  fontFamily: F.body,
};
const btnLink: React.CSSProperties = {
  background: "transparent",
  color: T.textMuted,
  padding: "9px 14px",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 13,
  border: "none",
  cursor: "pointer",
  fontFamily: F.body,
};
