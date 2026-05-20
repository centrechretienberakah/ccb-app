"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  videoId: string;
  initialWatchedSecs: number;
  durationSecs: number | null;
  isAuth: boolean;
  /** Called when watched_secs crosses 90% of duration (auto-completion). */
  onComplete?: () => void;
  /** Called every heartbeat with the new watched_secs (for UI feedback). */
  onTick?: (secs: number) => void;
  /** Heartbeat interval in seconds, defaults to 15. */
  intervalSecs?: number;
}

/**
 * Invisible component that pulses watched_secs to DB every N seconds while
 * the tab is visible. Stops when hidden, resumes on visibility.
 *
 * Doesn't render any UI.
 */
export default function WatchTracker({
  videoId, initialWatchedSecs, durationSecs, isAuth, onComplete, onTick, intervalSecs = 15,
}: Props) {
  const watchedRef = useRef<number>(initialWatchedSecs);
  const completedRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibleRef = useRef<boolean>(typeof document === "undefined" ? true : document.visibilityState === "visible");

  useEffect(() => {
    if (!isAuth) return;

    function tick() {
      if (!visibleRef.current) return;
      watchedRef.current += intervalSecs;
      onTick?.(watchedRef.current);

      // Persist async
      (async () => {
        const supabase = createClient();
        try {
          await supabase.rpc("jdtv_heartbeat", {
            p_video_id: videoId,
            p_watched_secs: watchedRef.current,
          });
        } catch { /* noop */ }
      })();

      // Auto complete callback
      if (!completedRef.current && durationSecs && watchedRef.current >= durationSecs * 0.9) {
        completedRef.current = true;
        onComplete?.();
      }
    }

    function handleVisibility() {
      visibleRef.current = document.visibilityState === "visible";
    }

    document.addEventListener("visibilitychange", handleVisibility);
    timerRef.current = setInterval(tick, intervalSecs * 1000);

    // Final flush on unmount / beforeunload
    function flush() {
      if (!watchedRef.current) return;
      try {
        const supabase = createClient();
        // Fire and forget
        void supabase.rpc("jdtv_heartbeat", {
          p_video_id: videoId,
          p_watched_secs: watchedRef.current,
        });
      } catch { /* noop */ }
    }
    window.addEventListener("beforeunload", flush);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", flush);
      if (timerRef.current) clearInterval(timerRef.current);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isAuth, intervalSecs, durationSecs]);

  return null;
}

/**
 * Hook variant for components that need access to live watched_secs.
 */
export function useWatchedSecs(initial: number) {
  const [watched, setWatched] = useState<number>(initial);
  return [watched, setWatched] as const;
}
