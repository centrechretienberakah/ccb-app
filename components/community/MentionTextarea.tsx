"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { detectMentionAtCursor, normName, type MemberLookup } from "@/lib/community/mentions";

interface Props {
  value: string;
  onChange: (v: string) => void;
  members: MemberLookup[];
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  style?: React.CSSProperties;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  autoFocus?: boolean;
}

export default function MentionTextarea({
  value, onChange, members, placeholder, rows = 3,
  multiline = true, style, onKeyDown, autoFocus,
}: Props) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [suggestions, setSuggestions] = useState<MemberLookup[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);

  const updateSuggestions = useCallback((text: string, cursorPos: number) => {
    const detected = detectMentionAtCursor(text, cursorPos);
    if (!detected) {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionStart(null);
      return;
    }
    const prefix = normName(detected.prefix);
    if (prefix.length < 1) {
      // @ seul → montre top 8 membres
      setSuggestions(members.slice(0, 8));
      setShowSuggestions(true);
      setMentionStart(detected.start);
      setActiveIdx(0);
      return;
    }
    const matches = members
      .filter((m) => m.display_name && normName(m.display_name).startsWith(prefix))
      .slice(0, 8);
    if (matches.length === 0) {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionStart(null);
      return;
    }
    setSuggestions(matches);
    setShowSuggestions(true);
    setMentionStart(detected.start);
    setActiveIdx(0);
  }, [members]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart ?? newValue.length;
    onChange(newValue);
    updateSuggestions(newValue, cursor);
  }

  function selectSuggestion(member: MemberLookup) {
    if (mentionStart == null || !member.display_name) return;
    const el = inputRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const mention = "@" + member.display_name + " ";
    const newValue = before + mention + after;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(null);
    // Place le curseur juste après la mention
    setTimeout(() => {
      const pos = before.length + mention.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectSuggestion(suggestions[activeIdx]);
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }
    onKeyDown?.(e);
  }

  function handleClickOutside(e: MouseEvent) {
    if (!inputRef.current?.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
  }
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const InputEl = multiline ? "textarea" : "input";

  return (
    <div style={{ position: "relative" }}>
      <InputEl
        ref={inputRef as React.RefObject<HTMLTextAreaElement & HTMLInputElement>}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={multiline ? rows : undefined}
        autoFocus={autoFocus}
        style={style}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4,
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 4,
          minWidth: 240,
          maxWidth: "100%",
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
          zIndex: 100,
          maxHeight: 280,
          overflowY: "auto",
        }}>
          {suggestions.map((m, i) => {
            const initials = (m.display_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            const active = i === activeIdx;
            return (
              <button
                key={m.user_id}
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(m); }}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px",
                  background: active ? "rgba(91, 33, 182,0.1)" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}>
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg, #5B21B6, #4C1D95)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff",
                  }}>{initials}</div>
                )}
                <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: active ? 700 : 500 }}>
                  {m.display_name || "Membre"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
