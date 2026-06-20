// Pre-paint theme application. Runs synchronously in <head> (before <body>
// parses) so the resolved light/dark scheme is in place for the very first
// paint — including a manual override that differs from the OS preference.
// Without this the page paints under the OS scheme, then theme.js (loaded at
// the bottom of <body>) flips data-theme late, flashing the wrong background
// on every navigation. Setting style.colorScheme here also makes the browser's
// UA canvas (painted before theme.css resolves) match the theme, killing the
// black/white flash in the inter-page gap. apply() in theme.js does the same
// pair on toggle; this is the pre-paint duplicate. Loaded as an external file
// because the page CSP forbids inline scripts.
(function () {
  var KEY = "leyline-web:theme";
  var MODES = ["dark", "system", "light"];
  var stored;
  try { stored = localStorage.getItem(KEY); } catch (e) { stored = null; }
  if (MODES.indexOf(stored) === -1) stored = "system";
  var resolved = stored === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : stored;
  var root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
})();
