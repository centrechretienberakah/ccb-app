"use client";
import { useState } from "react";

interface Album { id: string; title: string; description?: string; cover_url?: string; created_at: string; }
interface Photo { id: string; url: string; caption?: string; album_id?: string; created_at: string; }

export default function GalerieClient({ albums, photos }: { albums: Album[]; photos: Photo[] }) {
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const displayed = selectedAlbum ? photos.filter(p => p.album_id === selectedAlbum) : photos;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>🖼️ Galerie Photos</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>Moments & souvenirs du ministère</p>
      </div>

      {/* Albums */}
      {albums.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Albums</div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
            <button onClick={() => setSelectedAlbum(null)}
              style={{ flexShrink: 0, background: !selectedAlbum ? "var(--gold)" : "var(--card-bg)", color: !selectedAlbum ? "#000" : "var(--text-muted)", border: `1px solid ${!selectedAlbum ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--radius-full)", padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Tout ({photos.length})
            </button>
            {albums.map(a => (
              <button key={a.id} onClick={() => setSelectedAlbum(a.id)}
                style={{ flexShrink: 0, background: selectedAlbum === a.id ? "var(--gold)" : "var(--card-bg)", color: selectedAlbum === a.id ? "#000" : "var(--text-muted)", border: `1px solid ${selectedAlbum === a.id ? "var(--gold)" : "var(--border)"}`, borderRadius: "var(--radius-full)", padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                {a.title} ({photos.filter(p => p.album_id === a.id).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grille */}
      {displayed.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: 0 }}>Aucune photo pour le moment.<br/>Les photos des cultes et événements seront ajoutées ici.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {displayed.map(p => (
            <div key={p.id} onClick={() => setLightbox(p)}
              style={{ cursor: "pointer", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--card-bg)", border: "1px solid var(--border)", aspectRatio: "1", position: "relative" }}>
              { }
              <img src={p.url} alt={p.caption || "Photo CCB"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s ease" }}
                onMouseOver={e => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseOut={e => (e.currentTarget.style.transform = "")} />
              {p.caption && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "20px 10px 10px", fontSize: 11, color: "#fff" }}>
                  {p.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: "100%", position: "relative" }}>
            <button onClick={() => setLightbox(null)} style={{ position: "absolute", top: -44, right: 0, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: 36, height: 36, fontSize: 18, cursor: "pointer" }}>✕</button>
            { }
            <img src={lightbox.url} alt={lightbox.caption || ""} style={{ width: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: "var(--radius-xl)", display: "block" }} />
            {lightbox.caption && <p style={{ color: "#fff", textAlign: "center", margin: "12px 0 0", fontSize: 14 }}>{lightbox.caption}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
