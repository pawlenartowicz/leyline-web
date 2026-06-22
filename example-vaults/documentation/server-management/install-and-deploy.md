---
title: Install and deploy
---

# Install and deploy

## Walkthrough: zero to a published site

The end-to-end path for putting one vault on the public web, with content pushed
by CI. Each step is copy-paste; the detailed sections below this walkthrough (and
the linked docs) cover the options and the hardened production form. For the
two-minute version, see the Quick Start tour's **How to run it → Spin it up**.

This walkthrough follows the publish-a-site shape (sync server + web reader + CI). If you only need a collaborative sync server — clients connecting via the Obsidian plugin or the leyline CLI, no public web view — steps 1–2 are all you need; see [[../collaboration/index|Collaboration]] to connect clients.

### 1. Install the packages

Leyline ships as native `deb` / `rpm` / `apk` packages — **two** of them: the sync
server (`leyline-server` + the `leyline-admin` operator tool) and the web reader
(`leyline-web`). The current line is `0.3.*`. **Keep every piece on the same minor:**
the server, CLI, `leyline-web`, and the `web` theme clone (step 4) must all be
`0.3.*` — crossing a minor (`0.3` → `0.4`) carries no compatibility guarantee. The
`0.3.2` in the URLs below tracks the release tag; bump it for a later patch.

Pick your version and CPU arch once — on arm64 hosts set `arch=arm64`:

```sh
ver=0.3.2; arch=amd64
base="https://github.com/pawlenartowicz/leyline/releases/download/v${ver}"
```

**Fedora / RHEL:**

```sh
cd /tmp && curl -fsSL -O "${base}/leyline-server_${ver}_${arch}.rpm" -O "${base}/leyline-web_${ver}_${arch}.rpm"
sudo dnf install ./leyline-server_${ver}_${arch}.rpm ./leyline-web_${ver}_${arch}.rpm
```

**Debian / Ubuntu:**

```sh
cd /tmp && curl -fsSL -O "${base}/leyline-server_${ver}_${arch}.deb" -O "${base}/leyline-web_${ver}_${arch}.deb"
sudo apt install ./leyline-server_${ver}_${arch}.deb ./leyline-web_${ver}_${arch}.deb
```

**Alpine:**

```sh
cd /tmp && curl -fsSL -O "${base}/leyline-server_${ver}_${arch}.apk" -O "${base}/leyline-web_${ver}_${arch}.apk"
sudo apk add --allow-untrusted ./leyline-server_${ver}_${arch}.apk ./leyline-web_${ver}_${arch}.apk
```

The server package **starts on install** — it is live on `127.0.0.1:8090` under
systemd (`leyline-server.service`), with its config at `/etc/leyline/config.yaml`,
vaults under `/var/lib/leyline/vaults`, and `git` pulled in as a dependency for file
history. The web package installs the `leyline-web` engine and a `leyline-web@.service`
template but **starts nothing** — instances are opt-in (step 4). The GitHub-release
`.apk` is unsigned, hence `--allow-untrusted`. Everything binds to loopback; a proxy
or tunnel (step 5) handles public TLS. There is no source build and no hand-written
unit — to tune the server, edit `/etc/leyline/config.yaml` (see §Configuration and
[[server-configuration|server configuration]]) and `sudo systemctl restart leyline-server`.

For a from-source or non-systemd install, see §Manual install from tarballs below.

### 2. Create the vault and a publish key

```sh
sudo leyline-admin vault create \
  --admin-key-name me --admin-email you@example.org \
  my-notes
```

Replace `my-notes` with whatever name you want for the vault. `leyline-admin` ships
with the server package and reaches the local instance over its UNIX socket
(`/run/leyline/admin.sock`, mode 0600 — hence `sudo`), so it takes a **bare vault ID**
(`my-notes`) — the `<host>/<vaultID>` address form is only how *clients* later reach
the vault, with `<host>` the box's real hostname. This mints the first admin key and
prints it **once** — copy it. The vault is now live and empty at
`/var/lib/leyline/vaults/my-notes`. Lifecycle (list, reset, destroy) is in
[[../vault-management/vault-lifecycle|vault lifecycle]]; roles and minting additional
keys are in [[../vault-management/keys-and-roles|keys and roles]]. For CI, a
`vault.admin` key scoped to this vault is the right credential; hand human readers
`reader` keys (sync.pull only — read-only, no pushes) so they cannot write and never
collide with a publish.

