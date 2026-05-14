"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface GroupRow {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  cover_url?: string | null;
  is_private?: boolean;
  max_members?: number | null;
  member_count?: number;
}

interface MemberOption {
  id: string;
  full_name: string;
}

interface Props {
  initialGroups: Record<string, unknown>[];
  members: { id: string; full_name: string }[];
}

const card: React.CSSProperties = { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "block", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" };
const btn: React.CSSProperties = { padding: "0.5rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--gold)", color: "#000", borderColor: "var(--gold)", fontWeight: 700 };
const btnDanger: React.CSSProperties = { ...btn, background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.4)", color: "#fca5a5" };

const TYPES = [
  { value: "cell",      label: "Cellule" },
  { value: "prayer",    label: "Prière" },
  { value: "study",     label: "Étude biblique" },
  { value: "mentoring", label: "Mentorat" },
  { value: "team",      label: "Équipe" },
];

export default function GroupsTab({ initialGroups, members }: Props) {
  const [groups, setGroups] = useState<GroupRow[]>(initialGroups as unknown as GroupRow[]);
  const [editing, setEditing] = useState<GroupRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "cell",
    cover_url: "",
    is_private: false,
    max_members: 20,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const resetForm = () => {
    setForm({ name: "", description: "", type: "cell", cover_url: "", is_private: false, max_members: 20 });
    setCoverFile(null);
    setCoverPreview(null);
    setSelectedMembers([]);
    setMemberSearch("");
    setEditing(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = async (g: GroupRow) => {
    resetForm();
    setEditing(g);
    setForm({
      name: g.name || "",
      description: g.description ?? "",
      type: g.type ?? "cell",
      cover_url: g.cover_url ?? "",
      is_private: !!g.is_private,
      max_members: g.max_members ?? 20,
    });
    setCoverPreview(g.cover_url || null);

    // Pré-charge les membres existants
    const sb = createClient();
    const { data } = await sb.from("group_members").select("user_id").eq("group_id", g.id);
    setSelectedMembers((data ?? []).map((m: any) => m.user_id));
    setShowForm(true);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("error", "Image trop lourde (max 5 Mo)"); return; }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadCover = async (sb: ReturnType<typeof createClient>): Promise<string | null> => {
    if (!coverFile) return form.cover_url || null;
    setUploadingCover(true);
    try {
      const ext = coverFile.name.split(".").pop() || "jpg";
      const path = `group-covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await sb.storage.from("avatars").upload(path, coverFile, { upsert: true, contentType: coverFile.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = sb.storage.from("avatars").getPublicUrl(path);
      return publicUrl;
    } finally {
      setUploadingCover(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("error", "Nom requis"); return; }
    setSaving(true);
    const sb = createClient();

    try {
      // 1. Upload cover si nécessaire
      let coverUrl: string | null = form.cover_url || null;
      if (coverFile) {
        coverUrl = await uploadCover(sb);
      }

      // 2. Upsert group
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.type,
        cover_url: coverUrl,
        is_private: form.is_private,
        max_members: form.max_members,
      };

      let groupId: string;
      if (editing) {
        const { error } = await sb.from("groups").update(payload).eq("id", editing.id);
        if (error) throw error;
        groupId = editing.id;
      } else {
        const { data, error } = await sb.from("groups").insert(payload).select().single();
        if (error) throw error;
        groupId = data.id;
      }

      // 3. Sync membres (en mode édition, on diff ; en création, on insère tout)
      if (editing) {
        // Charge les membres actuels
        const { data: current } = await sb.from("group_members").select("user_id").eq("group_id", groupId);
        const currentIds = new Set((current ?? []).map((m: any) => m.user_id));
        const newIds = new Set(selectedMembers);
        const toAdd = selectedMembers.filter((id) => !currentIds.has(id));
        const toRemove = [...currentIds].filter((id) => !newIds.has(id));
        if (toAdd.length > 0) {
          await sb.from("group_members").insert(toAdd.map((uid) => ({ group_id: groupId, user_id: uid, role: "member" })));
        }
        if (toRemove.length > 0) {
          await sb.from("group_members").delete().eq("group_id", groupId).in("user_id", toRemove);
        }
      } else if (selectedMembers.length > 0) {
        await sb.from("group_members").insert(
          selectedMembers.map((uid) => ({ group_id: groupId, user_id: uid, role: "member" }))
        );
      }

      // 4. Refresh ligne dans le tableau
      const updated: GroupRow = {
        id: groupId,
        ...payload,
        member_count: selectedMembers.length,
      } as GroupRow;
      if (editing) {
        setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...updated } : g)));
        showToast("success", "Groupe modifié ✓");
      } else {
        setGroups((prev) => [updated, ...prev]);
        showToast("success", "Groupe créé ✓");
      }

      setShowForm(false);
      resetForm();
    } catch (e: any) {
      showToast("error", e?.message ?? "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: GroupRow) => {
    if (!confirm(`Supprimer "${g.name}" et tous ses membres ?`)) return;
    const sb = createClient();
    const { error } = await sb.from("groups").delete().eq("id", g.id);
    if (error) { showToast("error", error.message); return; }
    setGroups((prev) => prev.filter((x) => x.id !== g.id));
    showToast("success", "Supprimé ✓");
  };

  const filteredMembers: MemberOption[] = memberSearch
    ? members.filter((m) => m.full_name.toLowerCase().includes(memberSearch.toLowerCase()))
    : members;

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>🤝 Groupes / Cellules <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.85rem" }}>({groups.length})</span></h3>
        <button style={btnPrimary} onClick={openNew}>+ Nouveau groupe</button>
      </div>

      {msg && (
        <div style={{ padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", background: msg.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(248,113,113,0.15)", color: msg.type === "success" ? "#86efac" : "#fca5a5", fontSize: "0.85rem" }}>
          {msg.text}
        </div>
      )}

      {showForm && (
        <div style={{ ...card, background: "var(--surface)", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <h4 style={{ margin: 0 }}>{editing ? "Modifier" : "Nouveau groupe"}</h4>

          {/* Miniature */}
          <div>
            <label style={labelStyle}>Miniature du groupe</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 96, height: 96, borderRadius: "var(--radius-lg)",
                  background: coverPreview ? `url(${coverPreview}) center/cover` : "var(--card-bg)",
                  border: "2px dashed var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 28, color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                {!coverPreview && "📷"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  style={{ display: "none" }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} style={btn}>
                  {coverPreview ? "Changer l'image" : "Sélectionner une image"}
                </button>
                {coverPreview && (
                  <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); setForm((f) => ({ ...f, cover_url: "" })); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ ...btn, color: "#f87171" }}>
                    Retirer
                  </button>
                )}
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>JPG/PNG, 5 Mo max</span>
              </div>
            </div>
          </div>

          {/* Nom */}
          <div>
            <label style={labelStyle}>Nom *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Cellule de quartier Sud" style={inputStyle} />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Présentation du groupe…" style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
          </div>

          {/* Type + Privé + Max */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Max membres</label>
              <input type="number" min={1} max={500} value={form.max_members} onChange={(e) => setForm({ ...form, max_members: parseInt(e.target.value || "20") })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Confidentialité</label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-primary)", fontSize: "0.85rem", marginTop: 4 }}>
                <input type="checkbox" checked={form.is_private} onChange={(e) => setForm({ ...form, is_private: e.target.checked })} />
                Privé
              </label>
            </div>
          </div>

          {/* Sélection des membres */}
          <div>
            <label style={labelStyle}>Membres à ajouter ({selectedMembers.length} sélectionné{selectedMembers.length > 1 ? "s" : ""})</label>
            <input
              type="text"
              placeholder="Rechercher un membre…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              style={{ ...inputStyle, marginBottom: "0.4rem" }}
            />
            <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--card-bg)" }}>
              {filteredMembers.length === 0 ? (
                <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Aucun membre trouvé.</div>
              ) : (
                filteredMembers.map((m) => (
                  <label
                    key={m.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.5rem 0.75rem", cursor: "pointer",
                      background: selectedMembers.includes(m.id) ? "rgba(212,175,55,0.08)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={() => toggleMember(m.id)} />
                    <span style={{ fontSize: "0.88rem" }}>{m.full_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleSave} disabled={saving || uploadingCover} style={{ ...btnPrimary, opacity: saving || uploadingCover ? 0.6 : 1 }}>
              {uploadingCover ? "Upload..." : saving ? "..." : (editing ? "Enregistrer" : "Créer le groupe")}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={btn}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste des groupes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
        {groups.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Aucun groupe.</div>
        ) : (
          groups.map((g) => (
            <div key={g.id} style={{ ...card, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{
                height: 90,
                background: g.cover_url ? `url(${g.cover_url}) center/cover` : "linear-gradient(135deg, var(--gold), #7c3aed)",
                display: "flex", alignItems: "flex-end", padding: "0.5rem 0.75rem",
              }}>
                {g.is_private && <span style={{ background: "rgba(0,0,0,0.5)", color: "#fff", padding: "0.15rem 0.5rem", borderRadius: "9999px", fontSize: "0.65rem", fontWeight: 700 }}>🔒 PRIVÉ</span>}
              </div>
              <div style={{ padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{g.name}</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{g.type ?? "—"}</span>
                </div>
                {g.description && <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{g.description.slice(0, 90)}{g.description.length > 90 ? "…" : ""}</span>}
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>👥 {g.member_count ?? 0} membre{(g.member_count ?? 0) > 1 ? "s" : ""}{g.max_members ? ` / ${g.max_members}` : ""}</span>
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto" }}>
                  <button onClick={() => openEdit(g)} style={{ ...btn, flex: 1, padding: "0.35rem 0.6rem", fontSize: "0.78rem" }}>Modifier</button>
                  <button onClick={() => handleDelete(g)} style={{ ...btnDanger, padding: "0.35rem 0.6rem", fontSize: "0.78rem" }}>🗑</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
