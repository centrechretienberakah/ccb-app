import { useCallback, useEffect, useRef, useState } from "react";

interface Pos { x: number; y: number; }

/**
 * Rend un élément flottant déplaçable au doigt / à la souris (Pointer Events).
 * - Position mémorisée dans localStorage (clé `storageKey`).
 * - Distingue un clic d'un glissement via un seuil de 6px : le ref `moved`
 *   permet au onClick de l'élément d'ignorer le clic qui suit un déplacement.
 * - Reste toujours dans l'écran (clamp + re-clamp au resize).
 *
 * Usage :
 *   const { ref, handlers, style, moved } = useDraggable<HTMLButtonElement>("ma-cle");
 *   <button ref={ref} {...handlers} style={style}
 *     onClick={() => { if (moved.current) { moved.current = false; return; } ... }} />
 */
export function useDraggable<T extends HTMLElement = HTMLElement>(storageKey: string) {
  const ref = useRef<T | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const moved = useRef(false);
  const drag = useRef({ active: false, px: 0, py: 0, ox: 0, oy: 0 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === "number" && typeof p?.y === "number") setPos(p);
      }
    } catch { /* noop */ }
  }, [storageKey]);

  const clamp = useCallback((x: number, y: number): Pos => {
    const el = ref.current;
    const w = el?.offsetWidth ?? 0;
    const h = el?.offsetHeight ?? 0;
    const vw = typeof window !== "undefined" ? window.innerWidth : 0;
    const vh = typeof window !== "undefined" ? window.innerHeight : 0;
    return {
      x: Math.max(6, Math.min(x, vw - w - 6)),
      y: Math.max(6, Math.min(y, vh - h - 6)),
    };
  }, []);

  useEffect(() => {
    function onResize() { setPos((p) => (p ? clamp(p.x, p.y) : p)); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    drag.current = { active: true, px: e.clientX, py: e.clientY, ox: r.left, oy: r.top };
    moved.current = false;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!moved.current && Math.abs(dx) + Math.abs(dy) < 6) return;
    moved.current = true;
    setPos(clamp(d.ox + dx, d.oy + dy));
  }, [clamp]);

  const onPointerUp = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (moved.current) {
      setPos((p) => {
        if (p) { try { localStorage.setItem(storageKey, JSON.stringify(p)); } catch { /* noop */ } }
        return p;
      });
    }
  }, [storageKey]);

  const style: React.CSSProperties = pos
    ? { touchAction: "none", left: `${pos.x}px`, top: `${pos.y}px`, right: "auto", bottom: "auto", margin: 0 }
    : { touchAction: "none" };

  return { ref, handlers: { onPointerDown, onPointerMove, onPointerUp }, style, moved };
}