### 3. Publish your content

The `/publish` endpoint overwrites the vault to match an uploaded tarball — files
absent from it are deleted, and `.leyline/` is always skipped server-side. One
streaming `curl`, no client binary on the runner:

```sh
KEY=ley_paste_the_admin_key_here
tar czf - -C ./my-content --exclude=.git --exclude=.leyline . \
 | curl -fsS -X POST "http://localhost:8090/_leyline/api/v1/my-notes/publish" \
   -H "Authorization: Bearer $KEY" -H "Content-Type: application/gzip" --data-binary @-
```

A `200` returns `{"commit":…,"written":N,"deleted":M}`. To run this from GitHub
Actions on a tag push (key stored as the `LEYLINE_KEY` repo secret), the full
workflow, the overwrite contract, and the publish-then-tag caveat are in
[[publishing-from-ci|Publishing from CI]].

### 4. Serve it on the web

`leyline-web` runs as **instances**: each is a clone of the
[`web` template repo](https://github.com/pawlenartowicz/leyline-web) (config + themes)
under `/opt/leyline-web/<name>`, served by the unit `leyline-web@<name>`. The web
package creates `/opt/leyline-web/` (owned by the `leyline` user) but starts nothing.
Create one called `mysite` and point it at the vault from step 2:

```sh
sudo git clone https://github.com/pawlenartowicz/leyline-web /opt/leyline-web/mysite
sudo git -C /opt/leyline-web/mysite checkout "$(git -C /opt/leyline-web/mysite tag -l 'v0.3.*' | sort -V | tail -1)"   # latest 0.3.* — match your installed minor
sudo chown -R leyline:leyline /opt/leyline-web/mysite
sudo $EDITOR /opt/leyline-web/mysite/config/config.yaml   # domain: notes.example.com
                                                          # listen: 127.0.0.1:8091
                                                          # vaults: { "/": /var/lib/leyline/vaults/my-notes }
sudo systemctl enable --now leyline-web@mysite
```

The instance serves the vault on `127.0.0.1:8091`; `journalctl -u leyline-web@mysite -f`
tails it. Its config fields, themes, per-user read auth, and the production form are
all in [[web-reader-hosting|web reader hosting]].

### 5. Expose it

Both services share one hostname, so a single reverse proxy routes by path: the
`/_leyline/*` prefix → the sync server (WebSocket + REST) on `:8090`, everything else
→ the web reader on `:8091`. Pick **one** exposure path, both shipped in your `web`
repo copy under `deploy/example/`:

- **Reverse proxy + ACME** — when the box has a public IP and can listen on 80/443.
  Caddy (`deploy/example/caddy/Caddyfile`) gives automatic TLS with the least config;
  nginx (`deploy/example/nginx/`) suits a box already running it. Both — and the
  mandatory split-path + WebSocket headers — are detailed in §Reverse proxy below.
- **Cloudflare Tunnel** — when the box **cannot** open public ports (NAT,
  container/port-restricted tiers). `deploy/example/cloudflared/config.yml` carries
  HTTPS *and* WebSockets outbound-only, so there is no ACME step and no inbound ports;
  the stub is commented with the one-time `cloudflared tunnel` setup.

Use a proxy *or* a tunnel, not both. Collaborators connecting clients to the live
vault start at [[../collaboration/connecting-to-a-vault|connecting to a vault]];
every flag is in [[../reference/cli-flags|CLI flags]].

## Prerequisites

- Linux with systemd (Debian/Ubuntu/Fedora/RHEL) or OpenRC (Alpine). A minimal VPS (≈256 MB) is plenty.
- `git` 2.x — pulled in automatically as a package dependency (the server shells out to it for `revert` and `restore`).
- No manual user setup: the packages create a dedicated `leyline` system user and run both services under it.

## What the packages install

The two packages lay down this FHS tree (created and owned for you):

```
/usr/bin/leyline-server         ← sync server (systemd unit started on install)
/usr/bin/leyline-admin          ← operator CLI → local server over UNIX socket
/usr/bin/leyline-web            ← web reader engine

/etc/leyline/config.yaml        ← server config (config-noreplace: edits survive upgrades)

/var/lib/leyline/vaults/        ← vault root; each vault is a subdirectory (created on install)
/var/lib/leyline/registry.toml  ← vault registry (auto-created on first start)

/run/leyline/admin.sock         ← leyline-admin UNIX socket (mode 0600 — file perms ARE auth)
/var/cache/leyline-web/         ← web reader PDF + search caches

/usr/lib/systemd/system/leyline-server.service     ← server unit (enabled + started on install)
/usr/lib/systemd/system/leyline-web@.service       ← web instance template (opt-in, never auto-started)
/usr/lib/sysctl.d/99-leyline.conf                  ← inotify watch bump (§inotify below)
/usr/lib/systemd/journald.conf.d/00-leyline-disk-cap.conf  ← journal size cap (200 MB)

/opt/leyline-web/<name>/        ← per-site web instances you create (clone of the web template)
```

`/var/lib/leyline` is created and owned via the server unit's `StateDirectory=leyline`;
`/run/leyline` via `RuntimeDirectory=leyline`; `/var/cache/leyline-web` via the web
unit's `CacheDirectory=`. On Alpine the same lifecycle is wired through the shipped
OpenRC scripts at `/etc/init.d/leyline-server` and `/etc/init.d/leyline-web`.

## Configuration

The packaged default at `/etc/leyline/config.yaml`:

```yaml
server:
  host: 127.0.0.1   # bind loopback; reverse proxy / tunnel handles public TLS
  port: 8090

vaults_dir: /var/lib/leyline/vaults

# Registry is mutated on `vault create`, so it must be writable. The default is
# <dir-of-config>/registry.toml = /etc/leyline/registry.toml, but /etc is read-only
# under the unit's ProtectSystem=strict — point it at the state dir.
registry: /var/lib/leyline/registry.toml
```

It is installed **config-noreplace**: your edits survive package upgrades. After any
change, `sudo systemctl restart leyline-server`. The full reference (rate limits,
connection caps, `allowed_origins`, ping timing) is [[server-configuration|server configuration]].

## systemd unit

The package ships `/usr/lib/systemd/system/leyline-server.service` and enables +
starts it on install. It runs as the `leyline` user, takes its state and runtime
directories from `StateDirectory=leyline` / `RuntimeDirectory=leyline`, and carries a
hardening profile (`ProtectSystem=strict`, `ProtectHome`, `MemoryDenyWriteExecute`,
restricted syscalls and address families) — which is *why* `config.yaml` relocates the
registry to `/var/lib/leyline` (`/etc` is read-only under `ProtectSystem=strict`).

**Don't edit the shipped unit** — a package upgrade overwrites it. To override a
directive, use a drop-in:

```sh
sudo systemctl edit leyline-server     # writes /etc/systemd/system/leyline-server.service.d/override.conf
sudo systemctl restart leyline-server
journalctl -u leyline-server -f        # watch logs
```

## inotify watch limits

The server watches `.leyline/vaultconfig/` in each hydrated vault via the kernel's
inotify subsystem (fsnotify). The package already ships
`/usr/lib/sysctl.d/99-leyline.conf` raising `fs.inotify.max_user_watches` to `65536`
(≈13k vaults at ~5 watches each, plus headroom). Only if you co-locate many other
watch-heavy services *and* hit watch-exhaustion errors do you need to raise it
further — use a separate filename so a package upgrade can't clobber your override:

```sh
echo 'fs.inotify.max_user_watches = 131072' | sudo tee /etc/sysctl.d/99-leyline-local.conf
sudo sysctl --system
```

## journald storage

The package ships a journal size cap at
`/usr/lib/systemd/journald.conf.d/00-leyline-disk-cap.conf` (`SystemMaxUse=200M`) so a
long-running deploy can't fill `/`. For persistent on-disk journals, create
`/var/log/journal/` and `sudo systemctl restart systemd-journald`.

## Reverse proxy: Caddy (recommended)

Caddy handles ACME/TLS automatically and the WebSocket `Upgrade` handshake without
extra config. Both services sit behind one hostname; the `/_leyline/*` prefix must be
listed **before** the catch-all so sync/REST routes don't fall through to the web
reader. Place in `/etc/caddy/Caddyfile`:

```
example.com {
    encode zstd gzip

    # Sync server (WebSocket + REST + Tier 3 history) — must come before the catch-all.
    reverse_proxy /_leyline/* 127.0.0.1:8090 {
        flush_interval -1
    }

    # Web reader for everything else.
    reverse_proxy 127.0.0.1:8091
}
```

`flush_interval -1` disables response buffering, which is required for the sync
WebSocket — don't drop it. The shipped `deploy/example/caddy/Caddyfile` has the
`/_leyline/*` block commented out (web-reader-only by default); uncomment it for the
same-host shape above. If you only run a collaborative sync server (no web reader),
drop the catch-all and proxy `/_leyline/*` — or everything — to `:8090`.

## Reverse proxy: nginx

The `/_leyline/` location carries the WebSocket upgrade headers and a long read
timeout; the catch-all serves the web reader. Pair with certbot for TLS:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Sync server (WebSocket + REST) — must precede the catch-all.
    location /_leyline/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket upgrade — required.
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Must be >= 2× ping_interval (default 30s → 60s minimum; 120s is safe).
        proxy_read_timeout 120s;
    }

    # Web reader for everything else.
    location / {
        proxy_pass http://127.0.0.1:8091;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**TLS note.** The `HSTS` header must only appear on the TLS (443) server block. Configuring HSTS on a plain-HTTP block locks users out if TLS is later misconfigured.

**WebSocket note.** The `Upgrade` + `Connection` headers and `proxy_read_timeout` on the `/_leyline/` location are mandatory. Sync connections drop silently without them — the client retries but users see sync interruptions.

## Browser-origin allowlist

If you embed a browser-based sync client (not the Obsidian plugin or the leyline CLI), add its origin to `sync.allowed_origins` in `config.yaml` (see [[server-configuration|server configuration]]). The desktop plugin and the leyline CLI omit the `Origin` header and are always accepted regardless of this setting. An empty `allowed_origins` list means any browser-originated WebSocket upgrade is rejected.

## Manual install from tarballs

For a from-source or non-systemd box, the same release also ships plain `.tar.gz`
archives — `leyline-server_<ver>_linux_<arch>.tar.gz` (carries both `leyline-server`
and `leyline-admin`) and `leyline-web_<ver>_linux_<arch>.tar.gz`:

```sh
ver=0.3.2; arch=amd64
base="https://github.com/pawlenartowicz/leyline/releases/download/v${ver}"
cd /tmp
curl -fsSL "${base}/leyline-server_${ver}_linux_${arch}.tar.gz" | tar xz
curl -fsSL "${base}/leyline-web_${ver}_linux_${arch}.tar.gz" | tar xz
sudo install -m 0755 leyline-server leyline-admin leyline-web /usr/local/bin/
```

Going this route you own everything the packages do for free: create the `leyline`
user, lay out `/var/lib/leyline/vaults` + `/etc/leyline/config.yaml` (the
§Configuration block above), and supply the service manager. The packaging directory
in the `leyline` repo (`packaging/server/`, `packaging/web/`) is the reference — it
holds the exact systemd units, OpenRC init scripts, sysctl, and journald drop-ins the
packages install.

## Troubleshooting

- **Port already in use.** `ss -tlnp | grep 8090` — another process holds the port. Change `server.port` in `/etc/leyline/config.yaml` (then restart) or stop the conflicting process.
- **Server didn't come up after install.** `systemctl status leyline-server` and `journalctl -u leyline-server` — a missing `git` binary or an unwritable registry path are the usual causes.
- **Permission denied on the vaults directory.** Ensure `leyline` owns `/var/lib/leyline` (`sudo chown -R leyline:leyline /var/lib/leyline`).
- **`git` not found.** The package depends on `git`; if a minimal image stripped it, reinstall (`apt install git` / `dnf install git` / `apk add git`) and confirm it is on the system `$PATH`.
- **Vault not accessible after deploy.** The server hydrates vaults lazily — no vault state is loaded until a client connects. Check `journalctl -u leyline-server` after the first client connects to see hydration errors.
