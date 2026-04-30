"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("Erreur lors de la création du compte : " + error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background:
            "linear-gradient(160deg, var(--violet-dark) 0%, var(--violet) 60%, var(--violet-light) 100%)",
        }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-10 text-center"
          style={{
            background: "rgba(255,255,255,0.97)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2
            className="font-cinzel font-bold text-xl mb-3"
            style={{ color: "var(--violet)" }}
          >
            Bienvenue dans la famille !
          </h2>
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            Un email de confirmation a été envoyé à{" "}
            <strong>{form.email}</strong>. Veuillez cliquer sur le lien pour
            activer votre compte.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-6 py-3 rounded-full font-bold text-sm text-white transition-all hover:-translate-y-0.5"
            style={{ background: "var(--violet)" }}
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background:
          "linear-gradient(160deg, var(--violet-dark) 0%, var(--violet) 60%, var(--violet-light) 100%)",
      }}
    >
      <div
        className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full opacity-10"
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
            Créer un compte
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Rejoignez la famille Berakah ✨
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.97)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <form onSubmit={handleRegister} className="space-y-4">
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

            {[
              {
                name: "fullName",
                label: "Nom complet",
                type: "text",
                placeholder: "Jean Dupont",
              },
              {
                name: "email",
                label: "Adresse email",
                type: "email",
                placeholder: "vous@example.com",
              },
              {
                name: "password",
                label: "Mot de passe",
                type: "password",
                placeholder: "Min. 8 caractères",
              },
              {
                name: "confirmPassword",
                label: "Confirmer le mot de passe",
                type: "password",
                placeholder: "Répétez votre mot de passe",
              },
            ].map((field) => (
              <div key={field.name}>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {field.label}
                </label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
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
            ))}

            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              En créant un compte, vous acceptez nos{" "}
              <Link
                href="/terms"
                className="hover:underline"
                style={{ color: "var(--violet)" }}
              >
                Conditions d&apos;utilisation
              </Link>{" "}
              et notre{" "}
              <Link
                href="/privacy"
                className="hover:underline"
                style={{ color: "var(--violet)" }}
              >
                Politique de confidentialité
              </Link>
              .
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all mt-2"
              style={{
                background: loading ? "var(--border)" : "var(--violet)",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Création en cours..." : "Créer mon compte →"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Vous avez déjà un compte ?{" "}
            <Link href="/auth/login" className="font-bold hover:underline" style={{ color: "var(--violet)" }}>
              Se connecter
            </Link>
          </p>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          © 2026 Centre Chrétien Berakah
        </p>
      </div>
    </div>
  );
}
