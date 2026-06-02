"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook IntersectionObserver : renvoie [ref, inView].
 * `inView` passe à true une fois que l'élément entre dans le viewport
 * (puis reste true — reveal one-shot).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px", ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, inView];
}

type RevealProps = {
  children: React.ReactNode;
  /** délai en ms */
  delay?: number;
  /** translation verticale initiale en px (slide-up) */
  y?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "section" | "li" | "article" | "span";
};

/**
 * Wrapper de reveal au scroll : fade-in + slide-up doux quand l'élément
 * entre dans le viewport. Équivalent visuel d'un framer-motion whileInView.
 */
export function Reveal({
  children, delay = 0, y = 22, className, style, as = "div",
}: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 0.7s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
        willChange: "opacity, transform",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * Compteur animé : monte de 0 → `to` quand il entre dans le viewport.
 * `suffix` (ex "+", "k") ajouté après le nombre.
 */
export function Counter({
  to, duration = 1400, suffix = "", prefix = "",
}: { to: number; duration?: number; suffix?: string; prefix?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return <span ref={ref}>{prefix}{val.toLocaleString("fr-FR")}{suffix}</span>;
}

/**
 * Compte à rebours vers une date cible. Renvoie {days, hours, minutes, seconds}.
 */
export function useCountdown(targetISO: string) {
  const [left, setLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, done: false });

  useEffect(() => {
    const target = new Date(targetISO).getTime();
    function compute() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setLeft({ days, hours, minutes, seconds, done: false });
    }
    compute();
    const t = setInterval(compute, 1000);
    return () => clearInterval(t);
  }, [targetISO]);

  return left;
}
