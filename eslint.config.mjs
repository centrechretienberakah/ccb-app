import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `any` toléré : la sûreté de type réelle est garantie par tsc (strict).
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      // <img> volontaire (avatars/couvertures externes Supabase) — next/image
      // inadapté pour des URLs distantes arbitraires.
      "@next/next/no-img-element": "off",
      // Apostrophes en texte JSX : purement cosmétique, rendu correct.
      "react/no-unescaped-entities": "off",
      // Règles EXPÉRIMENTALES du React Compiler (eslint-plugin-react-hooks) :
      // elles signalent des patterns parfaitement valides (fetch puis setState
      // dans un effect, lecture d'une ref pilotée par un tick, etc.). On garde
      // les règles STABLES actives (rules-of-hooks, exhaustive-deps).
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
