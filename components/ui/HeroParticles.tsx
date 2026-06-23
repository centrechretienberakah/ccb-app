import type { CSSProperties } from "react";

// Couche décorative façon flyer « Semblable à Christ » :
// deux halos (or + violet) + particules dorées montantes, pour les
// en-têtes de module. Purement visuel (aria-hidden, pointer-events:none).
// À placer en PREMIER enfant d'un conteneur position:relative; overflow:hidden,
// le contenu de l'en-tête devant porter position:relative; z-index:1.

type Dot = { left: string; s: number; d: string; delay: string };

const DOTS: Dot[] = [
  { left: "6%",  s: 4, d: "6.4s", delay: "0s"   },
  { left: "16%", s: 3, d: "7.6s", delay: "1.3s" },
  { left: "28%", s: 5, d: "6.8s", delay: "2.6s" },
  { left: "40%", s: 3, d: "8.0s", delay: "0.7s" },
  { left: "52%", s: 4, d: "7.0s", delay: "3.1s" },
  { left: "63%", s: 3, d: "6.5s", delay: "1.8s" },
  { left: "74%", s: 5, d: "7.8s", delay: "0.4s" },
  { left: "84%", s: 3, d: "6.7s", delay: "2.2s" },
  { left: "92%", s: 4, d: "8.2s", delay: "3.6s" },
  { left: "47%", s: 3, d: "7.3s", delay: "4.4s" },
];

export default function HeroParticles() {
  return (
    <div className="ccb-heroparts" aria-hidden="true">
      <span className="ccb-heroparts-halo ccb-heroparts-halo-1" />
      <span className="ccb-heroparts-halo ccb-heroparts-halo-2" />
      {DOTS.map((p, i) => (
        <span
          key={i}
          className="ccb-heroparts-dot"
          style={{
            left: p.left,
            width: p.s,
            height: p.s,
            ["--d"]: p.d,
            ["--delay"]: p.delay,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
