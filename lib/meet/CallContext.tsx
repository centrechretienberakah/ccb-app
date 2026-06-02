"use client";

/**
 * CallContext — état global d'appel CCB Meet.
 *
 * But : permettre à un utilisateur de naviguer dans l'app pendant un appel
 * SANS être déconnecté. Le LiveKitRoom est monté UNE SEULE FOIS au niveau
 * du layout (via PersistentCallHost), au-dessus du routing. Les pages
 * (notamment /community/groups/[id]/meeting) ne mountent plus leur propre
 * LiveKitRoom — elles lisent l'état depuis ce contexte.
 *
 * Quand l'utilisateur est sur /meeting → vue full screen (Stage)
 * Quand il navigue ailleurs → mini-player flottant
 * Le LiveKit ne se reconnecte JAMAIS pendant la session.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface CallState {
  active: boolean;
  groupId: string | null;
  groupName: string | null;
  mode: "audio" | "video" | null;
  token: string | null;
  serverUrl: string | null;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  status: "idle" | "fetching" | "connecting" | "live" | "error";
  error: string | null;
}

interface CallContextValue {
  state: CallState;
  startCall: (opts: {
    groupId: string;
    groupName: string;
    mode: "audio" | "video";
    displayName?: string;
  }) => Promise<void>;
  endCall: () => void;
  setAudio: (enabled: boolean) => void;
  setVideo: (enabled: boolean) => void;
}

const initial: CallState = {
  active: false,
  groupId: null,
  groupName: null,
  mode: null,
  token: null,
  serverUrl: null,
  displayName: "Membre CCB",
  audioEnabled: true,
  videoEnabled: false,
  status: "idle",
  error: null,
};

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CallState>(initial);

  const startCall = useCallback(async (opts: {
    groupId: string;
    groupName: string;
    mode: "audio" | "video";
    displayName?: string;
  }) => {
    // Si déjà actif dans la même room, ne re-fetch pas
    if (state.active && state.groupId === opts.groupId && state.mode === opts.mode) {
      return;
    }
    setState((s) => ({
      ...s,
      groupId: opts.groupId,
      groupName: opts.groupName,
      mode: opts.mode,
      displayName: opts.displayName ?? s.displayName,
      status: "fetching",
      error: null,
      videoEnabled: opts.mode === "video",
    }));
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: opts.groupId, mode: opts.mode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error ?? `HTTP ${res.status}`;
        setState((s) => ({ ...s, status: "error", error: msg }));
        return;
      }
      const data = await res.json() as {
        token: string; url: string; displayName?: string;
      };
      setState((s) => ({
        ...s,
        active: true,
        token: data.token,
        serverUrl: data.url,
        displayName: data.displayName ?? s.displayName,
        status: "live",
      }));
    } catch (e) {
      setState((s) => ({ ...s, status: "error", error: (e as Error).message }));
    }
  }, [state.active, state.groupId, state.mode]);

  const endCall = useCallback(() => {
    setState(initial);
  }, []);

  const setAudio = useCallback((enabled: boolean) => {
    setState((s) => ({ ...s, audioEnabled: enabled }));
  }, []);

  const setVideo = useCallback((enabled: boolean) => {
    setState((s) => ({ ...s, videoEnabled: enabled }));
  }, []);

  return (
    <CallContext.Provider value={{ state, startCall, endCall, setAudio, setVideo }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
