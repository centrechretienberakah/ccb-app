"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUPS_THEME as T, GROUPS_FONTS as F, GROUP_CATEGORIES } from "@/lib/groups/theme";
import { notifyRequestApproved, notifyNewMember } from "@/lib/groups/notify";

interface UserCandidate {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  type: "public" | "private";
  category: string | null;
  created_by: string;
}
interface Member {
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
}
interface JoinRequest {
  id: string;
  user_id: string;
  message: string | null;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  group: Group;
  members: Member[];
  myRole: "owner" | "admin" | "member";
  currentUserId: string;
  joinRequests: JoinRequest[];
}

export default function GroupSettingsClient({ group, members: initialMembers, myRole, currentUserId, joinRequests: initialRequests }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [requests, setRequests] = useState<JoinRequest[]>(initialRequests);
  const [busyReq, setBusyReq] = useState<Set<string>>(new Set());

  // — Ajout de membres (recherche + ajout)
  const [addSearch, setAddSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSearchChange(value: string) {
    setAddSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(() => { void runSearch(value); }, 250);
  }

  async function runSearch(q: string) {
    setSearching(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("groups_search_users", {
        p_group_id: group.id,
        p_query: q,
      });
      if (error) { flash("Recherche : " + error.message); setSearchResults([]); return; }
      setSearchResults((data ?? []) as UserCandidate[]);
    } finally {
      setSearching(false);
    }
  }

  async function addMember(candidate: UserCandidate) {
    if (addingId) return;
    setAddingId(candidate.user_id);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("groups_add_member", {
        p_group_id: group.id,
        p_user_id: candidate.user_id,
        p_role: "member",
      });
      if (error) { flash("Erreur : " + error.message); return; }
      // Ajoute localement
      setMembers((prev) => prev.some((m) => m.user_id === candidate.user_id)
        ? prev
        : [...prev, {
            user_id: candidate.user_id,
            role: "member",
            joined_at: new Date().toISOString(),
            display_name: candidate.display_name,
            avatar_url: candidate.avatar_url,
          }]);
      // Retire des résultats
      setSearchResults((prev) => prev.filter((u) => u.user_id !== candidate.user_id));
      flash(`✓ ${candidate.display_name ?? "Membre"} ajouté`);
      // Notif au nouvel arrivant + aux admins
      void notifyRequestApproved({
        groupId: group.id, groupName: group.name, userId: candidate.user_id,
      });
      void notifyNewMember({
        groupId: group.id, groupName: group.name,
        newMemberName: candidate.display_name ?? "Un nouveau membre",
      });
    } finally {
      setAddingId(null);
    }
  }

  async function approveRequest(r: JoinRequest) {
    if (busyReq.has(r.id)) return;
    setBusyReq((p) => new Set(p).add(r.id));
    const supabase = createClient();
    const { error } = await supabase.rpc("groups_approve_request", { p_request_id: r.id });
    setBusyReq((p) => { const n = new Set(p); n.delete(r.id); return n; });
    if (error) { flash("Erreur : " + error.message); return; }
    // Ajoute le membre localement
    setMembers((prev) => prev.some((m) => m.user_id === r.user_id)
      ? prev
      : [...prev, {
          user_id: r.user_id, role: "member",
          joined_at: new Date().toISOString(),
          display_name: r.display_name, avatar_url: r.avatar_url,
        }]);
    setRequests((prev) => prev.filter((x) => x.id !== r.id));
    flash(`✓ ${r.display_name ?? "Demande"} approuvée`);
    // Notifs : au demandeur + aux autres admins
    void notifyRequestApproved({
      groupId: group.id, groupName: group.name, userId: r.user_id,
    });
    void notifyNewMember({
      groupId: group.id, groupName: group.name,
      newMemberName: r.display_name ?? "Un nouveau membre",
    });
  }

  async function rejectRequest(r: JoinRequest) {
    if (busyReq.has(r.id)) return;
    if (!confirm(`Refuser la demande de ${r.display_name ?? "ce membre"} ?`)) return;
    setBusyReq((p) => new Set(p).add(r.id));
    const supabase = createClient();
    const { error } = await supabase.rpc("groups_reject_request", { p_request_id: r.id });
    setBusyReq((p) => { const n = new Set(p); n.delete(r.id); return n; });
    if (error) { flash("Erreur : " + error.message); return; }
    setRequests((prev) => prev.filter((x) => x.id !== r.id));
    flash("Demande refusée");
  }
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [type, setType] = useState<"public" | "private">(group.type);
  const [category, setCategory] = useState<string>(group.category ?? "general");
  const [coverUrl, setCoverUrl] = useState(group.cover_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isOwner = myRole === "owner";

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function uploadCover(file: File) {
    if (file.size > 5 * 1024 * 1024) { flash("Image trop grosse (max 5 Mo)"); return; }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `groups/${group.id}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("posts").upload(path, file);
      if (upErr) { flash("Erreur upload : " + upErr.message); return; }
      const { data } = supabase.storage.from("posts").getPublicUrl(path);
      setCoverUrl(data.publicUrl);
      flash("Cover prête — n'oublie pas de sauvegarder !");
    } finally {
      setUploading(false);
    }
  }

  async function saveGroup() {
    if (!name.trim() || name.trim().length < 2) { flash("Le nom doit faire au moins 2 caractères."); return; }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("groups").update({
      name: name.trim(),
      description: description.trim() || null,
      type, category,
      cover_url: coverUrl || null,
    }).eq("id", group.id);
    setSaving(false);
    if (error) { flash("Erreur : " + error.message); return; }
    flash("✅ Groupe mis à jour !");
    router.refresh();
  }

  async function promoteMember(member: Member) {
    if (!confirm(`Promouvoir ${member.display_name || "ce membre"} comme admin ?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("group_members")
      .update({ role: "admin" })
      .eq("group_id", group.id).eq("user_id", member.user_id);
    if (error) { flash("Erreur : " + error.message); return; }
    setMembers((prev) => prev.map((m) =>
      m.user_id === member.user_id ? { ...m, role: "admin" } : m,
    ));
    flash("✅ Promu admin");
  }

  async function demoteMember(member: Member) {
    if (!confirm(`Retirer le rôle admin à ${member.display_name || "ce membre"} ?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("group_members")
      .update({ role: "member" })
      .eq("group_id", group.id).eq("user_id", member.user_id);
    if (error) { flash("Erreur : " + error.message); return; }
    setMembers((prev) => prev.map((m) =>
      m.user_id === member.user_id ? { ...m, role: "member" } : m,
    ));
    flash("Rétrogradé en membre");
  }

  async function kickMember(member: Member) {
    if (!confirm(`Retirer ${member.display_name || "ce membre"} du groupe ?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("group_members").delete()
      .eq("group_id", group.id).eq("user_id", member.user_id);
    if (error) { flash("Erreur : " + error.message); return; }
    setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    flash("Membre retiré");
  }

  async function deleteGroup() {
    if (!confirm(`Supprimer DÉFINITIVEMENT le groupe « ${group.name} » ? Tous les messages et fichiers seront perdus.`)) return;
    if (!confirm("Es-tu vraiment sûr ? Cette action est irréversible.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("groups").delete().eq("id", group.id);
    if (error) { flash("Erreur : " + error.message); return; }
    flash("Groupe supprimé.");
    router.push("/community/groups");
  }

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: F.body }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: T.violet, color: "#fff", padding: "10px 20px",
          borderRadius: 999, fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: T.shadowMd,
        }}>{toast}</div>
      )}

      {/* Hero */}
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
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
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
            ⚙️ Paramètres du groupe
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 48px" }}>

        {/* Section : Informations */}
        <Section title="📝 Informations">
          <div style={{ marginBottom: 12 }}>
            <Label>NOM</Label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Label>DESCRIPTION</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} style={{ ...inputStyle, resize: "vertical" } as React.CSSProperties} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>TYPE</Label>
              <select value={type} onChange={(e) => setType(e.target.value as "public" | "private")}
                style={inputStyle}>
                <option value="public">🌍 Public</option>
                <option value="private">🔒 Privé</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>CATÉGORIE</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                {GROUP_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>IMAGE DE COUVERTURE</Label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {coverUrl ? (
                <div style={{
                  width: 80, height: 80, borderRadius: 10, overflow: "hidden", flexShrink: 0,
                  background: `url(${coverUrl}) center/cover`,
                }} />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: 10, flexShrink: 0,
                  background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center",
                  color: T.textMuted, fontSize: 22,
                }}>🖼️</div>
              )}
              <div style={{ flex: 1 }}>
                <input type="file" accept="image/*" id="ccb-cover-input" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
                <label htmlFor="ccb-cover-input" style={{
                  display: "inline-block",
                  background: T.violetSoft, color: T.violet, border: `1px solid ${T.violet}`,
                  borderRadius: 10, padding: "8px 14px",
                  cursor: uploading ? "wait" : "pointer", fontSize: 12, fontWeight: 700,
                  fontFamily: F.body,
                }}>
                  {uploading ? "⏳ Upload..." : (coverUrl ? "Changer l'image" : "Choisir une image")}
                </label>
                {coverUrl && (
                  <button onClick={() => setCoverUrl("")} style={{
                    background: "none", border: "none", marginLeft: 8,
                    color: T.textMuted, cursor: "pointer", fontSize: 12,
                  }}>
                    Retirer
                  </button>
                )}
              </div>
            </div>
          </div>
          <button onClick={saveGroup} disabled={saving} style={{
            ...btnPrimary,
            opacity: saving ? 0.6 : 1, cursor: saving ? "wait" : "pointer",
          }}>
            {saving ? "Sauvegarde…" : "💾 Enregistrer les modifications"}
          </button>
        </Section>

        {/* Section : Demandes d'accès pendantes */}
        {requests.length > 0 && (
          <Section title={`📨 Demandes d'accès (${requests.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {requests.map((r) => {
                const initials = (r.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const isBusy = busyReq.has(r.id);
                return (
                  <div key={r.id} style={{
                    display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 10, alignItems: "center",
                    padding: "10px 12px",
                    background: "rgba(212,175,55,0.06)",
                    border: `1px solid ${T.gold}`,
                    borderRadius: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 999,
                      background: r.avatar_url
                        ? `url(${r.avatar_url}) center/cover`
                        : `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: 13,
                    }}>{!r.avatar_url && initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text }}>
                        {r.display_name || "Membre"}
                      </div>
                      {r.message ? (
                        <div style={{
                          fontSize: 11.5, color: T.textSoft, fontStyle: "italic", marginTop: 2,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>« {r.message} »</div>
                      ) : null}
                      <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>
                        {new Date(r.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => approveRequest(r)} disabled={isBusy} style={{
                        padding: "6px 12px", background: T.violet, color: "#fff",
                        border: "none", borderRadius: 999,
                        fontSize: 11.5, fontWeight: 700,
                        cursor: isBusy ? "wait" : "pointer", fontFamily: F.body,
                      }}>✓ Approuver</button>
                      <button onClick={() => rejectRequest(r)} disabled={isBusy} style={{
                        padding: "6px 12px", background: T.card, color: "#C24B7A",
                        border: `1px solid ${T.border}`, borderRadius: 999,
                        fontSize: 11.5, fontWeight: 700,
                        cursor: isBusy ? "wait" : "pointer", fontFamily: F.body,
                      }}>✕ Refuser</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Section : Ajouter des membres */}
        <Section title="➕ Ajouter des membres">
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
            Recherche un membre du Centre Chrétien Berakah par son nom ou sa ville,
            puis clique sur <strong style={{ color: T.violet }}>Ajouter</strong>.
          </div>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <input
              value={addSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="🔎 Tape un nom (ex: « jean »)…"
              style={{ ...inputStyle, paddingLeft: 14 }}
            />
            {searching && (
              <div style={{
                position: "absolute", right: 12, top: "50%",
                transform: "translateY(-50%)", color: T.textMuted, fontSize: 11,
              }}>⏳</div>
            )}
          </div>
          {searchResults.length === 0 && addSearch.trim() && !searching && (
            <div style={{
              fontSize: 12, color: T.textMuted, fontStyle: "italic",
              padding: "10px 4px",
            }}>
              Aucun résultat (ou tous déjà membres).
            </div>
          )}
          {searchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {searchResults.map((u) => {
                const initials = (u.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const busy = addingId === u.user_id;
                return (
                  <div key={u.user_id} style={{
                    display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 10, alignItems: "center",
                    padding: "8px 10px",
                    background: T.bg, border: `1px solid ${T.borderSoft}`, borderRadius: 10,
                  }}>
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt={u.display_name || ""}
                        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: "#fff",
                      }}>{initials}</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text }}>
                        {u.display_name || "Membre"}
                      </div>
                      {(u.city || u.country) && (
                        <div style={{ fontSize: 11, color: T.textMuted }}>
                          {[u.city, u.country].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <button onClick={() => addMember(u)} disabled={busy} style={{
                      padding: "6px 14px",
                      background: busy ? T.textMuted : T.violet,
                      color: "#fff", border: "none", borderRadius: 999,
                      fontSize: 11.5, fontWeight: 700,
                      cursor: busy ? "wait" : "pointer", fontFamily: F.body,
                      whiteSpace: "nowrap",
                    }}>
                      {busy ? "⏳ Ajout…" : "+ Ajouter"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {!addSearch.trim() && (
            <div style={{
              fontSize: 11.5, color: T.textMuted,
              padding: "4px 2px",
            }}>
              💡 Astuce : tape le début du nom pour voir les suggestions.
            </div>
          )}
        </Section>

        {/* Section : Membres */}
        <Section title={`👥 Membres (${members.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map((m) => {
              const isMe = m.user_id === currentUserId;
              const isCreator = group.created_by === m.user_id;
              const canManage = isOwner && !isMe && !isCreator;
              const initials = (m.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={m.user_id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px",
                  background: T.bg, border: `1px solid ${T.borderSoft}`,
                  borderRadius: 10,
                }}>
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt={m.display_name || ""}
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: "#fff",
                    }}>{initials}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: T.text,
                      display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                    }}>
                      {m.display_name || "Membre"}
                      {isMe && <span style={{ color: T.violet, fontSize: 10 }}>· VOUS</span>}
                      {m.role === "owner" && <span style={{
                        background: T.gold, color: "#111", padding: "1px 7px",
                        borderRadius: 999, fontSize: 9, fontWeight: 700,
                      }}>👑 Owner</span>}
                      {m.role === "admin" && <span style={{
                        background: T.violetSoft, color: T.violet, padding: "1px 7px",
                        borderRadius: 999, fontSize: 9, fontWeight: 700,
                      }}>🛡️ Admin</span>}
                    </div>
                  </div>
                  {canManage && (
                    <div style={{ display: "flex", gap: 4 }}>
                      {m.role === "member" && (
                        <button onClick={() => promoteMember(m)} title="Promouvoir admin" style={iconBtn(T.violet)}>
                          ⬆️
                        </button>
                      )}
                      {m.role === "admin" && (
                        <button onClick={() => demoteMember(m)} title="Rétrograder en membre" style={iconBtn(T.textMuted)}>
                          ⬇️
                        </button>
                      )}
                      <button onClick={() => kickMember(m)} title="Retirer du groupe" style={iconBtn("#C24B7A")}>
                        🚫
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* Section : Danger zone (owner uniquement) */}
        {isOwner && (
          <Section title="⚠️ Zone dangereuse" danger>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
              Supprimer le groupe est irréversible. Tous les messages et fichiers seront perdus.
            </div>
            <button onClick={deleteGroup} style={{
              background: "#C24B7A", color: "#fff",
              border: "none", borderRadius: 10, padding: "9px 18px",
              fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: F.body,
            }}>
              🗑 Supprimer définitivement le groupe
            </button>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${danger ? "rgba(194,75,122,0.4)" : T.border}`,
      borderRadius: 14, padding: 16, marginBottom: 14,
      boxShadow: T.shadowSoft,
    }}>
      <h2 style={{
        fontFamily: F.title, fontSize: 14, fontWeight: 700,
        color: danger ? "#C24B7A" : T.violet, margin: "0 0 12px",
        letterSpacing: "0.05em", textTransform: "uppercase",
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: T.textMuted,
      marginBottom: 4, letterSpacing: 0.4, textTransform: "uppercase",
    }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 12px",
  background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
  color: T.text, fontSize: 13, fontFamily: F.body, outline: "none",
};
const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
  border: "none", borderRadius: 10, padding: "10px 20px",
  color: "#fff", fontWeight: 700, fontSize: 13,
  cursor: "pointer", fontFamily: F.body,
};
function iconBtn(color: string): React.CSSProperties {
  return {
    background: "transparent", border: `1px solid ${color}55`,
    borderRadius: 8, padding: "5px 9px",
    color, fontSize: 13, cursor: "pointer", fontFamily: F.body,
  };
}
