---
title: Also a website
description: "leyline-web reads the vault directory and serves each Markdown file as a page — per-file and per-user access controlled inside the vault itself."
tags: [quickstart, act-1]
---

# Also a website

The page you're reading right now is the disk view.

`leyline-web` reads the vault directory directly and turns each Markdown file into a page on request — no separate build pipeline to maintain. Save a change from any client — Obsidian, the CLI, or your editor — refresh the browser: the page reflects what's on disk.

## Who sees what

Two independent dials, both kept inside the vault itself, both edited like any other admin file.

**Per-file gating** — `.leyline/vaultconfig/webignore` (gitignore syntax) controls what the public site shows under its `[view]` section. Two more sections, `[history-ignore]` and `[edit-ignore]`, gate the history tab and the future browser editor as those features land; both ship alongside their feature pages in Act II.

**Per-user gating** — `.leyline/vaultconfig/access`. The vault can be fully public (no login), guest-readable (anonymous access only to files marked public), or fully gated (login for everything). Login lives at `/_login` by default — API key, cookie-backed session, served by the same binary. The same `access` file scopes who can sync, via any client.

Together the two files let you publish parts of the vault to the world while keeping the rest team-only, from a single source of truth that travels with the vault.

---

Full permission model and the .leyline/ control plane: [[@documentation/how-leyline-works/permissions|Permissions]] and [[@documentation/how-leyline-works/the-leyline-directory|The .leyline/ directory]]; web visibility/login setup: [[@documentation/vault-management/web-reader-setup|Web reader setup]].
