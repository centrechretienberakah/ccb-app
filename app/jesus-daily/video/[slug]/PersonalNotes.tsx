"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { JDTV_THEME as T, JDTV_FONTS as F, formatVideoDuration } from "@/lib/jdtv/theme";

export interface UserNote {
  id: string;
  video_id: string;
  time_secs: number | null;
  body: string;
  created_at: string;
}

interface Props {
  videoId: string;
  isAuth: boolean;
  /** Optional current playback time used for "Ajouter au timestamp courant". */
  currentTimeSecs?: number | null;
  /** Click on a timestamped note's tag → jump player. */
  onJump?: (timeSecs: number) => void;
}

export default function PersonalNotes({ videoId, isAuth, currentTimeSecs, onJump }: Props) {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [withTime, setWithTime] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  useEffect(() => {
    if (!isAuth) { setLoaded(true); return; }
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }
      const { data } = await supabase.from("jdtv_user_notes")
        .select("id, video_id, time_secs, body, created_at")
        .eq("user_id", user.id).eq("video_id", videoId)
        .order("time_secs", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false });
      setNotes((data ?? []) as UserNote[]);
      setLoaded(true);
    })();
  }, [videoId, isAuth]);

  async function addNote() {
    if (busy || !body.trim() || !isAuth) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const tSecs = withTime && currentTimeSecs != null ? Math.round(currentTimeSecs) : null;
    const { data, error } = await supabase.from("jdtv_user_notes")
      .insert({ user_id: user.id, video_id: videoId, time_secs: tSecs, body: body.trim() })
      .select().single();
    setBusy(false);
    if (error) { alert("Erreur : " + error.message); return; }
    setNotes((arr) => [...arr, data as UserNote].sort((a, b) => {
      const at = a.time_secs ?? -1;
      const bt = b.time_secs ?? -1;
      if (at !== bt) return at - bt;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }));
    setBody("");
    setWithTime(false);
  }

  async function deleteNote(id: string) {
    if (!confirm("Supprimer cette note ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("jdtv_user_notes").delete().eq("id", id);
    if (error) { alert("Erreur : " + error.message); return; }
    setNotes((arr) => arr.filter((n) => n.id !== id));
  }

  async function saveEdit(id: string) {
    if (!editingBody.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase.from("jdtv_user_notes")
      .update({ body: editingBody.trim() }).eq("id", id).select().single();
    if (error) { alert("Erreur : " + error.message); return; }
    setNotes((arr) => arr.map((n) => n.id === id ? (data as UserNote) : n));
    setEditingId(null);
  }

  if (!loaded) return null;

  return (
    <section style={{
      marginBottom: 22, padding: 14,
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
    }}>
      <h3 style={{ fontFamily: F.title, fontSize: 16, margin: "0 0 12px" }}>
        ✍️ Mes notes <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 400 }}>({notes.length})</span>
      </h3>

      {!isAuth ? (
        <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>
          <Link href="/auth/login" style={{ color: T.violet, textDecoration: "none", fontWeight: 600 }}>Connecte-toi</Link> pour prendre des notes privées sur cette vidéo.
        </p>
      ) : (
        <>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Note ce que Dieu te révèle…"
            rows={2}
            maxLength={4000}
            style={{
              width: "100%", padding: "8px 10px",
              background: T.surface2, color: T.text, border: `1px solid ${T.border}`,
              borderRadius: 8, fontSize: 13, fontFamily: F.body, resize: "vertical", minHeight: 56,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textSoft, cursor: "pointer" }}>
              <input type="checkbox" checked={withTime} onChange={(e) => setWithTime(e.target.checked)} disabled={currentTimeSecs == null} />
              <span>📍 Marquer au timestamp courant {currentTimeSecs != null ? `(${formatVideoDuration(Math.round(currentTimeSecs))})` : ""}</span>
            </label>
            <button onClick={addNote} disabled={busy || !body.trim()} style={{
              padding: "7px 14px", background: T.violet, color: "#fff", border: "none",
              borderRadius: 8, fontWeight: 700, fontSize: 12.5,
              cursor: busy || !body.trim() ? "not-allowed" : "pointer",
              opacity: busy || !body.trim() ? 0.5 : 1,
            }}>{busy ? "..." : "＋ Ajouter"}</button>
          </div>

          {notes.length === 0 ? (
            <p style={{ color: T.textMuted, fontSize: 12.5, marginTop: 14, marginBottom: 0, textAlign: "center" }}>
              Aucune note pour cette vidéo.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
              {notes.map((n) => (
                <li key={n.id} style={{
                  padding: "8px 10px",
                  background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8,
                  fontSize: 13, color: T.textSoft, lineHeight: 1.5,
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  {editingId === n.id ? (
                    <>
                      <textarea
                        value={editingBody} onChange={(e) => setEditingBody(e.target.value)}
                        rows={2} maxLength={4000}
                        style={{
                          padding: "6px 8px", background: T.card, color: T.text,
                          border: `1px solid ${T.violet}`, borderRadius: 6, fontSize: 13,
                          fontFamily: F.body, resize: "vertical",
                        }}
                      />
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => setEditingId(null)} style={lightBtn}>Annuler</button>
                        <button onClick={() => saveEdit(n.id)} style={primaryBtn}>Enregistrer</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                        {n.time_secs != null ? (
                          <button onClick={() => onJump?.(n.time_secs!)} style={{
                            padding: "1px 7px", borderRadius: 4,
                            background: T.violet, color: "#fff",
                            fontSize: 10.5, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                            border: "none", cursor: onJump ? "pointer" : "default",
                          }}>📍 {formatVideoDuration(n.time_secs)}</button>
                        ) : <span />}
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => { setEditingId(n.id); setEditingBody(n.body); }} style={ghostBtn}>✏️</button>
                          <button onClick={() => deleteNote(n.id)} style={{ ...ghostBtn, color: "#ff5470" }}>🗑️</button>
                        </div>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{n.body}</div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "5px 10px", background: T.violet, color: "#fff", border: "none",
  borderRadius: 6, fontWeight: 700, fontSize: 11.5, cursor: "pointer",
};
const lightBtn: React.CSSProperties = {
  padding: "5px 10px", background: "rgba(255,255,255,0.06)", color: T.text,
  border: `1px solid ${T.border}`, borderRadius: 6, fontWeight: 600, fontSize: 11.5, cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6,
  background: "transparent", border: "none", color: T.textMuted,
  cursor: "pointer", fontSize: 11,
};
