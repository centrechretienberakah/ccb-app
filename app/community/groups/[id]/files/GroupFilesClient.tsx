"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GROUPS_THEME as T, GROUPS_FONTS as F } from "@/lib/groups/theme";

interface Group { id: string; name: string; type: "public" | "private" }
interface FileRow {
  message_id: string;
  user_id: string;
  url: string;
  type: "image" | "pdf" | "audio" | "video" | "other" | null;
  name: string | null;
  size: number | null;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

function fmtSize(s: number | null): string {
  if (!s) return "";
  if (s < 1024) return `${s} o`;
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(0)} Ko`;
  return `${(s / (1024 * 1024)).toFixed(1)} Mo`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function GroupFilesClient({ group, files }: { group: Group; files: FileRow[] }) {
  const [filter, setFilter] = useState<"all" | "image" | "pdf" | "audio" | "video">("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return files;
    return files.filter((f) => f.type === filter);
  }, [files, filter]);

  const counts = useMemo(() => ({
    image: files.filter((f) => f.type === "image").length,
    pdf: files.filter((f) => f.type === "pdf").length,
    audio: files.filter((f) => f.type === "audio").length,
    video: files.filter((f) => f.type === "video").length,
  }), [files]);

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "22px 14px 18px",
        position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Link href={`/community/groups/${group.id}`} style={{
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8, padding: "6px 12px",
              color: "#fff", fontSize: 12, fontWeight: 700,
              textDecoration: "none",
            }}>← {group.name}</Link>
          </div>
          <h1 style={{
            fontFamily: F.title, fontSize: "clamp(1.3rem, 4.5vw, 1.7rem)",
            fontWeight: 700, margin: 0, letterSpacing: "0.04em",
          }}>
            📎 Fichiers partagés
          </h1>
          <p style={{ margin: "3px 0 0", fontSize: 12, opacity: 0.9 }}>
            {files.length} fichier{files.length > 1 ? "s" : ""} dans ce groupe
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 14px 40px" }}>
        {/* Filtres */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {([
            { id: "all",   label: "📚 Tous",        n: files.length },
            { id: "image", label: "🖼️ Images",      n: counts.image },
            { id: "pdf",   label: "📄 PDF",         n: counts.pdf },
            { id: "audio", label: "🎵 Audio",       n: counts.audio },
            { id: "video", label: "🎬 Vidéos",      n: counts.video },
          ] as const).map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={chip(filter === f.id)}>
              {f.label} {f.n > 0 ? `· ${f.n}` : ""}
            </button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "50px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>📎</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>
              {files.length === 0 ? "Aucun fichier partagé encore." : "Aucun fichier ne correspond."}
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}>
            {filtered.map((f) => (
              <div key={f.message_id} style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, overflow: "hidden",
                boxShadow: T.shadowSoft,
                display: "flex", flexDirection: "column",
              }}>
                {f.type === "image" ? (
                  <div onClick={() => setLightbox(f.url)} style={{
                    cursor: "zoom-in", aspectRatio: "1", overflow: "hidden",
                    background: T.surface2,
                  }}>
                    { }
                    <img src={f.url} alt={f.name ?? ""} loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                ) : f.type === "video" ? (
                  <video src={f.url} controls style={{ width: "100%", aspectRatio: "16/9", display: "block", background: "#000" }} />
                ) : f.type === "audio" ? (
                  <div style={{ padding: "20px 14px", background: T.surface2 }}>
                    <div style={{ fontSize: 36, textAlign: "center", marginBottom: 10 }}>🎵</div>
                    <audio src={f.url} controls style={{ width: "100%" }} />
                  </div>
                ) : (
                  <a href={f.url} target="_blank" rel="noopener" style={{
                    aspectRatio: "1", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: T.surface2, textDecoration: "none",
                    color: T.text,
                  }}>
                    <div style={{ fontSize: 56, marginBottom: 6 }}>
                      {f.type === "pdf" ? "📄" : "📎"}
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: T.violet,
                      padding: "0 12px", textAlign: "center",
                    }}>
                      Ouvrir
                    </div>
                  </a>
                )}
                <div style={{ padding: "10px 12px" }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: T.text,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    marginBottom: 4,
                  }}>
                    {f.name ?? "Fichier"}
                  </div>
                  <div style={{
                    fontSize: 10, color: T.textMuted,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span>{f.display_name ?? "Membre"}</span>
                    <span>{fmtDate(f.created_at)}</span>
                  </div>
                  {f.size && (
                    <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
                      {fmtSize(f.size)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(0,0,0,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, cursor: "zoom-out",
        }}>
          { }
          <img loading="lazy" decoding="async" src={lightbox} alt=""
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }} style={{
            position: "absolute", top: 14, right: 14,
            background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 999, width: 40, height: 40,
            color: "#fff", fontSize: 18, cursor: "pointer",
          }}>✕</button>
        </div>
      )}
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    background: active ? T.violetSoft : T.card,
    border: `1px solid ${active ? T.violet : T.border}`,
    color: active ? T.violet : T.textMuted,
    fontSize: 11, fontWeight: active ? 700 : 500,
    borderRadius: 999, cursor: "pointer", fontFamily: F.body,
  };
}
