"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BIBLE_VERSIONS, getVersionById, type BibleVersion } from "@/lib/bible/versions";
import {
  BIBLE_THEME as T, BIBLE_FONTS as F,
  HIGHLIGHT_COLORS, highlightBg, type HighlightColor,
} from "@/lib/bible/theme";
import { shareBibleVerse, notifyBibleStaff } from "@/lib/bible/share";
import { speak, stopSpeaking, isSpeechSupported } from "@/lib/bible/audio";
import { generateVerseImage, downloadOrShareVerseImage } from "@/lib/bible/verse-image";
import Link from "next/link";

interface Verse {
  verse: number;
  text: string;
}

interface Props {
  bookFr: string;
  bookEn: string;
  bookNumber: number;
  chapter: number;
  totalChapters: number;
}

async function fetchChapter(bookEn: string, bookNumber: number, chapter: number, versionId: string): Promise<Verse[]> {
  const params = new URLSearchParams({
    bookNumber: String(bookNumber),
    chapter: String(chapter),
    bookEn,
    version: versionId,
  });
  const res = await fetch(`/api/bible?${params}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "BIBLE_API_KEY_REQUIRED") throw new Error("API_KEY_REQUIRED");
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.verses?.length) throw new Error("Aucun verset reçu");
  return data.verses as Verse[];
}

export default function ReaderClient({ bookFr, bookEn, bookNumber, chapter, totalChapters }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Un membre");
  const [versionId, setVersionId] = useState<string>("lsg");
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(17);
  const [highlights, setHighlights] = useState<Map<number, HighlightColor>>(new Map());
  const [notesByVerse, setNotesByVerse] = useState<Map<number, string>>(new Map());
  const [savedVerseNumbers, setSavedVerseNumbers] = useState<Set<number>>(new Set());
  const [isChapterRead, setIsChapterRead] = useState(false);
  const [noteEditFor, setNoteEditFor] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showAddToColl, setShowAddToColl] = useState(false);
  const [collections, setCollections] = useState<{ id: string; name: string; emoji: string | null }[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ startX: number; startY: number; startT: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  // ── Boot : user + paramètres ─────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("ccb-bible-version");
    if (saved && BIBLE_VERSIONS.find((v) => v.id === saved)) setVersionId(saved);
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      supabase.from("user_profiles")
        .select("display_name, full_name")
        .eq("user_id", u.id).maybeSingle()
        .then(({ data: p }) => {
          if (p) setUserName(
            (p.display_name as string) || (p.full_name as string) || "Un membre",
          );
        });
    });

  }, []);

  // ── Save dernière position ────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("ccb-bible-last", JSON.stringify({ book: bookFr, chapter }));
  }, [bookFr, chapter]);

  function changeVersion(id: string) {
    setVersionId(id);
    localStorage.setItem("ccb-bible-version", id);
    setShowVersionPicker(false);
  }

  // Close picker on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowVersionPicker(false);
      }
    }
    if (showVersionPicker) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showVersionPicker]);

  // ── Chargement chapitre + données user (highlights, notes, saved, progress) ─
  const load = useCallback(async () => {
    setLoading(true); setFetchError(null); setVerses([]);
    try {
      const result = await fetchChapter(bookEn, bookNumber, chapter, versionId);
      setVerses(result);
    } catch (e) {
      setFetchError((e as Error).message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [bookEn, bookNumber, chapter, versionId]);

  useEffect(() => { load(); }, [load]);

  // Charge highlights + notes + saved + progress quand userId/chapitre changent
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [hl, nt, sv, pr] = await Promise.all([
        supabase.from("bible_highlights")
          .select("verse_number, color")
          .eq("user_id", userId).eq("book_name", bookFr).eq("chapter", chapter),
        supabase.from("user_bible_notes")
          .select("verse_number, note_text")
          .eq("user_id", userId).eq("book_name", bookFr).eq("chapter", chapter),
        supabase.from("user_saved_verses")
          .select("verse_number")
          .eq("user_id", userId).eq("book_name", bookFr).eq("chapter", chapter),
        supabase.from("bible_chapter_progress")
          .select("id")
          .eq("user_id", userId).eq("book_name", bookFr).eq("chapter", chapter)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const hlMap = new Map<number, HighlightColor>();
      (hl.data ?? []).forEach((r) => {
        const v = r as { verse_number: number; color: string };
        hlMap.set(v.verse_number, v.color as HighlightColor);
      });
      setHighlights(hlMap);
      const ntMap = new Map<number, string>();
      (nt.data ?? []).forEach((r) => {
        const v = r as { verse_number: number | null; note_text: string };
        if (v.verse_number != null) ntMap.set(v.verse_number, v.note_text);
      });
      setNotesByVerse(ntMap);
      const savedSet = new Set<number>();
      (sv.data ?? []).forEach((r) => {
        const v = r as { verse_number: number | null };
        if (v.verse_number != null) savedSet.add(v.verse_number);
      });
      setSavedVerseNumbers(savedSet);
      setIsChapterRead(!!pr.data);
    })();
    return () => { cancelled = true; };
  }, [userId, bookFr, chapter, supabase]);

  // ── Helpers ──────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function navigate(dir: "prev" | "next") {
    const newChap = dir === "prev" ? chapter - 1 : chapter + 1;
    if (newChap < 1 || newChap > totalChapters) return;
    router.push(`/bible/read/${encodeURIComponent(bookFr)}/${newChap}`);
  }

  // ── Highlight ────────────────────────────────────────────────────
  async function setHighlight(verseNum: number, color: HighlightColor | null) {
    if (!userId) { showToast("Connectez-vous."); return; }
    const prev = new Map(highlights);
    const newMap = new Map(highlights);
    if (color) newMap.set(verseNum, color);
    else newMap.delete(verseNum);
    setHighlights(newMap);
    try {
      if (color) {
        await supabase.from("bible_highlights").upsert(
          { user_id: userId, book_name: bookFr, chapter, verse_number: verseNum, color },
          { onConflict: "user_id,book_name,chapter,verse_number" },
        );
        await notifyBibleStaff(
          `🎨 ${userName} a surligné un verset`,
          `${bookFr} ${chapter}:${verseNum}`,
          `/bible/read/${encodeURIComponent(bookFr)}/${chapter}`,
        );
      } else {
        await supabase.from("bible_highlights").delete()
          .eq("user_id", userId).eq("book_name", bookFr)
          .eq("chapter", chapter).eq("verse_number", verseNum);
      }
    } catch {
      setHighlights(prev);
      showToast("Erreur surlignage.");
    }
  }

  // ── Sauvegarde verset ────────────────────────────────────────────
  async function saveVerse(v: Verse, collectionId?: string | null) {
    if (!userId) { showToast("Connectez-vous."); return; }
    const reference = `${bookFr} ${chapter}:${v.verse}`;
    try {
      const payload: Record<string, unknown> = {
        user_id: userId, book_name: bookFr, chapter,
        verse_number: v.verse, verse_text: v.text, reference,
      };
      if (collectionId !== undefined) payload.collection_id = collectionId;
      await supabase.from("user_saved_verses").upsert(payload, {
        onConflict: "user_id,book_name,chapter,verse_number",
      });
      setSavedVerseNumbers((p) => new Set(p).add(v.verse));
      showToast(`⭐ ${reference} sauvegardé !`);
      await notifyBibleStaff(
        `⭐ ${userName} a sauvegardé un verset`,
        `« ${reference} »`,
        `/bible/read/${encodeURIComponent(bookFr)}/${chapter}`,
      );
    } catch {
      showToast("Erreur sauvegarde.");
    }
  }

  // ── Partage verset ───────────────────────────────────────────────
  async function shareVerseAction(v: Verse) {
    const reference = `${bookFr} ${chapter}:${v.verse}`;
    const status = await shareBibleVerse({
      reference, text: v.text, versionShort: currentVersion.shortLabel,
    });
    if (status === "shared" || status === "copied") {
      showToast(status === "shared" ? "Partagé !" : "Copié !");
      if (userId) {
        notifyBibleStaff(
          `📤 ${userName} a partagé un verset`,
          `« ${reference} »`,
          `/bible/read/${encodeURIComponent(bookFr)}/${chapter}`,
        );
      }
    }
  }

  // ── Note par verset ──────────────────────────────────────────────
  function openNoteEditor(verseNum: number) {
    setNoteDraft(notesByVerse.get(verseNum) ?? "");
    setNoteEditFor(verseNum);
    setSelectedVerse(null);
  }
  async function saveNote() {
    if (!userId || noteEditFor == null) return;
    const text = noteDraft.trim();
    try {
      if (!text) {
        await supabase.from("user_bible_notes").delete()
          .eq("user_id", userId).eq("book_name", bookFr)
          .eq("chapter", chapter).eq("verse_number", noteEditFor);
        const m = new Map(notesByVerse); m.delete(noteEditFor); setNotesByVerse(m);
        showToast("Note supprimée.");
      } else {
        // Upsert simplifié : delete + insert (pas de contrainte unique sur verse_number)
        await supabase.from("user_bible_notes").delete()
          .eq("user_id", userId).eq("book_name", bookFr)
          .eq("chapter", chapter).eq("verse_number", noteEditFor);
        await supabase.from("user_bible_notes").insert({
          user_id: userId, book_name: bookFr, chapter,
          verse_number: noteEditFor, note_text: text,
        });
        const m = new Map(notesByVerse); m.set(noteEditFor, text); setNotesByVerse(m);
        showToast("Note sauvegardée.");
      }
    } catch {
      showToast("Erreur note.");
    }
    setNoteEditFor(null);
    setNoteDraft("");
  }

  // ── Marquer chapitre lu ──────────────────────────────────────────
  async function toggleChapterRead() {
    if (!userId) { showToast("Connectez-vous."); return; }
    try {
      if (isChapterRead) {
        await supabase.from("bible_chapter_progress").delete()
          .eq("user_id", userId).eq("book_name", bookFr).eq("chapter", chapter);
        setIsChapterRead(false);
        showToast("Marqué non lu.");
      } else {
        await supabase.from("bible_chapter_progress").upsert(
          { user_id: userId, book_name: bookFr, chapter },
          { onConflict: "user_id,book_name,chapter" },
        );
        setIsChapterRead(true);
        showToast(`✅ ${bookFr} ${chapter} marqué lu !`);
      }
    } catch {
      showToast("Erreur progression.");
    }
  }

  // ── Collections (chargement lazy à l'ouverture du modal) ─────────
  async function openAddToCollection(v: Verse) {
    if (!userId) { showToast("Connectez-vous."); return; }
    setSelectedVerse(v);
    const { data } = await supabase.from("bible_verse_collections")
      .select("id, name, emoji").eq("user_id", userId)
      .order("created_at", { ascending: false });
    setCollections((data ?? []) as { id: string; name: string; emoji: string | null }[]);
    setShowAddToColl(true);
  }
  async function assignToCollection(collId: string | null) {
    if (!selectedVerse) return;
    await saveVerse(selectedVerse, collId);
    setShowAddToColl(false);
    setSelectedVerse(null);
  }

  // ── Audio (lecture vocale du chapitre) ───────────────────────────
  function toggleAudio() {
    if (!isSpeechSupported()) {
      showToast("Lecture vocale non disponible sur ce navigateur.");
      return;
    }
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    if (verses.length === 0) return;
    const text = verses.map((v) => `Verset ${v.verse}. ${v.text}`).join(" ");
    const u = speak(text);
    if (!u) return;
    setIsPlaying(true);
    u.onend = () => setIsPlaying(false);
    u.onerror = () => setIsPlaying(false);
  }
  useEffect(() => {
    // Stop audio quand on change de chapitre
    return () => { if (isSpeechSupported()) stopSpeaking(); };
  }, [chapter, bookFr]);

  // ── Image partage social media ───────────────────────────────────
  async function shareVerseImage(v: Verse) {
    if (imgBusy) return;
    setImgBusy(true);
    try {
      const blob = await generateVerseImage({
        reference: `${bookFr} ${chapter}:${v.verse}`,
        text: v.text,
        versionShort: currentVersion.shortLabel,
      });
      if (!blob) { showToast("Erreur image."); return; }
      const status = await downloadOrShareVerseImage(blob, `ccb-${bookFr}-${chapter}-${v.verse}.png`);
      showToast(status === "shared" ? "Image partagée !" : "Image téléchargée !");
      if (userId) {
        notifyBibleStaff(
          `🖼️ ${userName} a partagé une image verset`,
          `« ${bookFr} ${chapter}:${v.verse} »`,
          `/bible/read/${encodeURIComponent(bookFr)}/${chapter}`,
        );
      }
    } finally {
      setImgBusy(false);
    }
  }

  // ── Swipe mobile (chapter prev/next) ─────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    swipeRef.current = { startX: t.clientX, startY: t.clientY, startT: Date.now() };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s = swipeRef.current; if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.startX;
    const dy = t.clientY - s.startY;
    const dt = Date.now() - s.startT;
    swipeRef.current = null;
    if (dt > 600) return;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;
    if (dx < 0) navigate("next");
    else navigate("prev");
  }

  const currentVersion = getVersionById(versionId);
  const hasPrev = chapter > 1;
  const hasNext = chapter < totalChapters;
  const isApiKeyRequired = fetchError === "API_KEY_REQUIRED";

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: F.body, minHeight: "100vh" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: T.violet, color: "#fff", padding: "10px 22px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: "0 8px 30px rgba(90,44,160,0.35)",
          whiteSpace: "nowrap", fontFamily: F.body,
        }}>
          {toast}
        </div>
      )}

      {/* Modal Action Verset */}
      {selectedVerse && !showAddToColl && (
        <div onClick={() => setSelectedVerse(null)} style={{
          position: "fixed", inset: 0, background: "rgba(31,26,51,0.55)",
          backdropFilter: "blur(4px)", display: "flex",
          alignItems: "flex-end", justifyContent: "center",
          zIndex: 1000, padding: 0,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: T.card, borderTop: `3px solid ${T.violet}`,
            borderRadius: "20px 20px 0 0", padding: "20px 18px 32px",
            width: "100%", maxWidth: 600,
            boxShadow: "0 -20px 60px rgba(0,0,0,0.18)",
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: T.violet, marginBottom: 8,
              fontFamily: F.body, letterSpacing: "0.05em",
            }}>
              {bookFr} {chapter}:{selectedVerse.verse} · {currentVersion.shortLabel}
            </div>
            <p style={{
              fontFamily: F.title, fontStyle: "italic",
              color: T.textSoft, lineHeight: 1.7, fontSize: 15,
              margin: "0 0 18px",
            }}>
              « {selectedVerse.text} »
            </p>

            {/* Surlignage couleurs */}
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.textMuted,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
            }}>
              Surligner
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {HIGHLIGHT_COLORS.map((c) => {
                const active = highlights.get(selectedVerse.verse) === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setHighlight(selectedVerse.verse, active ? null : c.id); setSelectedVerse(null); }}
                    style={{
                      width: 38, height: 38, borderRadius: 10, cursor: "pointer",
                      background: c.bg, border: active ? `2.5px solid ${c.ring}` : "2.5px solid transparent",
                      boxShadow: active ? `0 0 0 2px ${T.bg}, 0 0 0 4px ${c.ring}` : "none",
                    }}
                    aria-label={c.label}
                    title={c.label}
                  />
                );
              })}
              {highlights.get(selectedVerse.verse) && (
                <button
                  onClick={() => { setHighlight(selectedVerse.verse, null); setSelectedVerse(null); }}
                  style={{
                    height: 38, padding: "0 12px", borderRadius: 10, cursor: "pointer",
                    background: T.surface2, border: `1px solid ${T.border}`,
                    color: T.textMuted, fontSize: 12, fontWeight: 700,
                    fontFamily: F.body,
                  }}
                >
                  ✕ Enlever
                </button>
              )}
            </div>

            {/* Actions principales */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => saveVerse(selectedVerse)} style={btnPrimaryFull}>
                ⭐ Sauvegarder
              </button>
              <button onClick={() => openAddToCollection(selectedVerse)} style={btnSecondaryFull}>
                📚 + Collection
              </button>
              <button onClick={() => shareVerseAction(selectedVerse)} style={btnSecondaryFull}>
                📤 Partager
              </button>
              <button onClick={() => shareVerseImage(selectedVerse)} disabled={imgBusy} style={btnSecondaryFull}>
                🖼️ {imgBusy ? "Génération…" : "Image PNG"}
              </button>
              <button onClick={() => openNoteEditor(selectedVerse.verse)} style={{ ...btnSecondaryFull, gridColumn: "1 / -1" }}>
                📝 {notesByVerse.has(selectedVerse.verse) ? "Modifier note" : "Ajouter note"}
              </button>
            </div>
            <button onClick={() => setSelectedVerse(null)} style={{
              width: "100%", marginTop: 12, padding: "10px",
              background: "transparent", border: "none",
              color: T.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: F.body,
            }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Modal Add to Collection */}
      {showAddToColl && selectedVerse && (
        <div onClick={() => setShowAddToColl(false)} style={{
          position: "fixed", inset: 0, background: "rgba(31,26,51,0.6)",
          backdropFilter: "blur(4px)", display: "flex",
          alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: T.card, borderRadius: 18, padding: 18,
            width: "100%", maxWidth: 380,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{
              fontFamily: F.title, fontSize: 15, fontWeight: 700,
              color: T.text, marginBottom: 12,
            }}>
              Ajouter à une collection
            </div>
            {collections.length === 0 ? (
              <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 14 }}>
                Aucune collection. Créez-en depuis la page Bible.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {collections.map((c) => (
                  <button key={c.id} onClick={() => assignToCollection(c.id)} style={collBtn}>
                    <span style={{ fontSize: 18 }}>{c.emoji || "📖"}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => assignToCollection(null)} style={{
              ...collBtn, justifyContent: "center", color: T.textMuted,
              border: `1px dashed ${T.border}`,
            }}>
              Sauvegarder sans collection
            </button>
          </div>
        </div>
      )}

      {/* Modal Note */}
      {noteEditFor != null && (
        <div onClick={() => setNoteEditFor(null)} style={{
          position: "fixed", inset: 0, background: "rgba(31,26,51,0.6)",
          backdropFilter: "blur(4px)", display: "flex",
          alignItems: "center", justifyContent: "center",
          zIndex: 1200, padding: 16,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: T.card, borderRadius: 18, padding: 18,
            width: "100%", maxWidth: 460,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{
              fontFamily: F.title, fontSize: 15, fontWeight: 700,
              color: T.text, marginBottom: 4,
            }}>
              📝 Note · {bookFr} {chapter}:{noteEditFor}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 10 }}>
              Ta réflexion sur ce verset (privée)
            </div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={6}
              placeholder="Ce verset me parle parce que…"
              style={{
                width: "100%", boxSizing: "border-box",
                background: T.bg, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: 12, fontSize: 14,
                color: T.text, fontFamily: F.body, resize: "vertical",
                outline: "none", marginBottom: 12,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setNoteEditFor(null)} style={{
                background: "transparent", border: "none", color: T.textMuted,
                padding: "10px 16px", fontWeight: 600, cursor: "pointer",
                fontSize: 13, fontFamily: F.body,
              }}>Annuler</button>
              <button onClick={saveNote} style={btnPrimaryFull}>
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-header sticky */}
      <div style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        position: "sticky", top: 62, zIndex: 50,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "10px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => router.push("/bible")} style={{
              background: T.surface2, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "6px 12px",
              color: T.violet, fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: F.body, flexShrink: 0,
            }}>
              ← Bible
            </button>

            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                fontWeight: 700, fontSize: 14, color: T.text,
                fontFamily: F.title, letterSpacing: "0.02em",
              }}>
                {bookFr} {chapter}
              </div>
            </div>

            <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
              <button onClick={toggleAudio} title={isPlaying ? "Arrêter" : "Écouter le chapitre"} style={{
                ...fontBtn,
                width: 32,
                background: isPlaying ? T.violet : T.surface2,
                color: isPlaying ? "#fff" : T.textSoft,
                borderColor: isPlaying ? T.violet : T.border,
              }}>
                {isPlaying ? "⏸" : "🔊"}
              </button>
              <Link href={`/bible/parallel/${encodeURIComponent(bookFr)}/${chapter}`} title="Mode parallèle 2 versions" style={{
                ...fontBtn, width: 32, textDecoration: "none",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              } as React.CSSProperties}>
                ⇄
              </Link>
              <button onClick={() => setFontSize((f) => Math.max(13, f - 1))} style={fontBtn}>A-</button>
              <button onClick={() => setFontSize((f) => Math.min(24, f + 1))} style={fontBtn}>A+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Header chapitre + version + marquer lu */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "22px 18px 12px", textAlign: "center" }}>
        <h1 style={{
          fontFamily: F.title, fontSize: "clamp(1.5rem, 5vw, 2rem)",
          fontWeight: 700, color: T.text, margin: "0 0 14px",
          letterSpacing: "0.02em",
        }}>
          {bookFr} <span style={{ color: T.violet }}>{chapter}</span>
        </h1>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Version picker */}
          <div ref={pickerRef} style={{ position: "relative", display: "inline-block" }}>
            <button onClick={() => setShowVersionPicker((v) => !v)} style={{
              background: T.violetSoft, border: `1px solid ${T.violet}`,
              borderRadius: 999, padding: "6px 14px",
              color: T.violet, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: F.body,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              📖 {currentVersion.shortLabel} {currentVersion.year && `· ${currentVersion.year}`}
              <span style={{ fontSize: 10 }}>▾</span>
            </button>
            {showVersionPicker && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", left: "50%",
                transform: "translateX(-50%)",
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                minWidth: 280, zIndex: 100, overflow: "hidden", textAlign: "left",
              }}>
                <div style={pickerSectionLabel}>Versions libres</div>
                {BIBLE_VERSIONS.filter((v) => v.source !== "apibible").map((v) => (
                  <VersionRow key={v.id} version={v} active={v.id === versionId} onClick={() => changeVersion(v.id)} />
                ))}
                <div style={{ ...pickerSectionLabel, borderTop: `1px solid ${T.border}`, marginTop: 4 }}>
                  Versions modernes
                </div>
                {BIBLE_VERSIONS.filter((v) => v.source === "apibible").map((v) => (
                  <VersionRow key={v.id} version={v} active={v.id === versionId} onClick={() => changeVersion(v.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Marquer lu */}
          <button onClick={toggleChapterRead} style={{
            background: isChapterRead ? "#2E9B47" : T.surface2,
            border: `1px solid ${isChapterRead ? "#2E9B47" : T.border}`,
            color: isChapterRead ? "#fff" : T.textSoft,
            borderRadius: 999, padding: "6px 14px",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: F.body,
          }}>
            {isChapterRead ? "✓ Lu" : "Marquer comme lu"}
          </button>
        </div>
      </div>

      {/* Styles mobile nav */}
      <style>{`
        @media (max-width: 639px) {
          .reader-chapter-nav {
            bottom: calc(60px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .reader-chapter-content {
            padding-bottom: calc(160px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
      `}</style>

      {/* Contenu chapitre */}
      <div
        className="reader-chapter-content"
        style={{ maxWidth: 680, margin: "0 auto", padding: "12px 20px 120px" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <style>{`@keyframes ccb-spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              width: 36, height: 36, border: `3px solid ${T.border}`,
              borderTopColor: T.violet, borderRadius: "50%",
              animation: "ccb-spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            <div style={{ color: T.textMuted, fontFamily: F.body, fontSize: 14 }}>
              Chargement — {currentVersion.label}...
            </div>
          </div>
        )}

        {!loading && isApiKeyRequired && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔑</div>
            <div style={{ fontFamily: F.title, fontSize: 17, color: T.text, marginBottom: 8 }}>
              Clé API requise
            </div>
            <p style={{ fontSize: 14, color: T.textMuted, fontFamily: F.body, maxWidth: 340, margin: "0 auto 20px", lineHeight: 1.6 }}>
              La version <strong>{currentVersion.label}</strong> nécessite une clé <strong>API.Bible gratuite</strong>.
            </p>
            <button onClick={() => changeVersion("lsg")} style={btnPrimaryFull}>
              ← Revenir à LSG
            </button>
          </div>
        )}

        {!loading && fetchError && !isApiKeyRequired && (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: F.body, fontSize: 15, color: T.textSoft }}>
              Impossible de charger ce chapitre.
            </div>
            <p style={{ fontSize: 13, color: T.textMuted, marginTop: 8, fontFamily: F.body }}>
              {fetchError}
            </p>
            <button onClick={load} style={{ ...btnPrimaryFull, marginTop: 16, width: "auto", padding: "10px 24px" }}>
              Réessayer
            </button>
          </div>
        )}

        {!loading && !fetchError && verses.length > 0 && (
          <div>
            <p style={{
              fontSize: 11, color: T.textMuted, textAlign: "center",
              marginBottom: 20, fontFamily: F.body,
              fontStyle: "italic",
            }}>
              Appuie sur un verset pour le surligner, sauvegarder, annoter ou partager
            </p>
            <div style={{ lineHeight: 2 }}>
              {verses.map((v) => {
                const hlColor = highlights.get(v.verse);
                const hl = highlightBg(hlColor);
                const isSaved = savedVerseNumbers.has(v.verse);
                const hasNote = notesByVerse.has(v.verse);
                return (
                  <span key={v.verse} onClick={() => setSelectedVerse(v)} style={{ cursor: "pointer", display: "inline" }}>
                    <sup style={{
                      fontSize: "0.58em", color: T.violet, fontWeight: 700,
                      marginRight: 3, marginLeft: 8,
                      fontFamily: F.body, verticalAlign: "super",
                    }}>
                      {v.verse}
                      {isSaved && <span style={{ color: T.gold, marginLeft: 2 }}>⭐</span>}
                      {hasNote && <span style={{ marginLeft: 2 }}>📝</span>}
                    </sup>
                    <span style={{
                      fontSize, color: T.text,
                      background: hl, borderRadius: hl ? 3 : 0,
                      padding: hl ? "0 3px" : 0,
                      transition: "background 0.18s",
                    }}>
                      {v.text}{" "}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="reader-chapter-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: T.card, backdropFilter: "blur(12px)",
        borderTop: `1px solid ${T.border}`, padding: "10px 16px 12px",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 10 }}>
          <button onClick={() => navigate("prev")} disabled={!hasPrev} style={{
            flex: 1, background: hasPrev ? T.surface2 : "transparent",
            border: `1px solid ${hasPrev ? T.border : T.borderSoft}`,
            borderRadius: 12, padding: "13px",
            color: hasPrev ? T.textSoft : T.textMuted,
            fontSize: 13, fontWeight: 600,
            cursor: hasPrev ? "pointer" : "not-allowed",
            fontFamily: F.body,
          }}>
            ← Ch. {chapter - 1}
          </button>
          <button onClick={() => router.push("/bible")} style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "13px 16px",
            color: T.violet, fontSize: 18, cursor: "pointer",
          }} title="Retour à Ma Bible">
            📖
          </button>
          <button onClick={() => navigate("next")} disabled={!hasNext} style={{
            flex: 1,
            background: hasNext
              ? `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`
              : "transparent",
            border: hasNext ? "none" : `1px solid ${T.borderSoft}`,
            borderRadius: 12, padding: "13px",
            color: hasNext ? "#fff" : T.textMuted,
            fontSize: 13, fontWeight: 700,
            cursor: hasNext ? "pointer" : "not-allowed",
            fontFamily: F.body,
          }}>
            Ch. {chapter + 1} →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────
function VersionRow({ version, active, onClick }: {
  version: BibleVersion; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10,
      padding: "9px 14px",
      background: active ? T.violetSoft : "none", border: "none",
      cursor: "pointer", fontFamily: F.body, textAlign: "left",
    }}>
      <span style={{
        minWidth: 50, fontSize: 11, fontWeight: 700,
        color: active ? T.violet : T.textMuted,
        background: active ? T.violetSoft : T.surface2,
        borderRadius: 6, padding: "2px 6px", textAlign: "center",
      }}>
        {version.shortLabel}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: active ? T.violet : T.text, fontWeight: active ? 700 : 500 }}>
          {version.label}
        </div>
        {version.year && (
          <div style={{ fontSize: 11, color: T.textMuted }}>{version.year}</div>
        )}
      </div>
      {active && <span style={{ color: T.violet, fontSize: 14 }}>✓</span>}
    </button>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const fontBtn: React.CSSProperties = {
  background: T.surface2, border: `1px solid ${T.border}`,
  borderRadius: 6, width: 28, height: 28,
  color: T.textSoft, fontSize: 11, cursor: "pointer",
  fontFamily: F.body, fontWeight: 700,
};
const pickerSectionLabel: React.CSSProperties = {
  padding: "10px 14px 4px", fontSize: 10, fontWeight: 700,
  color: T.textMuted, letterSpacing: "0.08em",
  fontFamily: F.body, textTransform: "uppercase",
};
const btnPrimaryFull: React.CSSProperties = {
  background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
  color: "#fff", border: "none", borderRadius: 12,
  padding: "12px", fontWeight: 700, fontSize: 13, cursor: "pointer",
  fontFamily: F.body, width: "100%",
};
const btnSecondaryFull: React.CSSProperties = {
  background: T.surface2, color: T.textSoft, border: `1px solid ${T.border}`,
  borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 13,
  cursor: "pointer", fontFamily: F.body, width: "100%",
};
const collBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
  background: T.bg, border: `1px solid ${T.borderSoft}`, borderRadius: 10,
  color: T.text, fontSize: 13, fontWeight: 600, fontFamily: F.body,
  cursor: "pointer", textAlign: "left", width: "100%",
};
