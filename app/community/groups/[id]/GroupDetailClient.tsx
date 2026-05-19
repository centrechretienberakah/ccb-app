"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUPS_THEME as T, GROUPS_FONTS as F, getGroupCategoryDef, notifyGroupsStaff } from "@/lib/groups/theme";
import { getMentionedUserIds, renderSegments, type MemberLookup } from "@/lib/community/mentions";
import MentionTextarea from "@/components/community/MentionTextarea";

interface Group {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  type: "public" | "private";
  category: string | null;
  created_by: string;
  created_at: string;
}
interface Member {
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
}
interface Profile { user_id: string; display_name: string | null; avatar_url: string | null }
interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  user_profiles: Profile | null;
  attachment_url?: string | null;
  attachment_type?: "image" | "pdf" | "audio" | "video" | "other" | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
}

interface Props {
  group: Group;
  members: Member[];
  initialMessages: Message[];
  currentUserId: string;
  currentUserProfile: Profile | null;
  isMember: boolean;
  myRole: "owner" | "admin" | "member" | null;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

function Avatar({ profile, size = 32 }: { profile?: Profile | null; size?: number }) {
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profile.avatar_url} alt={profile.display_name || ""}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  const initials = (profile?.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
    }}>{initials}</div>
  );
}

export default function GroupDetailClient({
  group, members: initialMembers, initialMessages,
  currentUserId, currentUserProfile, isMember: initialIsMember, myRole: initialMyRole,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isMember, setIsMember] = useState(initialIsMember);
  const [myRole, setMyRole] = useState<"owner" | "admin" | "member" | null>(initialMyRole);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string; type: "image" | "pdf" | "audio" | "video" | "other"; name: string; size: number;
  } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const catDef = getGroupCategoryDef(group.category);
  const memberLookup: MemberLookup[] = members.map((m) => ({
    user_id: m.user_id, display_name: m.display_name, avatar_url: m.avatar_url,
  }));

  // Realtime — nouveaux messages
  useEffect(() => {
    if (!isMember && group.type !== "public") return;
    const supabase = createClient();
    const ch = supabase
      .channel(`ccb-group-${group.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "group_messages",
        filter: `group_id=eq.${group.id}`,
      }, async (payload) => {
        const row = payload.new as Omit<Message, "user_profiles">;
        // Évite les doublons (self-insert déjà inséré localement)
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          // Trouve profil dans members
          const profile = members.find((m) => m.user_id === row.user_id);
          const userProfile: Profile | null = profile ? {
            user_id: profile.user_id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          } : null;
          return [...prev, { ...row, user_profiles: userProfile }];
        });
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "group_messages",
        filter: `group_id=eq.${group.id}`,
      }, (payload) => {
        const id = (payload.old as { id: string }).id;
        setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };

  }, [group.id, isMember, group.type]);

  // Auto-scroll en bas à chaque nouveau message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  // Messages filtrés par recherche
  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return messages.filter((m) => {
      const haystack = `${m.content} ${m.user_profiles?.display_name ?? ""} ${m.attachment_name ?? ""}`
        .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return haystack.includes(q);
    });
  }, [messages, search]);

  function detectAttachmentType(file: File): "image" | "pdf" | "audio" | "video" | "other" {
    if (file.type.startsWith("image/")) return "image";
    if (file.type === "application/pdf") return "pdf";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("video/")) return "video";
    return "other";
  }

  async function uploadFile(file: File) {
    if (file.size > 25 * 1024 * 1024) {
      flash("Fichier trop volumineux (max 25 Mo)");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "bin";
      const path = `groups/${group.id}/${Date.now()}-${currentUserId}.${ext}`;
      const { error: upErr } = await supabase.storage.from("posts").upload(path, file);
      if (upErr) { flash("Erreur upload : " + upErr.message); setUploading(false); return; }
      const { data } = supabase.storage.from("posts").getPublicUrl(path);
      setPendingAttachment({
        url: data.publicUrl,
        type: detectAttachmentType(file),
        name: file.name,
        size: file.size,
      });
    } finally {
      setUploading(false);
    }
  }

  async function joinGroup() {
    const supabase = createClient();
    const { error } = await supabase.from("group_members").insert({
      group_id: group.id, user_id: currentUserId, role: "member",
    });
    if (error) { flash("Erreur : " + error.message); return; }
    setIsMember(true);
    setMyRole("member");
    if (currentUserProfile) {
      setMembers((prev) => [...prev, {
        user_id: currentUserId, role: "member",
        joined_at: new Date().toISOString(),
        display_name: currentUserProfile.display_name,
        avatar_url: currentUserProfile.avatar_url,
      }]);
    }
    flash("✅ Tu as rejoint le groupe !");
  }

  async function startMeeting() {
    // Notif push aux autres membres (best-effort, n'échoue pas si KO)
    const otherMembers = members.filter((m) => m.user_id !== currentUserId).map((m) => m.user_id);
    if (otherMembers.length > 0) {
      const author = currentUserProfile?.display_name || "Un membre";
      try {
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `🎥 ${author} démarre une réunion`,
            body: `Rejoins « ${group.name} » maintenant`,
            url: `/community/groups/${group.id}/meeting`,
            audience: "user_ids",
            userIds: otherMembers,
          }),
        });
      } catch { /* noop */ }
    }
    // Notif staff
    notifyGroupsStaff(
      `🎥 Réunion lancée : ${group.name}`,
      `${currentUserProfile?.display_name || "Un membre"} démarre une réunion`,
      `/community/groups/${group.id}/meeting`,
    );
    router.push(`/community/groups/${group.id}/meeting`);
  }

  async function leaveGroup() {
    if (!confirm("Quitter ce groupe ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("group_members").delete()
      .eq("group_id", group.id).eq("user_id", currentUserId);
    if (error) { flash("Erreur : " + error.message); return; }
    setIsMember(false);
    setMyRole(null);
    setMembers((prev) => prev.filter((m) => m.user_id !== currentUserId));
    flash("Tu as quitté le groupe.");
    router.push("/community/groups");
  }

  async function sendMessage() {
    const t = text.trim();
    if ((!t && !pendingAttachment) || sending) return;
    setSending(true);
    const supabase = createClient();
    const insertPayload: Record<string, unknown> = {
      group_id: group.id, user_id: currentUserId, content: t,
    };
    if (pendingAttachment) {
      insertPayload.attachment_url = pendingAttachment.url;
      insertPayload.attachment_type = pendingAttachment.type;
      insertPayload.attachment_name = pendingAttachment.name;
      insertPayload.attachment_size = pendingAttachment.size;
    }
    const { data, error } = await supabase.from("group_messages")
      .insert(insertPayload)
      .select("id, group_id, user_id, content, reply_to_id, created_at, edited_at, attachment_url, attachment_type, attachment_name, attachment_size")
      .single();
    if (error) { flash("Erreur : " + error.message); setSending(false); return; }
    const row = data as Omit<Message, "user_profiles">;
    setMessages((prev) => [...prev, { ...row, user_profiles: currentUserProfile }]);
    setText("");
    setPendingAttachment(null);
    setSending(false);

    // Notif staff sur premier message du groupe (seuil simple : count actuel == 0 avant)
    if (messages.length === 0) {
      notifyGroupsStaff(
        `💬 Premier message dans : ${group.name}`,
        t.slice(0, 120),
        `/community/groups/${group.id}`,
      );
    }

    // Notif mentions
    const mentionedIds = getMentionedUserIds(t, memberLookup);
    if (mentionedIds.length > 0) {
      const authorName = currentUserProfile?.display_name || "Un membre";
      try {
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `🔔 ${authorName} t'a mentionné dans ${group.name}`,
            body: t.slice(0, 140),
            url: `/community/groups/${group.id}`,
            audience: "user_ids",
            userIds: mentionedIds.filter((uid) => uid !== currentUserId),
          }),
        });
      } catch { /* noop */ }
    }
  }

  async function deleteMessage(messageId: string) {
    if (!confirm("Supprimer ce message ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("group_messages").delete().eq("id", messageId);
    if (error) { flash("Erreur : " + error.message); return; }
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  const canChat = isMember;
  const canDelete = (msg: Message) => msg.user_id === currentUserId || myRole === "owner" || myRole === "admin";

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

      <style>{`
        .ccb-grp-detail { max-width: 1080px; margin: 0 auto; }
        @media (min-width: 1024px) {
          .ccb-grp-detail-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 280px;
            gap: 20px;
            align-items: start;
          }
          .ccb-grp-members-sidebar { display: block; }
          .ccb-grp-members-mobile-trigger { display: none; }
        }
        .ccb-grp-members-sidebar { display: none; }
      `}</style>

      {/* Cover + header */}
      <div style={{
        background: group.cover_url
          ? `url(${group.cover_url}) center/cover`
          : `linear-gradient(135deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff", padding: "32px 16px 22px",
        position: "relative", overflow: "hidden",
        boxShadow: T.shadowGlow,
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.gold}, transparent)`,
        }} />
        <div className="ccb-grp-detail" style={{
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <Link href="/community/groups" style={{
            background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 8, padding: "6px 12px",
            color: "#fff", fontSize: 12, fontWeight: 700,
            textDecoration: "none",
          }}>← Tous les groupes</Link>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{
              fontFamily: F.title, fontSize: "clamp(1.3rem, 4vw, 1.8rem)",
              fontWeight: 700, margin: "0 0 4px", letterSpacing: "0.02em",
            }}>
              {group.name}
            </h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
              <span style={{
                background: group.type === "public" ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.15)",
                color: group.type === "public" ? "#fff" : "rgba(255,255,255,0.85)",
                padding: "2px 10px", borderRadius: 999, fontWeight: 700,
              }}>
                {group.type === "public" ? "🌍 Public" : "🔒 Privé"}
              </span>
              <span style={{
                background: "rgba(0,0,0,0.25)", padding: "2px 10px",
                borderRadius: 999, fontWeight: 700,
              }}>
                {catDef.emoji} {catDef.label}
              </span>
              <span style={{
                background: "rgba(0,0,0,0.25)", padding: "2px 10px",
                borderRadius: 999, fontWeight: 600,
              }}>
                👥 {members.length} membre{members.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
          {isMember && (
            <button onClick={startMeeting} style={{
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
              color: "#111", border: "none",
              borderRadius: 10, padding: "8px 16px",
              fontWeight: 700, fontSize: 12, fontFamily: F.body,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              boxShadow: "0 2px 12px rgba(212,175,55,0.4)",
            }}>
              🎥 Réunion
            </button>
          )}
          {isMember ? (
            <button onClick={leaveGroup} style={{
              background: "rgba(0,0,0,0.3)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 10, padding: "8px 14px",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
              fontFamily: F.body,
            }}>
              Quitter
            </button>
          ) : group.type === "public" ? (
            <button onClick={joinGroup} style={{
              background: T.gold, color: "#111",
              border: "none", borderRadius: 10, padding: "8px 16px",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
              fontFamily: F.body,
            }}>
              + Rejoindre
            </button>
          ) : (
            <div style={{
              background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 10, padding: "8px 14px",
              fontSize: 11, fontStyle: "italic",
            }}>
              🔒 Invitation requise
            </div>
          )}
        </div>
        {group.description && (
          <div className="ccb-grp-detail" style={{
            marginTop: 10, fontSize: 13, opacity: 0.95, lineHeight: 1.5,
          }}>
            {group.description}
          </div>
        )}
      </div>

      <div className="ccb-grp-detail" style={{ padding: "16px 14px 32px" }}>
        <div className="ccb-grp-detail-grid">

          {/* Main : Chat */}
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 16, overflow: "hidden",
            display: "flex", flexDirection: "column",
            height: "min(70vh, 700px)",
          }}>
            {/* Header chat */}
            <div style={{
              padding: "10px 14px", borderBottom: `1px solid ${T.borderSoft}`,
              display: "flex", alignItems: "center", gap: 8,
              background: T.surface2,
            }}>
              <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: T.text }}>
                💬 Conversation
              </div>
              <div style={{ flex: 1 }} />
              <Link href={`/community/groups/${group.id}/files`} title="Fichiers partagés" style={{
                background: "none", border: "none", cursor: "pointer",
                color: T.textMuted, fontSize: 16, padding: "4px 6px",
                textDecoration: "none",
              }}>📎</Link>
              <button onClick={() => setShowSearch((s) => !s)} title="Rechercher" style={{
                background: showSearch ? T.violetSoft : "none", border: "none", cursor: "pointer",
                color: showSearch ? T.violet : T.textMuted, fontSize: 16,
                padding: "4px 6px", borderRadius: 6,
              }}>🔍</button>
              <button onClick={() => setShowMembers(!showMembers)}
                className="ccb-grp-members-mobile-trigger"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: T.violet, fontSize: 12, fontWeight: 700,
                }}>
                👥 {members.length}
              </button>
            </div>

            {/* Search bar */}
            {showSearch && (
              <div style={{
                padding: "8px 14px", borderBottom: `1px solid ${T.borderSoft}`,
                background: T.bg,
              }}>
                <input
                  type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍 Rechercher dans la conversation…"
                  autoFocus
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "8px 12px",
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 999, color: T.text, fontSize: 13,
                    fontFamily: F.body, outline: "none",
                  }}
                />
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} style={{
              flex: 1, overflowY: "auto", padding: "14px",
              background: T.bg,
            }}>
              {!canChat && group.type === "private" ? (
                <div style={{ textAlign: "center", padding: "40px 14px", color: T.textMuted, fontSize: 13 }}>
                  🔒 Ce groupe est privé. Demande à un membre de t&apos;inviter pour voir la conversation.
                </div>
              ) : filteredMessages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 14px", color: T.textMuted, fontSize: 13 }}>
                  {search ? "Aucun message ne correspond à la recherche." : "💬 Aucun message. Sois le premier à écrire !"}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredMessages.map((m) => {
                    const isMine = m.user_id === currentUserId;
                    return (
                      <div key={m.id} style={{
                        display: "flex", gap: 8,
                        flexDirection: isMine ? "row-reverse" : "row",
                      }}>
                        <Avatar profile={m.user_profiles} size={32} />
                        <div style={{
                          maxWidth: "75%",
                          display: "flex", flexDirection: "column",
                          alignItems: isMine ? "flex-end" : "flex-start",
                        }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: T.textMuted,
                            marginBottom: 3, padding: "0 4px",
                          }}>
                            {isMine ? "Moi" : (m.user_profiles?.display_name || "Membre")}
                            <span style={{ marginLeft: 6, fontWeight: 400, opacity: 0.7 }}>
                              · {timeAgo(m.created_at)}
                            </span>
                          </div>
                          <div style={{
                            background: isMine
                              ? `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`
                              : T.card,
                            color: isMine ? "#fff" : T.text,
                            border: isMine ? "none" : `1px solid ${T.border}`,
                            borderRadius: isMine
                              ? "14px 14px 4px 14px"
                              : "14px 14px 14px 4px",
                            padding: m.attachment_url ? "6px 6px 8px" : "8px 12px",
                            fontSize: 14, lineHeight: 1.5,
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                          }}>
                            {/* Attachment render */}
                            {m.attachment_url && (
                              <AttachmentRender msg={m} isMine={isMine} onImageClick={(url) => setLightbox(url)} />
                            )}
                            {m.content && (
                              <div style={{ padding: m.attachment_url ? "6px 8px 0" : 0 }}>
                                <ContentWithMentions content={m.content} members={memberLookup} />
                              </div>
                            )}
                          </div>
                          {canDelete(m) && (
                            <button onClick={() => deleteMessage(m.id)} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: T.textMuted, fontSize: 10, padding: "3px 4px",
                              marginTop: 2,
                            }}>
                              🗑 supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Composer */}
            {canChat ? (
              <div style={{
                padding: "10px 14px", borderTop: `1px solid ${T.borderSoft}`,
                background: T.card,
              }}>
                {/* Preview attachment en attente */}
                {pendingAttachment && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", marginBottom: 8,
                    background: T.violetSoft, border: `1px solid ${T.violet}33`,
                    borderRadius: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>
                      {pendingAttachment.type === "image" ? "🖼️"
                        : pendingAttachment.type === "pdf" ? "📄"
                        : pendingAttachment.type === "audio" ? "🎵"
                        : pendingAttachment.type === "video" ? "🎬"
                        : "📎"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: T.text,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {pendingAttachment.name}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>
                        {(pendingAttachment.size / 1024).toFixed(0)} Ko
                      </div>
                    </div>
                    <button onClick={() => setPendingAttachment(null)} title="Annuler" style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: T.textMuted, fontSize: 14,
                    }}>✕</button>
                  </div>
                )}

                <input ref={fileRef} type="file"
                  accept="image/*,application/pdf,audio/*,video/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(f);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                />

                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <button onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    title="Joindre un fichier"
                    style={{
                      background: T.surface2, border: `1px solid ${T.border}`,
                      borderRadius: 14, padding: "10px 12px",
                      cursor: uploading ? "wait" : "pointer",
                      color: T.textMuted, fontSize: 18,
                      flexShrink: 0, opacity: uploading ? 0.6 : 1,
                    }}>
                    {uploading ? "⏳" : "📎"}
                  </button>
                  <div style={{ flex: 1 }}>
                    <MentionTextarea
                      value={text} onChange={setText}
                      members={memberLookup}
                      placeholder={pendingAttachment ? "Légende (optionnel)…" : "Écrire un message… (@ pour mentionner)"}
                      multiline
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "10px 14px",
                        background: T.bg, border: `1px solid ${T.border}`,
                        borderRadius: 14, color: T.text, fontSize: 14,
                        fontFamily: F.body, outline: "none",
                        resize: "none",
                      } as React.CSSProperties}
                    />
                  </div>
                  <button onClick={sendMessage}
                    disabled={sending || (!text.trim() && !pendingAttachment)}
                    style={{
                      background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                      color: "#fff", border: "none",
                      borderRadius: 14, padding: "10px 16px",
                      cursor: sending || (!text.trim() && !pendingAttachment) ? "not-allowed" : "pointer",
                      fontWeight: 700, fontSize: 14, fontFamily: F.body,
                      opacity: (!text.trim() && !pendingAttachment) ? 0.5 : 1,
                    }}>
                    ➤
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: "14px", borderTop: `1px solid ${T.borderSoft}`,
                background: T.surface2, textAlign: "center",
              }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>
                  {group.type === "public"
                    ? "Rejoins le groupe pour participer à la conversation."
                    : "Demande à un admin de t'inviter."}
                </div>
                {group.type === "public" && (
                  <button onClick={joinGroup} style={{
                    background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                    color: "#fff", border: "none",
                    borderRadius: 10, padding: "8px 16px",
                    fontWeight: 700, fontSize: 12, cursor: "pointer",
                  }}>+ Rejoindre</button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar membres (desktop) */}
          <div className="ccb-grp-members-sidebar">
            <MembersList members={members} currentUserId={currentUserId} />
          </div>
        </div>

        {/* Lightbox image */}
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, cursor: "zoom-out",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt=""
              style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
            <button onClick={(e) => { e.stopPropagation(); setLightbox(null); }} style={{
              position: "absolute", top: 14, right: 14,
              background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 999, width: 40, height: 40,
              color: "#fff", fontSize: 18, cursor: "pointer",
            }}>✕</button>
          </div>
        )}

        {/* Modal membres mobile */}
        {showMembers && (
          <div onClick={(e) => { if (e.target === e.currentTarget) setShowMembers(false); }}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(31,26,51,0.55)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}>
            <div style={{
              background: T.card, borderTop: `3px solid ${T.violet}`,
              borderRadius: "20px 20px 0 0", padding: "20px 16px 28px",
              width: "100%", maxWidth: 520, maxHeight: "70vh", overflowY: "auto",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 14,
              }}>
                <div style={{ fontFamily: F.title, fontSize: 15, fontWeight: 700, color: T.violet }}>
                  👥 Membres ({members.length})
                </div>
                <button onClick={() => setShowMembers(false)} style={{
                  background: T.surface2, border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: "5px 11px",
                  color: T.textMuted, fontSize: 14, cursor: "pointer",
                }}>✕</button>
              </div>
              <MembersList members={members} currentUserId={currentUserId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MembersList({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const sortedMembers = [...members].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 } as const;
    return order[a.role] - order[b.role];
  });
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: 14,
      boxShadow: T.shadowSoft,
    }}>
      <div style={{
        fontFamily: F.title, fontSize: 12, fontWeight: 700,
        color: T.textMuted, textTransform: "uppercase",
        letterSpacing: "0.08em", marginBottom: 10,
      }}>
        👥 Membres ({members.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sortedMembers.map((m) => {
          const isMe = m.user_id === currentUserId;
          const initials = (m.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          return (
            <Link key={m.user_id} href={`/community/profil/${m.user_id}`} style={{
              display: "flex", alignItems: "center", gap: 10,
              textDecoration: "none", padding: "4px 0",
            }}>
              {m.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatar_url} alt={m.display_name || ""}
                  style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#fff",
                }}>{initials}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: T.text,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {m.display_name || "Membre"} {isMe && <span style={{ color: T.violet, fontWeight: 700 }}>· VOUS</span>}
                </div>
                {m.role !== "member" && (
                  <div style={{ fontSize: 10, color: T.gold, fontWeight: 700, textTransform: "uppercase" }}>
                    {m.role === "owner" ? "👑 Propriétaire" : "🛡️ Admin"}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AttachmentRender({ msg, isMine, onImageClick }: {
  msg: Message; isMine: boolean; onImageClick: (url: string) => void;
}) {
  if (!msg.attachment_url) return null;
  const fname = msg.attachment_name ?? "fichier";
  const size = msg.attachment_size ? `${(msg.attachment_size / 1024).toFixed(0)} Ko` : "";

  if (msg.attachment_type === "image") {
    return (
      <div onClick={() => onImageClick(msg.attachment_url!)} style={{
        cursor: "pointer", borderRadius: 10, overflow: "hidden", maxWidth: 280,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={msg.attachment_url} alt={fname}
          style={{ width: "100%", height: "auto", display: "block", maxHeight: 280, objectFit: "cover" }} />
      </div>
    );
  }
  if (msg.attachment_type === "video") {
    return (
      <video src={msg.attachment_url} controls
        style={{ width: "100%", maxWidth: 320, borderRadius: 10, display: "block" }} />
    );
  }
  if (msg.attachment_type === "audio") {
    return (
      <div style={{
        background: isMine ? "rgba(0,0,0,0.15)" : T.surface2,
        borderRadius: 10, padding: "8px 10px", minWidth: 240,
      }}>
        <audio src={msg.attachment_url} controls style={{ width: "100%", display: "block" }} />
      </div>
    );
  }
  // PDF or other
  return (
    <a href={msg.attachment_url} target="_blank" rel="noopener" style={{
      display: "flex", alignItems: "center", gap: 8,
      background: isMine ? "rgba(0,0,0,0.15)" : T.surface2,
      borderRadius: 10, padding: "8px 12px",
      textDecoration: "none",
      color: isMine ? "#fff" : T.text,
      maxWidth: 280,
    }}>
      <span style={{ fontSize: 26 }}>
        {msg.attachment_type === "pdf" ? "📄" : "📎"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 700,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {fname}
        </div>
        {size && <div style={{ fontSize: 10, opacity: 0.75 }}>{size}</div>}
      </div>
    </a>
  );
}

// Render content with @mention links
function ContentWithMentions({ content, members }: { content: string; members: MemberLookup[] }) {
  if (members.length === 0) return <>{content}</>;
  const segments = renderSegments(content, members);
  return (
    <>
      {segments.map((s, i) => {
        if (s.type === "mention" && s.userId) {
          return (
            <Link key={i} href={`/community/profil/${s.userId}`}
              style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}>
              {s.content}
            </Link>
          );
        }
        return <span key={i}>{s.content}</span>;
      })}
    </>
  );
}
