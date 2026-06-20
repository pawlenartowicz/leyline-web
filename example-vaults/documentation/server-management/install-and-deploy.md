---
title: Install and deploy
---

# Install and deploy

## Walkthrough: zero to a published site

The end-to-end path for putting one vault on the public web, with content pushed
by CI. Each step is copy-paste; the detailed sections below this walkthrough (and
the linked docs) cover the options and the hardened production form. For the
two-minute version, see the Quick Start tour's **How to run it → Spin it up**.

This walkthrough follows the publish-a-site shape (sync server + web reader + CI). If you only need a collaborative sync server — clients connecting via the Obsidian plugin or the leyline CLI, no public web view — steps 1–3 are all you need; see [[../collaboration/index|Collaboration]] to connect clients.

Pick your CPU arch once — every download below reuses `$arch`:

```sh
arch=$(uname -m); case $arch in x86_64) arch=amd64;; aarch64) arch=arm64;; esac
```

### 1. Install the binaries

`leyline-server` (with the `leyline-admin` operator tool) and `leyline-web` ship
as release archives from the GitHub org. They are pinned to version `0.1.0`; a
re-released build carries a `-N` suffix in the *tag and filename* only — substitute
it into the URLs below if you target one.

```sh
cd /tmp
curl -fsSL "https://github.com/pawlenartowicz/leyline/releases/latest/download/leyline-server_0.1.0_linux_${arch}.tar.gz" | tar xz
curl -fsSL "https://github.com/pawlenartowicz/leyline/releases/latest/download/leyline-web_0.1.0_linux_${arch}.tar.gz" | tar xz
sudo install -m 0755 leyline-server leyline-admin leyline-web /usr/local/bin/
```

For the recommended `/opt/leyline/` prefix, the service user, and the filesystem
layout, see §Binary placement and §Filesystem layout below.

### 2. Configure and start the server

Bind to loopback — a proxy or tunnel (step 5) handles public TLS. A minimal
`config.yaml`:

```sh
sudo install -d -o "$USER" /srv/leyline/vaults
cat > /srv/leyline/config.yaml <<'EOF'
vaults_dir: /srv/leyline/vaults
server:
  host: 127.0.0.1
  port: 8090
EOF
```

Run it under systemd (the unit and hardening directives are in §systemd unit
below). The full config reference is [[server-configuration|server configuration]].

### 3. Create the vault and a publish key

```sh
leyline-admin vault create \
  --admin-key-name me --admin-email you@example.org \
  my-notes
```

Replace `my-notes` with whatever name you want for the vault. `leyline-admin`
runs on the server and reaches the local instance over its UNIX socket, so it
takes a **bare vault ID** (`my-notes`) — the `<host>/<vaultID>` address
form is only how *clients* later reach the vault, with `<host>` the box's real
hostname. This mints the first admin key and prints it **once** — copy it. Lifecycle (list,
reset, destroy) is in [[../vault-management/vault-lifecycle|vault lifecycle]];
roles and minting additional keys are in
[[../vault-management/keys-and-roles|keys and roles]]. For CI, a `vault.admin`
key scoped to this vault is the right credential; hand human readers `reader` keys (sync.pull only — read-only, no pushes) so they cannot write and never collide with a publish.

