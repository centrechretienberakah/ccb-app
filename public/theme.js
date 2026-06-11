try {
  var s = localStorage.getItem('ccb-theme');
  var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', s || (d ? 'dark' : 'light'));
} catch {
  // L'omission du (e) supprime l'avertissement ESLint
}