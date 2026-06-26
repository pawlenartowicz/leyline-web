---
title: Connect your first vault
description: "From a vault address and API key to live sync — step-by-step for the Obsidian plugin (any OS) and the leyline CLI (Linux), with autosync and mirror modes."
tags: [quickstart, act-3]
---

# Connect your first vault

You have two things: a **vault address** in the form `<host>/my-notes` (your
server's real hostname, never `localhost`) and an **API key** (`ley_…`). If you ran
[[install-and-run|Install and run]] they're the admin key it printed; if someone else runs the
server, that's what they hand you. Here's the copy-paste path from those two strings
to your notes syncing live.

Editing always happens in a client on your own machine — never on the server box.
Pick an interactive editing client (a vault built from a Git repo can instead be
published straight from CI on a tag push — see
[[@documentation/server-management/publishing-from-ci|Publishing from CI (GitHub Actions)]]):

## Option A — Obsidian (any OS)

1. Install the **Leyline** plugin (Community plugins → search "Leyline"), or copy
   its release files into `<your-vault>/.obsidian/plugins/leyline/` and enable it.
2. Open **Settings → Leyline**, paste the **vault address** (`<host>/my-notes`) and
   your **API key**, then **Test Connection**.
3. The status bar shows **🟢 Connected**. Your vault now syncs live, both ways —
   edits on any connected client appear on the others within a second.

## Option B — `leyline` CLI (Linux)

The CLI keeps a plain folder on disk in sync from the terminal — handy for a
headless machine, a backup mirror, or scripting. It's a single binary (Linux-only
for now):

```sh
arch=$(uname -m); case $arch in x86_64) arch=amd64;; aarch64) arch=arm64;; esac
cd /tmp
curl -fsSL "https://github.com/pawlenartowicz/leyline/releases/download/v0.4.1/leyline_0.4.1_linux_${arch}.tar.gz" | tar xz
install -d ~/.local/bin && install -m 0755 leyline ~/.local/bin/   # on $PATH, no sudo
```

Then go to the folder you want synced — your existing notes, or an empty folder to
pull a vault down into — and run `leyline init`. It asks for the address and key,
tests the connection, and writes both the key file and the local config for you:

```sh
cd ~/Notes/my-notes          # your notes, or: mkdir ~/Notes/my-notes && cd $_
leyline init
# Vault address: <host>/my-notes
# API key:       ley_…
# Key name (optional): laptop
# Testing connection… OK
```

Now start syncing. Two daemons, depending on which side you trust as the source of
truth:

```sh
leyline autosync     # push your local notes up and keep both sides live (two-way)
leyline mirror       # pull the vault down and keep a read-only local copy in sync
```

`autosync` is what you want for your own notes — it syncs live, both ways, and edits on any connected client appear on the others within a second, just like the plugin. `mirror` holds your local edits and freezes a path on conflict until you resolve it — use it for a backup or a CI checkout. By default it detaches into the background (logs to `.leyline/backend/daemon.log`); add `--debug` to run in the foreground and watch it, or run it under systemd for a real service.

## Next

- **More than one key for the same vault**, the exact key-file format, and the
  Obsidian setup in detail — the manual's **Collaboration → Connecting to a vault**.
- **Every CLI flag and sync mode** (`sync`/`pull` one-shot vs `autosync`/`mirror`
  daemon) — **Collaboration → The command-line client**.
- **Collaborators:** give each person their own `reader` or `editor` key instead of
  sharing the admin key — **Vault management → Keys and roles**. Then they connect
  exactly the same way you just did.