### 4. Publish your content

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
workflow and the overwrite contract live in the umbrella's
[`docs/github-actions.md`](https://github.com/pawlenartowicz/leyline/blob/main/docs/github-actions.md).

### 5. Serve it on the web, then expose it

Point `leyline-web` at the vault directory and run it on a loopback port. Its own
config, themes, and the production service form are in
[[web-reader-hosting|web reader hosting]]:

```sh
cat > /srv/leyline/web.yaml <<'EOF'
domain: notes.example.com
listen: 127.0.0.1:8091
vaults:
  /: /srv/leyline/vaults/my-notes
EOF
leyline-web -config /srv/leyline/web.yaml >/tmp/leyline-web.log 2>&1 &
```

This backgrounds the process for a quick test (`kill %1` to stop); for production, run it under systemd — see [[web-reader-hosting|web reader hosting]].

Then make `:8091` (and, if collaborators sync, the server's `:8090`) public — pick
**one** exposure path, both shipped in your `web` repo copy under `deploy/example/`:

- **Reverse proxy + ACME** — when the box has a public IP and can listen on 80/443.
  Caddy (`deploy/example/caddy/Caddyfile`) gives automatic TLS with the least
  config; nginx (`deploy/example/nginx/`) suits a box already running it. Both —
  and the mandatory WebSocket headers — are detailed in §Reverse proxy below.
- **Cloudflare Tunnel** — when the box **cannot** open public ports (NAT,
  container/port-restricted tiers). `deploy/example/cloudflared/config.yml` carries
  HTTPS *and* WebSockets outbound-only, so there is no ACME step and no inbound
  ports; the stub is commented with the one-time `cloudflared tunnel` setup.

Use a proxy *or* a tunnel, not both. Collaborators connecting clients to the live
vault start at [[../collaboration/connecting-to-a-vault|connecting to a vault]];
every flag is in [[../reference/cli-flags|CLI flags]].

## Prerequisites

- Linux (systemd or OpenRC). A minimal Debian/Ubuntu/Alpine VPS works fine.
- `git` 2.x on `$PATH` — the server shells out to it for `revert` and `restore` operations.
- A user account to run the service under. The examples below use `leyline`.

```sh
# Create a system user (no home dir, no login shell)
useradd -r -s /sbin/nologin -d /opt/leyline leyline
```

## Binary placement

Build from source or download the release binary. The recommended install prefix is `/opt/leyline/bin/`:

```sh
install -d /opt/leyline/bin
install -m 0755 leyline-server /opt/leyline/bin/leyline-server
```

The `leyline-admin` operator binary ships in the same release and should live alongside it:

```sh
install -m 0755 leyline-admin /opt/leyline/bin/leyline-admin
```

## Filesystem layout

```
/opt/leyline/
├── bin/
│   ├── leyline-server
│   └── leyline-admin
└── config.yaml          ← server configuration (see [[server-configuration]])

/opt/leyline/vaults/     ← vault root; each vault is a subdirectory
/opt/leyline/vaults/.trash/   ← destroyed vaults land here (operator-managed)

/var/lib/leyline/        ← created/owned by StateDirectory=leyline in the systemd unit
└── registry.toml        ← vault registry (auto-created by server on first start)

/run/leyline/
└── admin.sock           ← UNIX socket for leyline-admin (mode 0600)
```

The vaults directory must be writable by the `leyline` user. The WAL directory defaults to `$STATE_DIRECTORY` under systemd (set by `StateDirectory=leyline` in the unit, resolving to `/var/lib/leyline/`) or `~/.local/state/leyline-server/` otherwise.

## Minimal `config.yaml`

```yaml
vaults_dir: /opt/leyline/vaults

server:
  host: 127.0.0.1   # bind loopback; reverse proxy handles public TLS
  port: 8090

registry: /var/lib/leyline/registry.toml
# Move the registry out of /opt/leyline/ so it stays writable under
# ProtectSystem=strict + StateDirectory=leyline (which creates/owns /var/lib/leyline).
# Without this, the server cannot write registry.toml on first start and exits 1.
```

See [[server-configuration|server configuration]] for the full reference. The `registry.toml` path defaults to `<config-dir>/registry.toml`; the entry above relocates it to `/var/lib/leyline/registry.toml` so it sits under the writable state directory provided by `StateDirectory=leyline` in the systemd unit.

## systemd unit

Place this at `/etc/systemd/system/leyline-server.service`:

```ini
[Unit]
Description=leyline-server — WebSocket sync + REST admin for Leyline vaults
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=leyline
Group=leyline
WorkingDirectory=/opt/leyline
ExecStart=/opt/leyline/bin/leyline-server -config /opt/leyline/config.yaml
Restart=on-failure
RestartSec=2

# Logs go to stderr → journald. View with: journalctl -u leyline-server -f
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/leyline/vaults /run/leyline
RuntimeDirectory=leyline
StateDirectory=leyline
RuntimeDirectoryMode=0750
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
LockPersonality=true
MemoryDenyWriteExecute=true
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
```

```sh
systemctl daemon-reload
systemctl enable --now leyline-server
journalctl -u leyline-server -f     # watch logs
```

If you also want persistent journald storage, create `/var/log/journal/` and cap the journal size (a 200 MB cap is enough for most small deployments — see `deploy/example/journald/00-disk-cap.conf` in the server repo).

## inotify watch limits

The server watches `.leyline/vaultconfig/` in each hydrated vault via the kernel's inotify subsystem (fsnotify). On systems with many active vaults, the default `fs.inotify.max_user_watches` (8192) may be too low:

```sh
echo 'fs.inotify.max_user_watches = 65536' > /etc/sysctl.d/99-leyline.conf
sysctl --system
```

## Reverse proxy: Caddy (recommended)

Caddy handles ACME/TLS automatically. Place in `/etc/caddy/Caddyfile`:

```
example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8090 {
        transport http {
            response_header_timeout 0
            read_buffer_size 32KiB
            write_buffer_size 32KiB
        }
        flush_interval -1
    }
}
```

`flush_interval -1` disables response buffering, which is required for WebSocket connections. Caddy handles the WebSocket `Upgrade` handshake automatically.

## Reverse proxy: nginx

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket upgrade — required
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Must be >= 2× ping_interval (default 30s → 60s minimum; 120s is safe)
        proxy_read_timeout 120s;
    }
}
```

**TLS note.** The `HSTS` header must only appear on the TLS (443) server block. Configuring HSTS on a plain-HTTP block locks users out if TLS is later misconfigured.

**WebSocket note.** The `Upgrade` + `Connection` headers and `proxy_read_timeout` are mandatory. Connections will drop silently without them — the client will retry but users will see sync interruptions.

## Browser-origin allowlist

If you embed a browser-based sync client (not the Obsidian plugin or the leyline CLI), add its origin to `sync.allowed_origins` in `server.yaml` (see [[server-configuration|server configuration]]). The desktop plugin and the leyline CLI omit the `Origin` header and are always accepted regardless of this setting. An empty `allowed_origins` list means any browser-originated WebSocket upgrade is rejected.

## Troubleshooting

- **Port already in use.** `ss -tlnp | grep 8090` — another process holds the port. Change `server.port` in `config.yaml` or stop the conflicting process.
- **Permission denied on vaults directory.** Ensure `leyline` owns `/opt/leyline/vaults/` (`chown -R leyline:leyline /opt/leyline/vaults`).
- **`git` not found.** Install git (`apt install git` / `apk add git`) and verify it is on the system `$PATH` (not just the operator's login path).
- **Vault not accessible after deploy.** The server hydrates vaults lazily — no vault state is loaded until a client connects. Check `journalctl -u leyline-server` after the first client connects to see hydration errors.
