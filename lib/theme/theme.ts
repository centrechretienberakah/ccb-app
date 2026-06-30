// Thème CCB — source de vérité partagée entre les toggles.
//
// On écrit le thème À LA FOIS dans :
//   • l'attribut data-theme sur <html>  → applique le thème tout de suite
//   • localStorage('ccb-theme')          → mémoire côté appareil
//   • un cookie 'ccb-theme'              → permet au SERVEUR de rendre le bon
//                                          data-theme dès le HTML initial
//                                          (aucune bascule au rafraîchissement)

export type Theme = "light" | "dark";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function applyThemeEverywhere(theme: Theme): void {
  try {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("ccb-theme", theme);
    document.cookie = `ccb-theme=${theme};path=/;max-age=${ONE_YEAR};SameSite=Lax`;
  } catch {
    /* environnement sans DOM / stockage bloqué → no-op */
  }
}

/** Thème enregistré côté appareil (localStorage prioritaire, sinon cookie), sinon null. */
export function readSavedTheme(): Theme | null {
  try {
    const ls = localStorage.getItem("ccb-theme");
    if (ls === "light" || ls === "dark") return ls;
    const m = document.cookie.match(/(?:^|;\s*)ccb-theme=(light|dark)/);
    if (m) return m[1] as Theme;
  } catch { /* noop */ }
  return null;
}
