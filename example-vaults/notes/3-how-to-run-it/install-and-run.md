---
title: Install and run
description: "Copy-paste fast path: install the deb/rpm/apk packages, create a vault, expose it via Caddy, then sync notes in from Obsidian or the CLI."
tags: [quickstart, act-3]
---

# Install and run

The fast path from nothing to a live vault — one you can sync your notes into and
read on the web. Every step is copy-paste; the
[[@documentation/server-management/index|full operator manual]] covers the options. Run
these on a small Linux VPS (≈256 MB is plenty).

## 1. Install the packages

Leyline ships as native `deb` / `rpm` / `apk` packages — **two** of them: the sync
server (`leyline-server` + `leyline-admin`) and the web reader (`leyline-web`). Pick
your distro and copy its block. These are pinned to **v0.2.0**; on arm64 swap
`amd64` → `arm64`. **Versioning:** keep every Leyline piece on the same minor —
the `leyline-web` engine, the server, the CLI, and the `web` theme clone (step 3)
must all be `0.2.*`. A `0.2` engine on `0.1` themes won't render. See the
[`leyline` README](https://github.com/pawlenartowicz/leyline#versioning) for the
full policy.

**Fedora / RHEL:**

```sh
cd /tmp && curl -fsSL -O https://github.com/pawlenartowicz/leyline/releases/download/v0.2.0/leyline-server_0.2.0_amd64.rpm -O https://github.com/pawlenartowicz/leyline/releases/download/v0.2.0/leyline-web_0.2.0_amd64.rpm
sudo dnf install ./leyline-server_0.2.0_amd64.rpm ./leyline-web_0.2.0_amd64.rpm
```

**Debian / Ubuntu:**

```sh
cd /tmp && curl -fsSL -O https://github.com/pawlenartowicz/leyline/releases/download/v0.2.0/leyline-server_0.2.0_amd64.deb -O https://github.com/pawlenartowicz/leyline/releases/download/v0.2.0/leyline-web_0.2.0_amd64.deb
sudo apt install ./leyline-server_0.2.0_amd64.deb ./leyline-web_0.2.0_amd64.deb
```

**Alpine:**

```sh
cd /tmp && curl -fsSL -O https://github.com/pawlenartowicz/leyline/releases/download/v0.2.0/leyline-server_0.2.0_amd64.apk -O https://github.com/pawlenartowicz/leyline/releases/download/v0.2.0/leyline-web_0.2.0_amd64.apk
sudo apk add --allow-untrusted ./leyline-server_0.2.0_amd64.apk ./leyline-web_0.2.0_amd64.apk
```

The server package **starts on install** — it's live on `127.0.0.1:8090` under
systemd (`leyline-server.service`), with its config at `/etc/leyline/config.yaml`,
vaults under `/var/lib/leyline/vaults`, and `git` pulled in for file history. The
web package installs the `leyline-web` engine and a `leyline-web@.service` template
but **starts nothing** — instances are opt-in (step 3). The GitHub-release `.apk`
is unsigned, which is why `apk` needs `--allow-untrusted`.

## 2. Create a vault

```sh
sudo leyline-admin vault create \
  --admin-key-name me --admin-email you@example.org \
  my-notes        # name it whatever you like — prints the admin key once, copy it
```

`leyline-admin` ships with the server package and talks to the local server over a
UNIX socket — hence `sudo`, and a bare vault ID (`my-notes`) with no host. You now
have a live, empty vault at `/var/lib/leyline/vaults/my-notes` and its admin key,
but everything is on loopback. The rest of the guide puts it on the internet, then
fills it with your notes.

## 3. Start the web reader

`leyline-web` runs as **instances**: each is a clone of the
[`web` template repo](https://github.com/pawlenartowicz/leyline-web) (config + themes) under
`/opt/leyline-web/<name>`, served by the unit `leyline-web@<name>`. Create one
called `mysite` and point it at the vault from step 2:

```sh
sudo git clone --branch v0.2.0 https://github.com/pawlenartowicz/leyline-web /opt/leyline-web/mysite   # match your installed minor (0.2.*)
sudo chown -R leyline:leyline /opt/leyline-web/mysite
sudo $EDITOR /opt/leyline-web/mysite/config/config.yaml   # domain: example.com
                                                          # listen: 127.0.0.1:8091
                                                          # vaults: { "/": /var/lib/leyline/vaults/my-notes }
sudo systemctl enable --now leyline-web@mysite
```

Replace `example.com` with the domain you'll point at the box. The instance serves
the vault on `127.0.0.1:8091`. Both services now run on loopback under systemd —
`systemctl status leyline-server leyline-web@mysite` checks them, `journalctl -u
leyline-web@mysite -f` tails the reader.

## 4. Put it on the internet

Everything so far is bound to `127.0.0.1` — reachable only on the box, so a client
can't sync to it yet and nobody can read it. Both services share one hostname — so a single reverse proxy can route by path: the `/_leyline/*` prefix goes to the sync server (WebSocket + REST), everything else goes to the web reader. The prefix rule must be listed first in the proxy config so it wins over the catch-all. Point
your domain's DNS **A record** (the entry that maps your domain name to an IPv4 address) at the box's public IP, then put one **reverse proxy** in front that **terminates HTTPS** — one front-door process that holds the TLS certificate and forwards to the two loopback services. [Caddy](https://caddyserver.com) is the least-config option — it fetches and renews the TLS certificate automatically. Put this in
`/etc/caddy/Caddyfile` (the domain must match the instance config above) and reload
Caddy:

```
example.com {
    encode zstd gzip

    # Sync server (WebSocket + REST) — must come before the catch-all.
    reverse_proxy /_leyline/* 127.0.0.1:8090 {
        flush_interval -1
    }

    # Web reader for everything else.
    reverse_proxy 127.0.0.1:8091
}
```

`flush_interval -1` is what keeps the sync WebSocket alive — don't drop it. Open
`https://example.com/` and you're reading your vault on the web, with a real
certificate (it's empty until you sync notes in — next step). If the box **can't**
open ports 80/443 (NAT, a restricted VPS tier), use a **Cloudflare Tunnel** instead
of a proxy. The full proxy and tunnel forms ship ready-to-edit in the `web` template
under `deploy/example/`; themes, exposed paths, and read-login are in the manual's
**Vault management → Web reader setup**.

## 5. Sync your notes in

Your vault is now reachable at `example.com/my-notes` (your real domain, not
`localhost`). Editing happens in a client on your own machine, never on the box.

**[[first-vault|Connect your first vault →]]** — copy-paste walkthrough from this empty vault to your notes synced and showing up in the web reader. Give
collaborators their own `reader`/`editor` keys rather than the admin key — key and
role management is in the manual.

---

That's the whole loop. To tune config, add collaborators, or push from GitHub
Actions, see the [[@documentation/server-management/index|full guide]] — in this manual,
start at [[@documentation/server-management/install-and-deploy|Server management → Install and deploy]].
