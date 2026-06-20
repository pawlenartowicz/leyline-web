// Pre-paint: persist the edit/preview/split choice across navigation,
// including arrivals via bare URLs (bookmarks, shared links, new tabs).
// Server-side PropagateModeInLinks rewrites links inside the rendered
// markdown body, but sidebar/header/breadcrumb links are emitted by
// templates and don't get rewritten — that's the gap this script closes.
// Loaded as an external file because the page CSP forbids inline scripts.
(function () {
  var KEY = "leyline-web:mode";
  var loc = window.location;
  var params = new URLSearchParams(loc.search);
  var urlMode = params.get("mode");
  var safeGet = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var safeSet = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };

  if (urlMode === "edit" || urlMode === "split" || urlMode === "preview") {
    safeSet(urlMode);
  } else if (!urlMode) {
    var stored = safeGet();
    if (stored === "edit" || stored === "split") {
      params.set("mode", stored);
      loc.replace(loc.pathname + "?" + params.toString() + loc.hash);
      return;
    }
  }

  // Clicking the Preview tab navigates to a bare URL — record the choice
  // before navigation so the pre-paint check above doesn't bounce back.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a.edit-mode-switch__option");
    if (!a) return;
    var mode = "preview";
    if (a.classList.contains("edit-mode-switch__option--edit")) mode = "edit";
    else if (a.classList.contains("edit-mode-switch__option--split")) mode = "split";
    safeSet(mode);
  }, true);
})();
