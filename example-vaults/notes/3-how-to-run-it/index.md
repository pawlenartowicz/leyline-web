---
title: How to run it
description: "Running Leyline: the install-and-run fast path, connecting the Obsidian plugin or CLI, why it fits on a 256 MB VPS or a free tier, and the status of a potential managed offering."
tags: [quickstart, act-3]
---

# How to run it

Leyline is meant to be cheap to run yourself and easy to walk away from.

- **[[install-and-run|Install and run.]]** The copy-paste fast path: install the deb/rpm/apk packages, create a vault, then sync your notes in and read them on the web.
- **[[first-vault|Connect your first vault.]]** From a vault address and key to your notes syncing live — the Obsidian plugin or the `leyline` CLI, step by step (plus the REST API for CI and automation).
- **[[lightweight-server|Lightweight by design.]]** The server is a single Go binary with no separate database, so it fits on the smallest VPS most providers rent — around 256 MB RAM — or a free-tier box like Oracle Cloud. Self-hosting is the primary path; a managed offering may follow.

For binary downloads and install scripts, see [github.com/pawlenartowicz](https://github.com/pawlenartowicz/). For the operator manual, see [[@documentation/server-management/index|Server management]].
