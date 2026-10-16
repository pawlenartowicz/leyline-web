---
title: Web reader hosting
---

# Web reader hosting

`leyline-web` is a read-only HTTP frontend for vault content. It reads vault directories directly from the filesystem — there is no IPC with `leyline-server`. Files written by the sync server (via atomic rename) are picked up on the next request; no restart is needed for content updates.

The web reader is optional. If you don't need a public web view of vault content, skip this section entirely.

## Setup: instances

The `leyline-web` **engine** comes from the `leyline-web` package — installed at `/usr/bin/leyline-web` alongside `leyline-server` (see [[install-and-deploy|Install and deploy]]). The package ships a systemd template, `leyline-web@.service`, but starts nothing: each site is an opt-in **instance**.

An instance is a config file, `/etc/leyline-web/<name>.yaml`, run by the unit `leyline-web@<name>`. All instances on the box share one clone of the [`web`](https://github.com/pawlenartowicz/leyline-web) template repo (themes, example vaults, deploy stubs) at `/opt/leyline-web/themes`. Nobody edits files in that clone. Clone it once, at the tag that matches your installed engine minor:

```sh
sudo git clone https://github.com/pawlenartowicz/leyline-web /opt/leyline-web/themes
minor=$(leyline-web --version | cut -d. -f1,2)             # e.g. 0.8
sudo git -C /opt/leyline-web/themes checkout "$(sudo git -C /opt/leyline-web/themes tag -l "v${minor}.*" | sort -V | tail -1)"
```

The clone is root-owned and must be readable by the `leyline` user; so must each config file. Write `/etc/leyline-web/mysite.yaml` (next section), then `sudo systemctl enable --now leyline-web@mysite`. Check what the site serves with `curl -s http://127.0.0.1:8091/ | grep -o '<title>[^<]*'`. The bundled example vaults are at `/opt/leyline-web/themes/example-vaults/<name>`. To build the engine from source instead of installing the package, see §Manual install from tarballs in [[install-and-deploy|Install and deploy]].

## Config walkthrough

A site's config is `/etc/leyline-web/<name>.yaml`. A minimal one with every common key:

```yaml
# Public hostname. Used in absolute-URL contexts (auth redirects, HSTS).
domain: example.com

# Bind address. Use 127.0.0.1 if a reverse proxy handles TLS.
listen: "127.0.0.1:8091"

# Hot-reload themes without restarting. Set false in production.
dev_mode: false

# Default theme when a vault's web.yaml does not declare parent_theme.
# Must match a directory under the themes root.
default_theme: notes

# Map URL prefix → absolute vault path.
# Use absolute paths. Relative paths resolve against this file's directory, /etc/leyline-web.
vaults:
  "/":        /var/lib/leyline/vaults/main     # root prefix
  "/archive": /var/lib/leyline/vaults/archive  # sub-prefix

# File extensions served as syntax-highlighted text.
# .md, .html, .typ, .csv/.tsv/.psv, and image/SVG/PDF assets are always handled; everything not in that built-in set and not listed in text_extensions 404s.
text_extensions:
  - .py
  - .yaml
  - .json
  - .txt

# In-memory render cache limits.
cache_max_entries: 1000     # default: 1000
cache_max_bytes: 67108864   # default: 67108864 (64 MiB)

# Login path for cookie-based read auth. "" disables web login entirely.
# Routes GET/POST <login_path> and POST /_logout.
# Default: /_login
# login_path: /_login
```

### Vault prefix routing

Prefix matching is longest-first. A vault at `"/"` catches everything not matched by a longer prefix. Multiple vaults are fine; nested or overlapping prefixes are allowed, but the server logs a startup warning when one vault's prefix shadows a directory inside another (longest-prefix-first wins).

### Theme selection

The `default_theme` must correspond to a directory under `/opt/leyline-web/themes/config/themes/`. Per-vault overrides live in the vault's `.leyline/vaultconfig/web.yaml` (`parent_theme:` key). See the theme cascade documentation in `web-source.md` for inheritance rules.

Theme knobs that don't require engine changes (colors, font choices, JS feature flags) go in the `custom:` block of a theme's or vault's `web.yaml`. The engine merges per-key (vault wins), and templates read the result as `.Custom`. See [[../vault-management/web-reader-setup|web reader setup]] for per-vault web.yaml fields.

## systemd unit

The `leyline-web` package ships a **template** unit at `/usr/lib/systemd/system/leyline-web@.service` — you don't write it. Enable an instance by name; the name selects the config file, so `leyline-web@mysite` reads `/etc/leyline-web/mysite.yaml`:

```sh
sudo systemctl enable --now leyline-web@mysite
journalctl -u leyline-web@mysite -f
```

The unit runs as the `leyline` user with `ExecStart=/usr/bin/leyline-web -config /etc/leyline-web/mysite.yaml -themes /opt/leyline-web/themes/config/themes`, under the same hardening profile as the server (`ProtectSystem=strict`, `MemoryDenyWriteExecute`, restricted syscalls and address families). PDF and search caches go to `/var/cache/leyline-web/{pdf,search}` via `CacheDirectory=`. `leyline-web` needs no access to the sync server's socket or WAL and reads vault directories read-only — no extra `ReadWritePaths` beyond that cache. Run independent sites by adding more instances (`leyline-web@blog`, `leyline-web@docs`, …); each gets its own config file and unit and shares the theme clone.

To override a directive, use a per-instance drop-in: `sudo systemctl edit leyline-web@mysite`.

## Reverse proxy

`leyline-web` serves plain HTTP on `127.0.0.1:8091`. Put Caddy or nginx in front for TLS. (If `leyline-server` shares this hostname, use the split-path proxy in [[install-and-deploy|Install and deploy]] §Reverse proxy instead — it routes `/_leyline/*` to the sync server and everything else here.)

**Caddy:**
```
example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8091
}
```

`leyline-web` does not serve WebSockets, so no special transport tuning is needed.

**nginx** (after certbot sets up TLS):
```nginx
location / {
    proxy_pass http://127.0.0.1:8091;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Set the `LEYLINE_WEB_TRUST_PROXY_TLS=1` environment variable when a reverse proxy terminates TLS — add it via `sudo systemctl edit leyline-web@mysite` (`[Service]` → `Environment=LEYLINE_WEB_TRUST_PROXY_TLS=1`). This tells the reader to emit the `Strict-Transport-Security` header and mark cookies `Secure` even though the binary itself is not serving TLS.

## Per-user read auth

`leyline-web` supports cookie-based login for vaults that have an `access` file. Authentication flow:

1. Visitor hits a vault URL.
2. If the vault's `guest_role` (in its `web.yaml`) is `none`, unauthenticated access returns 404.
3. With `auth.redirect_to_login: true` and a non-empty `login_path`, unauthenticated visitors are redirected to the login page instead of seeing a 404.
4. The visitor submits their API key at `<login_path>`. The reader validates it against each configured vault's `access` file (SHA256 hash lookup) and sets a `leyline_auth` cookie (`HttpOnly; Secure; SameSite=Lax; Max-Age=30d`).
5. On subsequent requests, the cookie is validated on every request (no server-side session table).

The `access` file is the same file managed by the sync server — the web reader and the sync server share the same authentication store on disk. Revoking a key via `leyline-admin key remove` takes effect for the web reader after the next request (the reader re-reads the access file on change via fsnotify).

**Cross-knob constraint.** If any vault declares `auth.redirect_to_login: true` in its `web.yaml` while the site config has `login_path: ""`, the server fails to start with a validation error.

For per-vault access control settings, see [[../vault-management/|vault management]].

## SIGHUP reload

`SIGHUP` re-parses the config file in place. If parsing fails, the old config continues serving. Theme files in `dev_mode` are watched automatically; in production, theme changes require a reload or restart.

## Signals

| Signal | Effect |
|---|---|
| `SIGHUP` | Reload config (parse failure keeps old config serving). |
| `SIGINT` / `SIGTERM` | Graceful shutdown. |

## PDF rendering

PDFs are rendered server-side via `poppler` (`pdftocairo` + `pdftotext`). Install poppler utilities on the server:

```sh
apt install poppler-utils    # Debian/Ubuntu
apk add poppler-utils        # Alpine
```

Without poppler, PDF requests return `501 Not Implemented`. Per-vault, you can switch to the browser's native PDF viewer by setting `pdf_renderer: browser` in the vault's `.leyline/vaultconfig/web.yaml`. The PDF render cache lives at `$XDG_CACHE_HOME/leyline-web/pdf/` by default (`/var/cache/leyline-web/pdf/` under the packaged unit); override with `LEYLINE_WEB_PDF_CACHE_DIR`.

## Checking effective webignore rules

```sh
leyline-web rules --effective -config /etc/leyline-web/mysite.yaml
```

Prints the merged gitignore rule set per section (`view`, `history-ignore`, `edit-ignore`) for every configured vault. Useful to verify that sensitive paths are correctly hidden before making a vault public.

## Troubleshooting

- **Vault shows 404 for all paths.** Check that the vault path in `/etc/leyline-web/<name>.yaml` is correct and that `leyline-web` can read the vault directory. Ensure `guest_role` is not `none` in the vault's `web.yaml` if you expect public access.
- **Login redirects loop.** Check that `login_path` is set (non-empty) in the site config and that the vault's `.leyline/vaultconfig/web.yaml` has `auth.redirect_to_login: true` only when a login path is configured. The binary refuses to start when any vault has `redirect_to_login: true` while `login_path` is empty — so a redirect loop at runtime means the paths are mismatched between vaults.
- **Theme not loading.** The `default_theme` value must exactly match a directory name under `/opt/leyline-web/themes/config/themes/`. Check capitalisation.
- **PDF returns 501.** `poppler-utils` is not installed or `pdftocairo` is not on `$PATH`.
