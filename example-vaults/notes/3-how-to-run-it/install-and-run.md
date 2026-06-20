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

Leyline ships as native `deb` / `rpm` / `apk` packages. Before running, set the `pm=` line to `apt` (Debian/Ubuntu), `apk` (Alpine), or leave `dnf` (Fedora/RHEL) — `verb` and `ext` derive from it. This installs **two** packages — the
sync server (`leyline-server` + `leyline-admin`) and the web reader (`leyline-web`):

```sh
arch=$(uname -m); case $arch in x86_64) arch=amd64;; aarch64) arch=arm64;; esac
pm=dnf   # Debian/Ubuntu: pm=apt · Alpine: pm=apk
case $pm in apk) verb="add --allow-untrusted" ext=apk;; apt) verb=install ext=deb;; *) verb=install ext=rpm;; esac
ver=0.1.0
cd /tmp
curl -fsSLO "https://github.com/pawlenartowicz/leyline/releases/latest/download/leyline-server_${ver}_${arch}.${ext}"
curl -fsSLO "https://github.com/pawlenartowicz/leyline/releases/latest/download/leyline-web_${ver}_${arch}.${ext}"
sudo $pm $verb ./leyline-server_${ver}_${arch}.${ext} ./leyline-web_${ver}_${arch}.${ext}
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
sudo git clone https://github.com/pawlenartowicz/leyline-web /opt/leyline-web/mysite
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
