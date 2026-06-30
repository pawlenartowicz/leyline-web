// _panel behaviour: tab switching, the responsive drawer, the theme toggle,
// and the form auto-submit / confirm hooks the section markup used to carry as
// inline on* attributes. Loaded as an external file because the page CSP
// (script-src 'self', no 'unsafe-inline') blocks both inline <script> blocks
// and inline event-handler attributes — the same reason theme.js / theme-init.js
// / mode-persist.js are external. theme-init.js in <head> owns the pre-paint
// scheme; this file owns the live UI.
(function () {
  var THEME_KEY = "leyline-web:theme";

  // Tab switch: nav-item click reveals its section (#id === data-target) and
  // hides the rest; also closes the mobile drawer.
  var nav = document.getElementById("nav");
  var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
  var app = document.getElementById("app");
  if (nav) nav.addEventListener("click", function (e) {
    var item = e.target.closest ? e.target.closest(".nav-item") : null;
    if (!item) return;
    var items = nav.querySelectorAll(".nav-item");
    for (var i = 0; i < items.length; i++) items[i].setAttribute("aria-current", "false");
    item.setAttribute("aria-current", "true");
    var target = item.getAttribute("data-target");
    for (var j = 0; j < pages.length; j++) pages[j].hidden = pages[j].id !== target;
    if (app) app.setAttribute("data-drawer", "closed");
  });

  // Theme toggle: flip the resolved scheme and persist the concrete choice
  // under the same key the read pages use, so the panel and the site agree.
  // Mirrors the data-theme + colorScheme pair theme-init.js / theme.js set.
  var themeBtn = document.getElementById("themeBtn");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var root = document.documentElement;
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    root.style.colorScheme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  // Responsive drawer open/close.
  var ob = document.querySelector("[data-open-drawer]");
  if (ob && app) ob.addEventListener("click", function () { app.setAttribute("data-drawer", "open"); });
  var cb = document.querySelector("[data-close-drawer]");
  if (cb && app) cb.addEventListener("click", function () { app.setAttribute("data-drawer", "closed"); });

  // Vault switcher: navigate to the chosen vault on change (?vault=<id>).
  document.addEventListener("change", function (e) {
    var sel = e.target;
    if (sel && sel.id === "vaultSwitch" && sel.form) sel.form.submit();
  });

  // Confirm destructive submits (revoke / destroy) — replaces
  // onsubmit="return confirm(...)". The prompt rides in data-confirm.
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || !form.getAttribute) return;
    var msg = form.getAttribute("data-confirm");
    if (msg && !window.confirm(msg)) e.preventDefault();
  });
})();
