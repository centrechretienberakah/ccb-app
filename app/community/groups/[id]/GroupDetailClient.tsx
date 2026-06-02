"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GROUPS_THEME as T, GROUPS_FONTS as F, getGroupCategoryDef, notifyGroupsStaff } from "@/lib/groups/theme";
import { notifyGroupMention, notifyGroupMeeting, notifyNewMember } from "@/lib/groups/notify";
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
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by?: string | null;
  reactions?: Record<string, { count: number; mine: boolean }>;
}

const REACTION_EMOJIS = ["👍", "❤️", "🙏", "🎉", "😂", "🔥"] as const;

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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // user_id → display_name
  const [memberReadAt, setMemberReadAt] = useState<Map<string, string>>(new Map()); // user_id → last_read_at ISO
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [activeSession, setActiveSession] = useState<{
    id: string; mode: "audio" | "video"; started_at: string; active_count: number;
  } | null>(null);
  // mounted = true seulement après hydratation — évite les mismatch SSR/client
  // sur le contenu time-formatted du bandeau "Appel en cours"
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const catDef = getGroupCategoryDef(group.category);
  const memberLookup: MemberLookup[] = members.map((m) => ({
    user_id: m.user_id, display_name: m.display_name, avatar_url: m.avatar_url,
  }));

  // Polling : détecte les sessions Meet actives du groupe (toutes les 15s)
  useEffect(() => {
    if (!isMember && group.type !== "public") return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function fetchActive() {
      try {
        const supabase = createClient();
        // Avant de lire l'état actif, on déclenche un cleanup côté serveur
        // pour fermer les sessions zombies (0 participants actifs ou > 1h).
        // Ne bloque pas si RPC indisponible (v49 pas encore migrée).
        try { await supabase.rpc("meet_session_close_stale"); } catch { /* noop */ }

        const { data } = await supabase
          .from("meet_sessions_with_stats")
          .select("id, mode, started_at, active_count, is_active")
          .eq("group_id", group.id)
          .eq("is_active", true)
          .gt("active_count", 0) // filet de sécurité : pas de bandeau si 0 participants actifs
          // Sécurité finale : ne JAMAIS afficher de bandeau pour une session
          // démarrée il y a > 1 semaine (probable zombie restée trop longtemps)
          .gte("started_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("started_at", { ascending: false })
          .limit(1);
        if (cancelled) return;
        const row = (data ?? [])[0] as {
          id: string; mode: "audio" | "video"; started_at: string; active_count: number; is_active: boolean;
        } | undefined;
        setActiveSession(row ? { id: row.id, mode: row.mode, started_at: row.started_at, active_count: row.active_count } : null);
      } catch { /* vue meet_sessions_with_stats pas migrée → silencieux */ }
    }
    void fetchActive();
    timer = setInterval(fetchActive, 15_000);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [group.id, isMember, group.type]);

  // Chargement initial des réactions + écoute realtime
  useEffect(() => {
    if (!isMember && group.type !== "public") return;
    const supabase = createClient();
    let cancelled = false;

    async function loadReactions() {
      try {
        const { data } = await supabase
          .from("group_message_reactions")
          .select("message_id, user_id, emoji")
          .in("message_id", messages.map((m) => m.id));
        if (cancelled || !data) return;
        const reactionsByMessage: Record<string, Record<string, { count: number; mine: boolean }>> = {};
        for (const r of (data as Array<{ message_id: string; user_id: string; emoji: string }>)) {
          if (!reactionsByMessage[r.message_id]) reactionsByMessage[r.message_id] = {};
          const ex = reactionsByMessage[r.message_id][r.emoji] ?? { count: 0, mine: false };
          ex.count += 1;
          if (r.user_id === currentUserId) ex.mine = true;
          reactionsByMessage[r.message_id][r.emoji] = ex;
        }
        setMessages((prev) => prev.map((m) => ({ ...m, reactions: reactionsByMessage[m.id] ?? {} })));
      } catch { /* table v22 may not exist yet */ }
    }
    loadReactions();

    const ch = supabase
      .channel(`ccb-group-reactions-${group.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_message_reactions" }, async (payload) => {
        type ReactionRow = { message_id: string; user_id: string; emoji: string };
        const row = (payload.new ?? payload.old) as ReactionRow;
        if (!row) return;
        // Vérifie que le message appartient à ce groupe
        const target = messages.find((m) => m.id === row.message_id);
        if (!target) return;
        // Recharge les réactions de ce message uniquement
        const { data } = await supabase
          .from("group_message_reactions")
          .select("user_id, emoji")
          .eq("message_id", row.message_id);
        const grouped: Record<string, { count: number; mine: boolean }> = {};
        for (const r of (data ?? []) as Array<{ user_id: string; emoji: string }>) {
          const ex = grouped[r.emoji] ?? { count: 0, mine: false };
          ex.count += 1;
          if (r.user_id === currentUserId) ex.mine = true;
          grouped[r.emoji] = ex;
        }
        setMessages((prev) => prev.map((m) =>
          m.id === row.message_id ? { ...m, reactions: grouped } : m,
        ));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };

  }, [group.id, isMember, group.type, messages.length, currentUserId]);

  // Presence typing
  useEffect(() => {
    if (!isMember) return;
    const supabase = createClient();
    const ch = supabase.channel(`ccb-group-typing-${group.id}`, {
      config: { presence: { key: currentUserId } },
    });
    presenceChannelRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Array<{ typing?: boolean; name?: string }>>;
      const newMap = new Map<string, string>();
      for (const [uid, metas] of Object.entries(state)) {
        if (uid === currentUserId) continue;
        const meta = metas[0];
        if (meta?.typing && meta?.name) newMap.set(uid, meta.name);
      }
      setTypingUsers(newMap);
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          typing: false,
          name: currentUserProfile?.display_name || "Un membre",
        });
      }
    });
    return () => { supabase.removeChannel(ch); presenceChannelRef.current = null; };

  }, [group.id, isMember, currentUserId, currentUserProfile?.display_name]);

  // Close 3-dot menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMenuOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Mark messages as read whenever user opens the group (or new messages arrive
  // while the tab is visible). Best-effort: ignore RPC errors si la migration
  // n'a pas encore été exécutée.
  useEffect(() => {
    if (!isMember) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      try {
        await supabase.rpc("groups_mark_read", { p_group_id: group.id });
      } catch { /* RPC pas dispo */ }
      if (cancelled) return;
    })();
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      supabase.rpc("groups_mark_read", { p_group_id: group.id }).then(() => {/* noop */});
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVisible); };
  }, [group.id, isMember, messages.length]);

  // ─── Read receipts : fetch group_user_state pour calculer "lu par X" ──
  // Polling léger toutes les 15s (Realtime sur group_user_state n'est pas
  // activé par défaut côté Supabase). Si la table n'existe pas (migration
  // v39 non exécutée), on retombe silencieusement sur une Map vide.
  useEffect(() => {
    if (!isMember || members.length <= 1) return;
    const supabase = createClient();
    let cancelled = false;
    const memberIds = members.map((m) => m.user_id);

    async function loadReadStates() {
      try {
        const { data } = await supabase
          .from("group_user_state")
          .select("user_id, last_read_at")
          .eq("group_id", group.id)
          .in("user_id", memberIds);
        if (cancelled || !data) return;
        const m = new Map<string, string>();
        for (const r of data as Array<{ user_id: string; last_read_at: string }>) {
          if (r.last_read_at) m.set(r.user_id, r.last_read_at);
        }
        setMemberReadAt(m);
      } catch { /* migration v39 non exécutée */ }
    }

    loadReadStates();
    const itv = setInterval(loadReadStates, 15000);
    return () => { cancelled = true; clearInterval(itv); };
  }, [group.id, isMember, members]);

  /** Combien de membres ont lu ce message (excluant l'auteur). */
  function readByCount(msg: Message): number {
    if (memberReadAt.size === 0) return 0;
    const msgT = new Date(msg.created_at).getTime();
    let n = 0;
    for (const [uid, lastReadAt] of memberReadAt) {
      if (uid === msg.user_id) continue;
      if (new Date(lastReadAt).getTime() >= msgT) n++;
    }
    return n;
  }

  function emitTyping(isTyping: boolean) {
    const ch = presenceChannelRef.current;
    if (!ch) return;
    try {
      ch.track({
        typing: isTyping,
        name: currentUserProfile?.display_name || "Un membre",
      });
    } catch { /* noop */ }
  }

  function handleTextChange(v: string) {
    setText(v);
    if (v.length > 0) {
      emitTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => emitTyping(false), 2500);
    } else {
      emitTyping(false);
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const supabase = createClient();
    const msg = messages.find((m) => m.id === messageId);
    const already = msg?.reactions?.[emoji]?.mine;
    if (already) {
      await supabase.from("group_message_reactions").delete()
        .eq("message_id", messageId).eq("user_id", currentUserId).eq("emoji", emoji);
    } else {
      await supabase.from("group_message_reactions").insert({
        message_id: messageId, user_id: currentUserId, emoji,
      });
    }
    setEmojiPickerFor(null);
  }

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
        event: "UPDATE", schema: "public", table: "group_messages",
        filter: `group_id=eq.${group.id}`,
      }, (payload) => {
        const row = payload.new as Omit<Message, "user_profiles">;
        setMessages((prev) => prev.map((m) => m.id === row.id
          ? { ...m, ...row, user_profiles: m.user_profiles }
          : m
        ));
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
    if (file.size > 500 * 1024 * 1024) {
      flash("Fichier trop volumineux (max 500 Mo)");
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
    // Notif aux admins du groupe
    void notifyNewMember({
      groupId: group.id,
      groupName: group.name,
      newMemberName: currentUserProfile?.display_name || "Un nouveau membre",
    });
  }

  async function startMeeting(mode: "audio" | "video" = "video") {
    const author = currentUserProfile?.display_name || "Un membre";
    const labelEmoji = mode === "audio" ? "📞" : "🎥";
    const labelText  = mode === "audio" ? "appel vocal" : "réunion vidéo";
    const meetingUrl = `/community/groups/${group.id}/meeting${mode === "audio" ? "?mode=audio" : ""}`;

    // 1) Insère un message système dans le chat du groupe (visible
    //    instantanément par tous les membres via realtime)
    try {
      const supabase = createClient();
      await supabase.from("group_messages").insert({
        group_id: group.id,
        user_id: currentUserId,
        content: mode === "audio"
          ? `📞 ${author} a lancé un appel vocal — Rejoignez en cliquant sur 📞 dans le bandeau du groupe`
          : `🎥 ${author} a démarré une réunion vidéo — Rejoignez en cliquant sur 🎥 dans le bandeau du groupe`,
      });
    } catch { /* RLS / réseau : on continue quand même */ }

    // 2) Notif push aux autres membres non mutés (best-effort)
    void notifyGroupMeeting({
      groupId: group.id, groupName: group.name,
      authorName: author, excludeUserId: currentUserId,
      mode,
    });
    notifyGroupsStaff(
      `${labelEmoji} ${labelText[0].toUpperCase() + labelText.slice(1)} : ${group.name}`,
      `${author} démarre ${mode === "audio" ? "un" : "une"} ${labelText}`,
      meetingUrl,
    );
    router.push(meetingUrl);
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
    if (replyTo) insertPayload.reply_to_id = replyTo.id;
    if (pendingAttachment) {
      insertPayload.attachment_url = pendingAttachment.url;
      insertPayload.attachment_type = pendingAttachment.type;
      insertPayload.attachment_name = pendingAttachment.name;
      insertPayload.attachment_size = pendingAttachment.size;
    }
    const { data, error } = await supabase.from("group_messages")
      .insert(insertPayload)
      .select("id, group_id, user_id, content, reply_to_id, created_at, edited_at, attachment_url, attachment_type, attachment_name, attachment_size, is_pinned, pinned_at, pinned_by")
      .single();
    if (error) { flash("Erreur : " + error.message); setSending(false); return; }
    const row = data as Omit<Message, "user_profiles">;
    setMessages((prev) => [...prev, { ...row, user_profiles: currentUserProfile }]);
    setText("");
    setPendingAttachment(null);
    setReplyTo(null);
    emitTyping(false);
    setSending(false);

    const authorName = currentUserProfile?.display_name || "Un membre";
    const snippet = t || (pendingAttachment ? `📎 ${pendingAttachment.name}` : "");

    // Notif staff sur premier message du groupe
    if (messages.length === 0) {
      notifyGroupsStaff(
        `💬 Premier message dans : ${group.name}`,
        snippet.slice(0, 120),
        `/community/groups/${group.id}`,
      );
    }

    // Notif mention → uniquement aux mentionnés (ignore mute)
    const mentionedIds = getMentionedUserIds(t, memberLookup)
      .filter((uid) => uid !== currentUserId);
    if (mentionedIds.length > 0) {
      void notifyGroupMention({
        groupId: group.id, groupName: group.name,
        authorName, snippet,
        mentionedUserIds: mentionedIds,
      });
    }

    // Notif nouveau message → tous les membres non mutés, EXCEPT ceux déjà
    // notifiés via mention (évite la double notification).
    void (async () => {
      try {
        const supabase = createClient();
        const { data: gm } = await supabase
          .from("group_members").select("user_id").eq("group_id", group.id);
        const allIds = ((gm ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
        const targets = allIds.filter((uid) => uid !== currentUserId && !mentionedIds.includes(uid));
        if (targets.length === 0) return;

        // Filtre mute
        let mutedIds = new Set<string>();
        try {
          const { data: ms } = await supabase
            .from("group_user_state")
            .select("user_id, muted_until")
            .eq("group_id", group.id)
            .in("user_id", targets);
          const nowMs = Date.now();
          for (const row of (ms ?? []) as Array<{ user_id: string; muted_until: string | null }>) {
            if (row.muted_until && new Date(row.muted_until).getTime() > nowMs) {
              mutedIds.add(row.user_id);
            }
          }
        } catch { /* table v39 non migrée */ }

        const finalTargets = targets.filter((id) => !mutedIds.has(id));
        if (finalTargets.length === 0) return;

        // Réutilise le helper en construisant directement les userIds — on ne
        // veut pas que notifyGroupMessage re-filtre les mentionnés.
        await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `💬 ${authorName} · ${group.name}`,
            body: snippet.slice(0, 140) || "📎 Pièce jointe",
            url: `/community/groups/${group.id}`,
            audience: "user_ids",
            userIds: finalTargets,
          }),
        });
      } catch { /* noop */ }
    })();
  }

  async function deleteMessage(messageId: string) {
    if (!confirm("Supprimer ce message ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("group_messages").delete().eq("id", messageId);
    if (error) { flash("Erreur : " + error.message); return; }
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  async function togglePin(msg: Message) {
    if (!isGroupAdmin) { flash("Réservé aux admins du groupe."); return; }
    const supabase = createClient();
    const willPin = !msg.is_pinned;
    // Optimistic update
    setMessages((prev) => prev.map((m) => m.id === msg.id
      ? { ...m, is_pinned: willPin, pinned_at: willPin ? new Date().toISOString() : null, pinned_by: willPin ? currentUserId : null }
      : m
    ));
    const { data, error } = await supabase
      .from("group_messages")
      .update({
        is_pinned: willPin,
        pinned_at: willPin ? new Date().toISOString() : null,
        pinned_by: willPin ? currentUserId : null,
      })
      .eq("id", msg.id)
      .select("id, is_pinned, pinned_at, pinned_by");
    if (error) {
      flash("Erreur pin : " + error.message);
      // Rollback
      setMessages((prev) => prev.map((m) => m.id === msg.id
        ? { ...m, is_pinned: msg.is_pinned, pinned_at: msg.pinned_at, pinned_by: msg.pinned_by }
        : m
      ));
      return;
    }
    if (!data || data.length === 0) {
      flash("Permission refusée. Vérifie que tu es admin du groupe.");
      setMessages((prev) => prev.map((m) => m.id === msg.id
        ? { ...m, is_pinned: msg.is_pinned, pinned_at: msg.pinned_at, pinned_by: msg.pinned_by }
        : m
      ));
      return;
    }
    flash(willPin ? "📌 Message épinglé" : "Épinglage retiré");
  }

  const canChat = isMember;
  const isGroupAdmin = myRole === "owner" || myRole === "admin";
  const canDelete = (msg: Message) => msg.user_id === currentUserId || isGroupAdmin;
  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.is_pinned).sort((a, b) =>
      new Date(b.pinned_at || b.created_at).getTime() - new Date(a.pinned_at || a.created_at).getTime()
    ),
    [messages]
  );

  function scrollToMessage(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.transition = "background 800ms ease";
    el.style.background = T.violetSoft;
    setTimeout(() => { if (el) el.style.background = ""; }, 1400);
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
        @keyframes ccb-typing-dot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }
        @keyframes ccb-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.7); }
          50%      { box-shadow: 0 0 0 8px rgba(212,175,55,0); }
        }

        /* ── Composer fixé en bas du viewport sur mobile + tablette ── */
        /* MOBILE (< 640px) : juste au-dessus de la nav bar du bas */
        @media (max-width: 639px) {
          .ccb-grp-chat-card {
            height: auto !important;
            min-height: 60vh;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .ccb-grp-composer {
            position: fixed !important;
            left: 0; right: 0;
            bottom: calc(60px + env(safe-area-inset-bottom, 0px));
            z-index: 25;
            background: ${T.card};
            border-top: 1px solid ${T.borderSoft};
            padding-bottom: max(10px, env(safe-area-inset-bottom, 0px)) !important;
            box-shadow: 0 -4px 16px rgba(31,20,60,0.08);
          }
          .ccb-grp-messages {
            padding-bottom: 84px !important;
          }
        }
        /* TABLETTE (640px – 1023px) : pas de bottom-nav, collé en bas */
        @media (min-width: 640px) and (max-width: 1023px) {
          .ccb-grp-chat-card {
            height: auto !important;
            min-height: 70vh;
            overflow: visible !important;
          }
          .ccb-grp-composer {
            position: fixed !important;
            left: 64px; right: 0;
            bottom: 0;
            z-index: 25;
            background: ${T.card};
            border-top: 1px solid ${T.borderSoft};
            box-shadow: 0 -4px 16px rgba(31,20,60,0.08);
          }
          .ccb-grp-messages {
            padding-bottom: 84px !important;
          }
        }
      `}</style>

      {/* ─── 1. TopBar sticky compact (WhatsApp-style) ─── */}
      <div className="ccb-grp-topbar" style={{
        position: "sticky", top: 0, zIndex: 30,
        background: `linear-gradient(180deg, ${T.violet} 0%, ${T.violetDark} 100%)`,
        color: "#fff",
        boxShadow: "0 1px 0 rgba(0,0,0,0.18), 0 4px 18px rgba(90,44,160,0.18)",
      }}>
        <div className="ccb-grp-detail" style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px",
        }}>
          <Link href="/community/groups" aria-label="Retour"
            style={{
              width: 36, height: 36, borderRadius: 999,
              background: "rgba(255,255,255,0.12)", color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, textDecoration: "none", flexShrink: 0,
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
            ←
          </Link>

          {/* Avatar groupe */}
          <div style={{
            width: 40, height: 40, borderRadius: 999, flexShrink: 0,
            background: group.cover_url
              ? `url(${group.cover_url}) center/cover`
              : "rgba(212,175,55,0.25)",
            border: "1.5px solid rgba(212,175,55,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontFamily: F.title, fontWeight: 800, fontSize: 16,
            textTransform: "uppercase",
          }}>
            {!group.cover_url && (group.name?.[0] ?? "?")}
          </div>

          {/* Identité */}
          <button onClick={() => setInfoExpanded((v) => !v)}
            style={{
              flex: 1, minWidth: 0, textAlign: "left",
              background: "none", border: "none", color: "#fff",
              cursor: "pointer", padding: 0, fontFamily: F.body,
            }}>
            <div style={{
              fontFamily: F.title, fontWeight: 700,
              fontSize: 15, lineHeight: 1.15,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              letterSpacing: 0.2,
            }}>{group.name}</div>
            <div style={{
              fontSize: 11, opacity: 0.82, marginTop: 1,
              display: "flex", gap: 6, alignItems: "center",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              <span>{members.length} membre{members.length > 1 ? "s" : ""}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{group.type === "public" ? "🌍 Public" : "🔒 Privé"}</span>
              {typingUsers.size > 0 && (
                <>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span style={{ fontStyle: "italic", color: T.gold }}>écrit…</span>
                </>
              )}
            </div>
          </button>

          {/* Actions principales */}
          {isMember && (
            <>
              <button onClick={() => startMeeting("audio")} title="Appel vocal"
                style={topbarIconBtn()}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
                <PhoneIcon />
              </button>
              <button onClick={() => startMeeting("video")} title="Réunion vidéo"
                style={topbarIconBtn()}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
                <VideoIcon />
              </button>
            </>
          )}

          {/* Menu 3 points */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              style={topbarIconBtn()}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = menuOpen ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)")}>
              <DotsIcon />
            </button>
            {menuOpen && (
              <div role="menu" style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                minWidth: 220,
                background: T.card, color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                overflow: "hidden",
                animation: "ccb-menu-in 140ms ease-out",
              }}>
                <style>{`
                  @keyframes ccb-menu-in {
                    from { opacity: 0; transform: translateY(-4px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                  }
                `}</style>
                {!isMember && group.type === "public" && (
                  <MenuItem icon="＋" label="Rejoindre le groupe" onClick={() => { setMenuOpen(false); joinGroup(); }} />
                )}
                <MenuItem icon="🔍" label="Rechercher" onClick={() => { setMenuOpen(false); setShowSearch(true); }} />
                <MenuItem icon="📎" label="Fichiers partagés" href={`/community/groups/${group.id}/files`} onClick={() => setMenuOpen(false)} />
                <MenuItem icon="👥" label={`Voir les membres (${members.length})`} onClick={() => { setMenuOpen(false); setShowMembers(true); }} />
                <MenuItem icon="🗓️" label="Réunions programmées" href={`/community/groups/${group.id}/meeting/scheduled`} onClick={() => setMenuOpen(false)} />
                <MenuItem icon="📜" label="Historique des appels" href={`/community/groups/${group.id}/meeting/history`} onClick={() => setMenuOpen(false)} />
                {(myRole === "owner" || myRole === "admin") && (
                  <MenuItem icon="⚙️" label="Paramètres du groupe" href={`/community/groups/${group.id}/settings`} onClick={() => setMenuOpen(false)} />
                )}
                {isMember && myRole !== "owner" && (
                  <>
                    <div style={{ height: 1, background: T.borderSoft, margin: "4px 0" }} />
                    <MenuItem icon="🚪" label="Quitter le groupe" danger onClick={() => { setMenuOpen(false); leaveGroup(); }} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── 2. Info strip déroulante ─── */}
        {infoExpanded && (
          <div className="ccb-grp-detail" style={{
            padding: "8px 16px 14px",
            background: "rgba(0,0,0,0.15)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: 12.5, lineHeight: 1.55,
          }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: group.description ? 8 : 0 }}>
              <span style={pill()}>{catDef.emoji} {catDef.label}</span>
              <span style={pill()}>{group.type === "public" ? "🌍 Public" : "🔒 Privé"}</span>
              <span style={pill()}>👥 {members.length} membre{members.length > 1 ? "s" : ""}</span>
            </div>
            {group.description && (
              <div style={{ opacity: 0.92 }}>{group.description}</div>
            )}
          </div>
        )}
      </div>

      {/* Bandeau "Appel en cours" — visible par tous les membres
          (rendu uniquement après mount pour éviter les mismatch d'hydratation) */}
      {mounted && activeSession && (isMember || group.type === "public") && (
        <div className="ccb-grp-detail" style={{
          padding: "10px 14px",
          background: `linear-gradient(135deg, ${T.violet}, ${T.violetDark})`,
          color: "#fff",
          display: "flex", alignItems: "center", gap: 12,
          borderBottom: `1px solid ${T.borderSoft}`,
        }} suppressHydrationWarning>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
            animation: "ccb-pulse 1.6s ease-in-out infinite",
          }}>
            {activeSession.mode === "audio" ? "📞" : "🎥"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>
              {activeSession.mode === "audio" ? "Appel vocal en cours" : "Réunion vidéo en cours"}
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.85 }} suppressHydrationWarning>
              👥 {activeSession.active_count} participant{activeSession.active_count > 1 ? "s" : ""} · démarré à{" "}
              {new Date(activeSession.started_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <button
            onClick={() => router.push(`/community/groups/${group.id}/meeting${activeSession.mode === "audio" ? "?mode=audio" : ""}`)}
            style={{
              padding: "8px 18px",
              background: T.gold, color: "#111",
              border: "none", borderRadius: 999,
              fontWeight: 800, fontSize: 12,
              cursor: "pointer", fontFamily: F.body,
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(212,175,55,0.35)",
            }}>
            ＋ Rejoindre
          </button>
        </div>
      )}

      {/* CTA Join si non membre (banderole compacte) */}
      {!isMember && (
        <div className="ccb-grp-detail" style={{
          padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          borderBottom: `1px solid ${T.borderSoft}`,
        }}>
          {group.description && (
            <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: T.textSoft, lineHeight: 1.5 }}>
              {group.description}
            </div>
          )}
          {group.type === "public" ? (
            <button onClick={joinGroup} style={{
              padding: "10px 22px",
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
              color: "#111", border: "none",
              borderRadius: 999, fontWeight: 800, fontSize: 13,
              cursor: "pointer", fontFamily: F.body,
              boxShadow: "0 4px 14px rgba(212,175,55,0.4)",
            }}>＋ Rejoindre le groupe</button>
          ) : (
            <span style={{
              padding: "10px 18px",
              background: T.surface2, color: T.textMuted,
              borderRadius: 999, fontSize: 12.5, fontStyle: "italic",
              border: `1px solid ${T.border}`,
            }}>🔒 Invitation requise</span>
          )}
        </div>
      )}

      <div className="ccb-grp-detail" style={{ padding: "12px 14px 32px" }}>
        <div className="ccb-grp-detail-grid">

          {/* Main : Chat */}
          <div className="ccb-grp-chat-card" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 18, overflow: "hidden",
            display: "flex", flexDirection: "column",
            height: "min(72vh, 720px)",
            boxShadow: "0 2px 14px rgba(31,20,60,0.04)",
          }}>
            {/* Search bar (toggled via le menu 3-points) */}
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

            {/* Bandeau messages épinglés */}
            {pinnedMessages.length > 0 && canChat && (
              <PinnedBanner
                pinned={pinnedMessages}
                onClick={(id) => scrollToMessage(id)}
                isGroupAdmin={isGroupAdmin}
                onUnpin={(m) => togglePin(m)}
              />
            )}

            {/* Messages — avec drag&drop fichiers si membre */}
            <div ref={scrollRef}
              className="ccb-grp-messages"
              onDragEnter={canChat ? (e) => {
                e.preventDefault();
                if (e.dataTransfer?.types?.includes("Files")) setIsDragging(true);
              } : undefined}
              onDragOver={canChat ? (e) => { e.preventDefault(); } : undefined}
              onDragLeave={canChat ? (e) => {
                // Ne quitte le state que si on sort vraiment du container
                if (e.currentTarget === e.target) setIsDragging(false);
              } : undefined}
              onDrop={canChat ? (e) => {
                e.preventDefault();
                setIsDragging(false);
                const files = Array.from(e.dataTransfer?.files ?? []);
                if (files.length > 0) {
                  void uploadFile(files[0]);
                }
              } : undefined}
              style={{
                flex: 1, overflowY: "auto", padding: "14px",
                background: T.bg, position: "relative",
              }}>
              {/* Overlay drag&drop */}
              {isDragging && canChat && (
                <div style={{
                  position: "absolute", inset: 8, zIndex: 50,
                  background: "rgba(90,44,160,0.92)", color: "#fff",
                  border: `3px dashed ${T.gold}`, borderRadius: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <div style={{ textAlign: "center", padding: 24 }}>
                    <div style={{ fontSize: 56, marginBottom: 10 }}>📎</div>
                    <div style={{ fontFamily: F.title, fontSize: 20, fontWeight: 700 }}>
                      Dépose le fichier ici
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                      Image · PDF · Audio · Vidéo · max 500 Mo
                    </div>
                  </div>
                </div>
              )}
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
                    const replyParent = m.reply_to_id ? messages.find((mm) => mm.id === m.reply_to_id) : null;
                    return (
                      <div key={m.id} id={`msg-${m.id}`} style={{
                        display: "flex", gap: 8,
                        flexDirection: isMine ? "row-reverse" : "row",
                        borderRadius: 8, padding: 2,
                      }}>
                        <Avatar profile={m.user_profiles} size={32} />
                        <div style={{
                          maxWidth: "75%",
                          display: "flex", flexDirection: "column",
                          alignItems: isMine ? "flex-end" : "flex-start",
                          position: "relative",
                        }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: T.textMuted,
                            marginBottom: 3, padding: "0 4px",
                            display: "flex", gap: 6, alignItems: "center",
                            flexDirection: isMine ? "row-reverse" : "row",
                          }}>
                            <span>{isMine ? "Moi" : (m.user_profiles?.display_name || "Membre")}</span>
                            <span style={{ fontWeight: 400, opacity: 0.7 }}>· {timeAgo(m.created_at)}</span>
                            {m.is_pinned && (
                              <span style={{
                                color: T.gold, fontWeight: 700,
                                background: "rgba(212,175,55,0.12)",
                                padding: "1px 6px", borderRadius: 4,
                                fontSize: 9, letterSpacing: 0.4,
                              }}>📌 ÉPINGLÉ</span>
                            )}
                          </div>

                          {/* Reply preview */}
                          {replyParent && (
                            <div style={{
                              borderLeft: `3px solid ${T.violet}`,
                              background: T.violetSoft,
                              borderRadius: "0 10px 10px 0",
                              padding: "5px 10px", marginBottom: 4,
                              fontSize: 11, maxWidth: "100%",
                            }}>
                              <div style={{ fontWeight: 700, color: T.violet, marginBottom: 1 }}>
                                ↩ {replyParent.user_profiles?.display_name || "Membre"}
                              </div>
                              <div style={{
                                color: T.textMuted, fontStyle: "italic",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                maxWidth: 240,
                              }}>
                                {replyParent.content || (replyParent.attachment_url ? "📎 Pièce jointe" : "Message")}
                              </div>
                            </div>
                          )}
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
                          {/* Réactions sous le message */}
                          {m.reactions && Object.keys(m.reactions).length > 0 && (
                            <div style={{
                              display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap",
                              justifyContent: isMine ? "flex-end" : "flex-start",
                            }}>
                              {Object.entries(m.reactions).map(([emoji, r]) => (
                                <button key={emoji} onClick={() => toggleReaction(m.id, emoji)} style={{
                                  background: r.mine ? T.violetSoft : T.card,
                                  border: `1px solid ${r.mine ? T.violet : T.border}`,
                                  borderRadius: 999, padding: "1px 8px",
                                  fontSize: 11, cursor: "pointer",
                                  fontWeight: r.mine ? 700 : 500,
                                  color: r.mine ? T.violet : T.textMuted,
                                  display: "inline-flex", alignItems: "center", gap: 3,
                                  fontFamily: F.body,
                                }}>
                                  <span>{emoji}</span><span>{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Read receipts sous mes messages */}
                          {isMine && (() => {
                            const total = Math.max(0, members.length - 1);
                            if (total === 0) return null;
                            const read = readByCount(m);
                            const allRead = read >= total && total > 0;
                            const someRead = read > 0;
                            return (
                              <div style={{
                                marginTop: 2, padding: "0 4px",
                                display: "flex", justifyContent: "flex-end",
                                fontSize: 10.5, color: allRead ? T.violet : T.textMuted, fontWeight: 600,
                                letterSpacing: 0.3,
                              }}
                                title={allRead
                                  ? `Lu par tous (${read}/${total})`
                                  : someRead
                                    ? `Lu par ${read}/${total} membre${read > 1 ? "s" : ""}`
                                    : "Envoyé"}
                              >
                                {allRead ? "✓✓ Lu par tous" : someRead ? `✓✓ ${read}/${total}` : "✓ Envoyé"}
                              </div>
                            );
                          })()}

                          {/* Actions message (réagir, répondre, supprimer) */}
                          <div style={{
                            display: "flex", gap: 6, marginTop: 4,
                            justifyContent: isMine ? "flex-end" : "flex-start",
                            fontSize: 10, color: T.textMuted, position: "relative",
                          }}>
                            <button onClick={() => setEmojiPickerFor(emojiPickerFor === m.id ? null : m.id)} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: T.textMuted, fontSize: 12, padding: "0 4px",
                            }}>
                              😊
                            </button>
                            <button onClick={() => setReplyTo(m)} title="Répondre" style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: T.textMuted, fontSize: 11, padding: "0 4px",
                            }}>
                              ↩
                            </button>
                            {isGroupAdmin && (
                              <button onClick={() => togglePin(m)} title={m.is_pinned ? "Désépingler" : "Épingler"} style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: m.is_pinned ? T.gold : T.textMuted, fontSize: 11, padding: "0 4px",
                              }}>
                                {m.is_pinned ? "📌" : "📍"}
                              </button>
                            )}
                            {canDelete(m) && (
                              <button onClick={() => deleteMessage(m.id)} style={{
                                background: "none", border: "none", cursor: "pointer",
                                color: T.textMuted, fontSize: 11, padding: "0 4px",
                              }}>
                                🗑
                              </button>
                            )}

                            {/* Emoji picker */}
                            {emojiPickerFor === m.id && (
                              <div style={{
                                position: "absolute",
                                bottom: 22,
                                [isMine ? "right" : "left"]: 0,
                                background: T.card, border: `1px solid ${T.border}`,
                                borderRadius: 999, padding: "5px 8px",
                                boxShadow: T.shadowMd, zIndex: 10,
                                display: "flex", gap: 3,
                              }}>
                                {REACTION_EMOJIS.map((emoji) => (
                                  <button key={emoji} onClick={() => toggleReaction(m.id, emoji)} style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    fontSize: 18, padding: "2px 4px",
                                    borderRadius: 6,
                                    transition: "transform 0.1s",
                                  }}
                                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Composer */}
            {canChat ? (
              <div className="ccb-grp-composer" style={{
                padding: "10px 14px", borderTop: `1px solid ${T.borderSoft}`,
                background: T.card,
              }}>
                {/* Preview reply en attente */}
                {replyTo && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", marginBottom: 8,
                    background: T.violetSoft, borderLeft: `3px solid ${T.violet}`,
                    borderRadius: "0 10px 10px 0",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.violet, marginBottom: 2 }}>
                        ↩ Réponse à {replyTo.user_profiles?.display_name || "Membre"}
                      </div>
                      <div style={{
                        fontSize: 12, color: T.textSoft, lineHeight: 1.4,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        fontStyle: "italic",
                      }}>
                        {replyTo.content || (replyTo.attachment_type === "image" ? "🖼️ Image" : replyTo.attachment_type === "pdf" ? "📄 PDF" : "📎 Pièce jointe")}
                      </div>
                    </div>
                    <button onClick={() => setReplyTo(null)} title="Annuler" style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: T.textMuted, fontSize: 14,
                    }}>✕</button>
                  </div>
                )}

                {/* Indicateur typing */}
                {typingUsers.size > 0 && (
                  <div style={{
                    fontSize: 11, color: T.textMuted,
                    fontStyle: "italic", marginBottom: 6, paddingLeft: 4,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      <span style={typingDot(0)} />
                      <span style={typingDot(150)} />
                      <span style={typingDot(300)} />
                    </span>
                    {[...typingUsers.values()].slice(0, 2).join(", ")}
                    {typingUsers.size > 2 ? ` et ${typingUsers.size - 2} autres` : ""}
                    {" en train d'écrire…"}
                  </div>
                )}

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
                      value={text} onChange={handleTextChange}
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
              <div className="ccb-grp-composer" style={{
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

function typingDot(delayMs: number): React.CSSProperties {
  return {
    display: "inline-block",
    width: 5, height: 5, borderRadius: "50%",
    background: T.violet,
    animation: `ccb-typing-dot 1.2s ease-in-out infinite`,
    animationDelay: `${delayMs}ms`,
  };
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
// ─── Icons SVG modernes (style Lucide) ──────────────────────────────
function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="2"/>
      <circle cx="12" cy="12" r="2"/>
      <circle cx="12" cy="19" r="2"/>
    </svg>
  );
}

// ─── Helpers UI TopBar ──────────────────────────────────────────────
function topbarIconBtn(): React.CSSProperties {
  return {
    width: 36, height: 36, borderRadius: 999,
    background: "rgba(255,255,255,0.12)", color: "#fff",
    border: "none", cursor: "pointer", flexShrink: 0,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    transition: "background 150ms ease",
  };
}
function pill(): React.CSSProperties {
  return {
    background: "rgba(0,0,0,0.25)", color: "#fff",
    padding: "3px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 700,
  };
}

function MenuItem({ icon, label, onClick, href, danger = false }: {
  icon: string; label: string; onClick?: () => void; href?: string; danger?: boolean;
}) {
  const style: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 12,
    width: "100%", padding: "10px 14px",
    background: "none", border: "none",
    color: danger ? "#C24B7A" : T.text,
    fontSize: 13.5, fontFamily: F.body, fontWeight: 600,
    cursor: "pointer", textAlign: "left", textDecoration: "none",
    transition: "background 120ms ease",
  };
  function handleMouse(e: React.MouseEvent<HTMLElement>, on: boolean) {
    e.currentTarget.style.background = on ? T.surface2 : "transparent";
  }
  if (href) {
    return (
      <Link href={href} style={style} onClick={onClick}
        onMouseEnter={(e) => handleMouse(e, true)}
        onMouseLeave={(e) => handleMouse(e, false)}>
        <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button onClick={onClick} style={style}
      onMouseEnter={(e) => handleMouse(e, true)}
      onMouseLeave={(e) => handleMouse(e, false)}>
      <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

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

// ─── Pinned banner ───────────────────────────────────────────────────
function PinnedBanner({ pinned, onClick, isGroupAdmin, onUnpin }: {
  pinned: Message[];
  onClick: (id: string) => void;
  isGroupAdmin: boolean;
  onUnpin: (msg: Message) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = expanded ? pinned.length : 1;
  return (
    <div style={{
      borderBottom: `1px solid ${T.border}`, background: "rgba(212,175,55,0.07)",
      padding: "8px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.gold, fontWeight: 800, letterSpacing: 0.4, marginBottom: pinned.length > 0 ? 6 : 0 }}>
        <span>📌 Épinglé{pinned.length > 1 ? "s" : ""} ({pinned.length})</span>
        <span style={{ flex: 1 }} />
        {pinned.length > 1 && (
          <button onClick={() => setExpanded((v) => !v)} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: T.violet, fontWeight: 700, fontSize: 11,
          }}>
            {expanded ? "Réduire ▲" : "Tout voir ▼"}
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pinned.slice(0, visibleCount).map((m) => {
          const preview = (m.content || "").trim() || (m.attachment_url ? `📎 ${m.attachment_name || "Pièce jointe"}` : "");
          const author = m.user_profiles?.display_name || "Membre";
          return (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "6px 10px", background: T.card,
              border: `1px solid ${T.borderSoft}`, borderRadius: 8,
            }}>
              <button onClick={() => onClick(m.id)} style={{
                flex: 1, minWidth: 0, background: "none", border: "none",
                cursor: "pointer", textAlign: "left",
                color: T.text, fontFamily: F.body,
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: T.violet, marginBottom: 1 }}>
                  ↗ {author}
                </div>
                <div style={{
                  fontSize: 12.5, color: T.textSoft,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{preview || "Message épinglé"}</div>
              </button>
              {isGroupAdmin && (
                <button onClick={() => onUnpin(m)} title="Désépingler" style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: T.textMuted, fontSize: 13, padding: "2px 6px",
                }}>×</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
