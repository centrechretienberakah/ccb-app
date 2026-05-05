"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────
interface Prayer {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  is_answered: boolean;
  created_at: string;
  intercessionsCount: number;
  user_profiles?: { display_name: string; avatar_url?: string } | null;
}

// ─── Utilitaires ──────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "a l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function Avatar({ profile, size = 36 }: { profile?: { display_name?: string; avatar_url?: string } | null; size?: number }) {
  const name = profile?.display_name || "?";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  if (profile?.avatar_url) return (
    <img src={profile.avatar_url} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} alt={name} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initials}</div>
  );
}

// ─── Formulaire de soumission ─────────────────────────────────
function PrayerForm({ currentUserProfile, currentUserId, onSubmitted }: {
  currentUserProfile: any; currentUserId: string; onSubmitted: (prayer: Prayer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const remaining = 1000 - content.length;

  async function submit() {
    if (content.trim().length < 10) { setError("La requete doit faire au moins 10 caracteres."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from("prayer_requests")
      .insert({ user_id: currentUserId, content: content.trim(), is_anonymous: isAnonymous })
      .select("id, user_id, content, is_anonymous, is_answered, created_at")
      .single();
    if (e) { setError(e.message); setSaving(false); return; }
    onSubmitted({
      ...data,
      intercessionsCount: 0,
      user_profiles: isAnonymous ? null : currentUserProfile,
    });
    setContent(""); setIsAnonymous(false); setOpen(false); setSaving(false);
  }

  if (!open) return (
    <div onClick={() => setOpen(true)}
      style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 20 }}>
      <Avatar profile={currentUserProfile} size={36} />
      <div style={{ flex: 1, color: "#555", fontSize: 14 }}>Partager une requete de priere avec la communaute...</div>
      <span style={{ fontSize: 20 }}>🙏</span>
    </div>
  );

  return (
    <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#a855f7", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>🙏</span> Nouvelle requete de priere
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Partagez votre besoin de priere... La communaute intercede pour vous."
        rows={4}
        style={{ width: "100%", background: "#0a0a0a", border: "1px solid #222", borderRadius: 10, padding: "10px 14px", color: "#e8e0d0", fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6 }}
      />
      <div style={{ fontSize: 11, color: remaining < 50 ? "#f87171" : "#444", textAlign: "right", marginTop: 4 }}>
        {remaining} caracteres restants
      </div>

      {/* Option anonyme */}
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, cursor: "pointer" }}>
        <div
          onClick={() => setIsAnonymous(!isAnonymous)}
          style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isAnonymous ? "#a855f7" : "#333"}`, background: isAnonymous ? "#a855f7" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
          {isAnonymous && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#e0d8c8", fontWeight: 600 }}>Publier de facon anonyme</div>
          <div style={{ fontSize: 11, color: "#555" }}>Votre nom ne sera pas affiche. La communaute priера quand meme pour vous.</div>
        </div>
      </label>

      {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
        <button onClick={() => setOpen(false)} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: "9px 18px", color: "#888", cursor: "pointer", fontSize: 13 }}>Annuler</button>
        <button onClick={submit} disabled={saving || content.trim().length < 10}
          style={{ background: saving || content.trim().length < 10 ? "#2a1a3a" : "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", borderRadius: 10, padding: "9px 20px", color: saving || content.trim().length < 10 ? "#666" : "#fff", fontWeight: 700, cursor: saving || content.trim().length < 10 ? "not-allowed" : "pointer", fontSize: 13 }}>
          {saving ? "Publication..." : "Partager ma priere"}
        </button>
      </div>
    </div>
  );
}

// ─── Carte de requete de priere ───────────────────────────────
function PrayerCard({ prayer, currentUserId, isInterceding, onIntercede, onMarkAnswered, onDelete }: {
  prayer: Prayer;
  currentUserId: string;
  isInterceding: boolean;
  onIntercede: () => void;
  onMarkAnswered: () => void;
  onDelete: () => void;
}) {
  const [localCount, setLocalCount] = useState(prayer.intercessionsCount);
  const [localInterceding, setLocalInterceding] = useState(isInterceding);
  const isMyPrayer = prayer.user_id === currentUserId;

  function handleIntercede() {
    setLocalInterceding(!localInterceding);
    setLocalCount((c) => localInterceding ? c - 1 : c + 1);
    onIntercede();
  }

  return (
    <div style={{ background: "#111", border: `1px solid ${prayer.is_answered ? "rgba(74,222,128,0.25)" : "#1a1a1a"}`, borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
      {prayer.is_answered && (
        <div style={{ background: "rgba(74,222,128,0.08)", padding: "6px 16px", fontSize: 11, color: "#4ade80", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <span>✅</span> Priere exaucee — Gloire a Dieu !
        </div>
      )}
      <div style={{ padding: 16 }}>
        {/* En-tete */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
          {prayer.is_anonymous ? (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#374151,#4b5563)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🙏</div>
          ) : (
            <Avatar profile={prayer.user_profiles} size={36} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#f0e8d0" }}>
              {prayer.is_anonymous ? "Membre anonyme" : (prayer.user_profiles?.display_name || "Membre")}
            </div>
            <div style={{ fontSize: 11, color: "#555" }}>{timeAgo(prayer.created_at)}</div>
          </div>
          {/* Actions auteur */}
          {isMyPrayer && (
            <div style={{ display: "flex", gap: 4 }}>
              {!prayer.is_answered && (
                <button onClick={onMarkAnswered} title="Marquer comme exaucee"
                  style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 8, padding: "4px 8px", color: "#4ade80", cursor: "pointer", fontSize: 12 }}>✅ Exaucee</button>
              )}
              <button onClick={onDelete} title="Supprimer"
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14, padding: "4px 6px" }}>🗑️</button>
            </div>
          )}
        </div>

        {/* Contenu */}
        <p style={{ fontSize: 14, color: "#e0d8c8", lineHeight: 1.7, margin: "0 0 14px", whiteSpace: "pre-wrap" }}>{prayer.content}</p>

        {/* Bouton intercession */}
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleIntercede}
            style={{ display: "flex", alignItems: "center", gap: 8, background: localInterceding ? "rgba(168,85,247,0.15)" : "#0a0a0a", border: `1px solid ${localInterceding ? "#a855f7" : "#222"}`, borderRadius: 20, padding: "8px 16px", color: localInterceding ? "#a855f7" : "#666", cursor: "pointer", fontSize: 13, fontWeight: localInterceding ? 700 : 400, transition: "all 0.15s" }}>
            <span style={{ fontSize: 16 }}>🙏</span>
            {localInterceding ? "Je prie pour toi" : "Je prie pour toi"}
            {localCount > 0 && (
              <span style={{ background: localInterceding ? "rgba(168,85,247,0.2)" : "#1a1a1a", borderRadius: 20, padding: "1px 8px", fontSize: 12, color: localInterceding ? "#a855f7" : "#888", fontWeight: 600 }}>
                {localCount}
              </span>
            )}
          </button>
          {localCount > 0 && (
            <span style={{ fontSize: 12, color: "#555" }}>
              {localCount === 1 ? "1 personne prie pour cette requete" : `${localCount} personnes prient pour cette requete`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PrayerClient (export principal) ─────────────────────────
export default function PrayerClient({ prayers: initialPrayers, currentUserId, currentUserProfile, myIntercessedIds }: {
  prayers: Prayer[];
  currentUserId: string;
  currentUserProfile: any;
  myIntercessedIds: string[];
}) {
  const [prayers, setPrayers] = useState<Prayer[]>(initialPrayers);
  const [intercessedIds, setIntercessedIds] = useState<Set<string>>(new Set(myIntercessedIds));
  const [filter, setFilter] = useState<"all" | "mine" | "answered">("all");

  function handlePrayerSubmitted(prayer: Prayer) {
    setPrayers((prev) => [prayer, ...prev]);
  }

  async function handleIntercede(prayerId: string) {
    const supabase = createClient();
    if (intercessedIds.has(prayerId)) {
      await supabase.from("prayer_intercessions").delete().eq("prayer_id", prayerId).eq("user_id", currentUserId);
      setIntercessedIds((s) => { const n = new Set(s); n.delete(prayerId); return n; });
    } else {
      await supabase.from("prayer_intercessions").insert({ prayer_id: prayerId, user_id: currentUserId });
      setIntercessedIds((s) => new Set([...s, prayerId]));
    }
  }

  async function handleMarkAnswered(prayerId: string) {
    const supabase = createClient();
    await supabase.from("prayer_requests").update({ is_answered: true }).eq("id", prayerId);
    setPrayers((prev) => prev.map((p) => p.id === prayerId ? { ...p, is_answered: true } : p));
  }

  async function handleDelete(prayerId: string) {
    if (!confirm("Supprimer cette requete de priere ?")) return;
    const supabase = createClient();
    await supabase.from("prayer_requests").delete().eq("id", prayerId);
    setPrayers((prev) => prev.filter((p) => p.id !== prayerId));
  }

  const filtered = prayers.filter((p) => {
    if (filter === "mine") return p.user_id === currentUserId;
    if (filter === "answered") return p.is_answered;
    return true;
  });

  const totalPriants = prayers.reduce((acc, p) => acc + p.intercessionsCount, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", fontFamily: "'Inter', sans-serif" }}>
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 80px" }}>
      {/* Top nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, background: "#111", border: "1px solid #222", borderRadius: 10, padding: "7px 14px", color: "#888", fontSize: 13, textDecoration: "none" }}>
          ← Accueil
        </a>
        <a href="/community" style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: "7px 14px", color: "#888", fontSize: 13, textDecoration: "none" }}>
          Communauté
        </a>
      </div>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24, paddingTop: 8 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🙏</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f0e8d0", letterSpacing: -0.5 }}>Mur d'Intercession</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#666" }}>
          Portez-vous les uns les autres dans la priere — Gal 6:2
        </p>
        {totalPriants > 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 20, padding: "4px 14px", marginTop: 10, fontSize: 12, color: "#a855f7" }}>
            <span>🙏</span> {totalPriants} intercession{totalPriants > 1 ? "s" : ""} offertes a ce jour
          </div>
        )}
      </div>

      {/* Formulaire */}
      <PrayerForm
        currentUserProfile={currentUserProfile}
        currentUserId={currentUserId}
        onSubmitted={handlePrayerSubmitted}
      />

      {/* Filtres */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {([["all", "Toutes"], ["mine", "Mes requetes"], ["answered", "Exaucees"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ flexShrink: 0, background: filter === key ? "rgba(168,85,247,0.15)" : "#111", border: `1px solid ${filter === key ? "#a855f7" : "#222"}`, borderRadius: 20, padding: "6px 14px", color: filter === key ? "#a855f7" : "#666", fontSize: 12, fontWeight: filter === key ? 700 : 400, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Liste des requetes */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🕊️</div>
          <div style={{ color: "#555", fontSize: 14 }}>
            {filter === "answered" ? "Aucune priere exaucee pour l'instant." : filter === "mine" ? "Vous n'avez pas encore soumis de requete." : "Aucune requete de priere pour l'instant."}
          </div>
        </div>
      ) : (
        filtered.map((prayer) => (
          <PrayerCard
            key={prayer.id}
            prayer={prayer}
            currentUserId={currentUserId}
            isInterceding={intercessedIds.has(prayer.id)}
            onIntercede={() => handleIntercede(prayer.id)}
            onMarkAnswered={() => handleMarkAnswered(prayer.id)}
            onDelete={() => handleDelete(prayer.id)}
          />
        ))
      )}
    </div>
    </div>
  );
}
