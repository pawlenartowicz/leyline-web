---
title: Web reader 404s
---

# Web reader 404s

If the entire site is returning errors rather than a single page, jump to [[#`leyline-web` returns 503 for the whole site]].

## Page exists in the vault but returns 404

**Likely causes:**
- The path is blocked by `webignore [view]`.
- The file extension isn't in the supported list (`.md`, `.html`, images, `.pdf`, `.typ`, `.csv`/`.tsv`/`.psv`, configured `text_extensions`).
- The path contains a hidden component (starts with `.`), which is always blocked.
- The URL segment collides with a reserved name: `_theme`, `_login`, `_logout`, `_admin`, `_search`, or any `@`-prefixed segment.

**Fix:**
1. Check the webignore rules: `leyline-web rules --effective --config <path>` — this prints the merged rules per vault, per section.
2. If the file should be visible, remove the matching rule from `.leyline/vaultconfig/webignore` under `[view]`.
3. If the extension is missing, add it to `text_extensions` in `config.yaml` or rename the file.

**Where to dig next:** [[../vault-management/web-reader-setup|Web reader setup]]

---

## Login redirect loop — `/_login` redirects to itself

**Cause:** The vault's `web.yaml` has `auth.redirect_to_login: true` but `config.yaml` has `login_path: ""` (login disabled). The server refuses to start in this state normally, but if config was changed after startup, behavior may be inconsistent.

**Fix:**
1. Either enable login: set `login_path: /_login` in `config.yaml`.
2. Or disable the redirect: set `auth.redirect_to_login: false` in the vault's `.leyline/vaultconfig/web.yaml`.
3. Send `SIGHUP` to reload config: `kill -HUP <pid>` — or restart `leyline-web`.

---

## Authenticated user gets 404 instead of page content

**Cause:** The page is under `.leyline/` (always 404 for non-admins, never a login redirect), or the authenticated user's key doesn't have `sync.pull` on this vault.

**Fix:**
1. Check the cookie's vault scope: the web reader auth is per-vault — a key for vault `A` doesn't grant access to vault `B`.
2. Ask a vault admin to verify the key has at least the `reader` role: `leyline admin key list <vault>`.
3. If the path starts with `.leyline/`, that's intentional: the engine hides admin files from non-admins regardless of other config.

---

## `leyline-web` returns 503 for the whole site

**Cause:** No vault is registered. When `leyline-web` starts with an empty `vaults:` section, it serves a built-in 503 fallback page ("No vaults configured yet…") for every request, including `/_health`. A genuine whole-path 404 only occurs for an unmatched URL when at least one vault is registered.

A separate startup failure: if any vault's `web.yaml` fails to parse, `server.New()` returns an error and `leyline-web` exits with code 2 — the binary never serves traffic in that state. This is surfaced in startup logs, not as a runtime 404.

**Fix:**
1. Check `config.yaml` — verify the `vaults:` section maps at least one prefix to an absolute path.
2. If `/_health` returns 503, the no-vaults fallback is active: add at least one vault entry and restart.
3. If `leyline-web` failed to start, check startup logs for `web.yaml parse error` and fix the offending file, then restart.

---

## PDF page renders blank / returns 501

**Cause:** `poppler` (`pdftotext`, `pdftocairo`) is not installed or not on `$PATH`. The web reader shells out to poppler for PDF rendering.

**Fix:**
1. Install poppler: `apt install poppler-utils` / `dnf install poppler-utils`.
2. Restart `leyline-web`.
3. If you don't need PDF rendering, the 501 response is safe to ignore — raw PDF download via `/_raw/<vault>/<path>` still works.

**Where to dig next:** [[../server-management/web-reader-hosting|Web reader hosting]]

---

## Wikilink resolves to wrong page or shows as broken

**Cause:** Wikilinks resolve by exact path first, then basename, then case-folded basename; on a basename collision the lexicographically-first path wins.

**Fix:**
1. Use full relative paths in wikilinks to disambiguate: `[[notes/topic/my-file|My file]]` instead of `[[my-file]]`.
2. Rename one of the conflicting files.

---

**See also:** [[../vault-management/web-reader-setup|Web reader setup]] · [[../server-management/web-reader-hosting|Web reader hosting]]
