"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Inner component that uses useSearchParams — must be wrapped in Suspense
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou mot de passe incorrect. Veuillez réessayer.");
      setLoading(false);
    } else {
      router.push(redirect);
      router.refresh();
    }
  };

  return (
    <div
      className="rounded-2xl p-8"
      style={{
        background: "rgba(255,255,255,0.95)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}
    >
      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div
            className="text-sm px-4 py-3 rounded-xl"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div>
          <label
            className="block text-sm font-semibold mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Adresse email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@example.com"
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              border: "2px solid var(--border)",
              color: "var(--text-primary)",
              background: "var(--surface)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--violet)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Mot de passe
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium hover:underline"
              style={{ color: "var(--violet)" }}
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              border: "2px solid var(--border)",
              color: "var(--text-primary)",
              background: "var(--surface)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--violet)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all"
          style={{
            background: loading ? "var(--border)" : "var(--violet)",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Connexion en cours..." : "Se connecter →"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          ou
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      </div>

      <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        Pas encore de compte ?{" "}
        <Link
          href="/auth/register"
          className="font-bold hover:underline"
          style={{ color: "var(--violet)" }}
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(160deg, var(--violet-dark) 0%, var(--violet) 60%, var(--violet-light) 100%)",
      }}
    >
      {/* Decorative glow */}
      <div
        className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full opacity-10"
        style={{ background: "var(--gold)", filter: "blur(80px)" }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3"
              style={{
                background: "rgba(212,175,55,0.2)",
                border: "2px solid rgba(212,175,55,0.4)",
              }}
            >
              CCB
            </div>
          </Link>
          <h1
            className="font-cinzel font-bold text-white text-2xl"
            style={{ letterSpacing: "0.05em" }}
          >
            Connexion
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Bon retour dans la famille Berakah 🙏
          </p>
        </div>

        {/* Wrap the form in Suspense — required by useSearchParams */}
        <Suspense
          fallback={
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "rgba(255,255,255,0.95)" }}
            >
              <div
                className="animate-pulse text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Chargement...
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="text-center text-white/40 text-xs mt-6">
          &copy; 2026 Centre Chretien Berakah
        </p>
      </div>
    </div>
  );
}
