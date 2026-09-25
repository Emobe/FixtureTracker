/**
 * Blocking script run before paint (see app/layout.tsx <head>) to apply the
 * saved theme class before React hydrates, avoiding a flash of the wrong
 * theme. Deliberately not using next-themes: its ThemeProvider renders a
 * <script> tag from a client component, which trips React 19's "script
 * tags are never executed when rendering on the client" dev warning
 * (a real incompatibility between next-themes 0.4.6 and React 19/Next 16,
 * not something fixable from our side) — plain inline script from this
 * Server Component sidesteps it entirely.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;
