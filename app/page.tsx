"use client";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&display=swap');

        /* ── Reset landing ── */
        html, body { background: #F8F5F1 !important; }

        /* ── Keyframes ── */
        @keyframes ccb-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-9px); }
        }
        @keyframes ccb-glow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50%       { opacity: 0.75; transform: scale(1.08); }
        }
        @keyframes ccb-in-1 { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ccb-in-2 { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ccb-in-3 { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ccb-in-4 { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ccb-in-5 { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }

        .ccb-f1 { animation: ccb-in-1 0.65s cubic-bezier(.22,1,.36,1) 0.05s both; }
        .ccb-f2 { animation: ccb-in-2 0.65s cubic-bezier(.22,1,.36,1) 0.18s both; }
        .ccb-f3 { animation: ccb-in-3 0.65s cubic-bezier(.22,1,.36,1) 0.32s both; }
        .ccb-f4 { animation: ccb-in-4 0.65s cubic-bezier(.22,1,.36,1) 0.46s both; }
        .ccb-f5 { animation: ccb-in-5 0.65s cubic-bezier(.22,1,.36,1) 0.60s both; }

        .ccb-logo-wrap { animation: ccb-float 5s ease-in-out infinite; }
        .ccb-glow-orb  { animation: ccb-glow  4s ease-in-out infinite; }

        /* ── CTA button ── */
        .ccb-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #5A2CA0;
          color: #ffffff;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 16px 44px;
          border-radius: 999px;
          box-shadow: 0 8px 28px rgba(90,44,160,0.32), 0 2px 8px rgba(90,44,160,0.18);
          transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
          white-space: nowrap;
        }
        .ccb-cta:hover {
          background: #6d36c9;
          transform: translateY(-3px);
          box-shadow: 0 14px 40px rgba(90,44,160,0.42), 0 4px 12px rgba(90,44,160,0.22);
        }
        .ccb-cta:active {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(90,44,160,0.28);
        }

        /* Mobile */
        @media (max-width: 500px) {
          .ccb-cta {
            width: 100%;
            padding: 17px 24px;
            font-size: 0.86rem;
          }
          .ccb-titre-line1 { white-space: nowrap !important; }
          .ccb-titre-line2 { white-space: nowrap !important; }
        }
      `}</style>

      {/* Page wrapper */}
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(150deg, #F8F5F1 0%, #EDE7FA 55%, #F8F5F1 100%)",
        fontFamily: "'Montserrat', sans-serif",
        padding: "56px 28px",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Ambient glow background */}
        <div className="ccb-glow-orb" style={{
          position: "fixed",
          top: "38%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 640, height: 640,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(90,44,160,0.09) 0%, transparent 68%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        {/* Content column */}
        <div style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
          textAlign: "center",
          width: "100%",
          maxWidth: 520,
        }}>

          {/* ── LOGO ── */}
          <div className="ccb-f1" style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            {/* Halo glow */}
            <div style={{
              position: "absolute",
              width: 190, height: 190,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(90,44,160,0.13) 0%, transparent 68%)",
            }} />
            {/* Glass disc */}
            <div style={{
              position: "absolute",
              width: 152, height: 152,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              boxShadow: "0 4px 24px rgba(90,44,160,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
            }} />
            {/* Outer ring */}
            <div style={{
              position: "absolute",
              width: 166, height: 166,
              borderRadius: "50%",
              border: "1px solid rgba(90,44,160,0.22)",
            }} />
            {/* Inner ring */}
            <div style={{
              position: "absolute",
              width: 142, height: 142,
              borderRadius: "50%",
              border: "1px solid rgba(90,44,160,0.1)",
            }} />
            {/* Floating logo */}
            <div className="ccb-logo-wrap" style={{ position: "relative", zIndex: 2 }}>
              <Image
                src="/logo-ccb.png"
                alt="Centre Chrétien Berakah"
                width={116}
                height={116}
                priority
                style={{
                  objectFit: "contain",
                  filter: "drop-shadow(0 6px 20px rgba(90,44,160,0.22)) drop-shadow(0 2px 6px rgba(0,0,0,0.08))",
                  borderRadius: "50%",
                }}
              />
            </div>
          </div>

          {/* ── TAGLINE CAPSULE ── */}
          <div className="ccb-f2" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0,
            padding: "8px 22px",
            borderRadius: 999,
            background: "rgba(237,231,250,0.75)",
            border: "1px solid rgba(90,44,160,0.22)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "#5A2CA0",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 12px rgba(90,44,160,0.08)",
          }}>
            Former&nbsp;•&nbsp;Transformer&nbsp;•&nbsp;Bénir
          </div>

          {/* ── TITRE PRINCIPAL ── */}
          <div className="ccb-f3" style={{ lineHeight: 1.08 }}>
            {/* Ligne 1 */}
            <div className="ccb-titre-line1" style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 700,
              fontSize: "clamp(1.3rem, 5.2vw, 2.6rem)",
              color: "#111111",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              marginBottom: "0.12em",
            }}>
              Centre Chrétien
            </div>
            {/* Ligne 2 */}
            <div className="ccb-titre-line2" style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: "clamp(2.8rem, 12vw, 5.2rem)",
              color: "#5A2CA0",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              lineHeight: 1,
              textShadow: "0 2px 32px rgba(90,44,160,0.18)",
            }}>
              Berakah
            </div>
          </div>

          {/* ── VISION / SLOGAN ── */}
          <div className="ccb-f4" style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
            maxWidth: 400,
          }}>
            <p style={{
              fontFamily: "'Montserrat', sans-serif",
              color: "#555555",
              fontSize: "clamp(0.8rem, 2.6vw, 0.95rem)",
              fontWeight: 400,
              lineHeight: 1.8,
              margin: 0,
            }}>
              Former des disciples, transformer les vies,
            </p>
            <p style={{
              fontFamily: "'Montserrat', sans-serif",
              color: "#5A2CA0",
              fontSize: "clamp(0.8rem, 2.6vw, 0.95rem)",
              fontWeight: 500,
              fontStyle: "italic",
              lineHeight: 1.8,
              margin: 0,
            }}>
              Manifester la bénédiction
            </p>
          </div>

          {/* ── CTA ── */}
          <div className="ccb-f5" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <Link href="/auth/register" className="ccb-cta">
              Rejoindre la famille CCB
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
