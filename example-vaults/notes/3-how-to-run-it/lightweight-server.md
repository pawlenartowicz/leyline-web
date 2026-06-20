---
title: Lightweight by design
description: "leyline-server is a single Go binary with no database — runs on a 256 MB VPS or a free-tier box like Oracle Cloud. Self-hosting is primary; a managed service may follow."
tags: [quickstart, act-3]
---

# Lightweight by design

Leyline runs comfortably on a 256 MB VPS — typically the cheapest tier most providers offer, a few dollars a month, with plenty of RAM free under a 3–5-person load. No separate database, message broker, or cluster is required.

## What makes it small

- **Single binary.** `leyline-server` is one Go executable. Drop it in `/usr/local/bin`, write a systemd unit, done.
- **No database.** The vault is files on disk; metadata lives in memory and on the filesystem; history lives in git. Backup is `tar` or `rsync`.
- **Hash-based sync.** Hashes tell the server which files actually changed, so unchanged files are never re-sent.

## Where to run it

Any small Linux box works. A 256 MB VPS from the usual providers runs a few dollars a month — but the footprint is small enough to fit on a free tier:

- **Oracle Cloud Always Free** is the standout. Its Arm (Ampere A1) allotment — up to 4 cores and 24 GB RAM, free for as long as the account lives, not a 12-month trial — dwarfs what Leyline needs. A slice of that, or even one of the always-free AMD micro instances (1 GB), runs the sync server and the web reader together with room to spare.
- **Google Cloud `e2-micro`** (one always-free instance in the US regions) and **fly.io**'s free allowance also clear the bar. AWS's `t3.micro` free tier works too — just note it's the 12-month trial kind, not free-forever.

Whichever you pick, [[install-and-run|Install and run]] is the same recipe: one binary and a reverse proxy.

## What it's tested for

Three to five concurrent editors per vault, multiple vaults per server. Larger setups aren't measured yet — reports are welcome.

## A managed service?

Self-hosting is the primary deployment story and stays that way: the codebase is open, the binaries are free, the protocol is documented.

A managed offering may follow if there's enough demand to justify the support work — and it should be cheap and competitive, since the server itself is cheap to run. The "if" matters: this is currently a sole-developer project, and a managed service is more support load than software. If you'd like to be an **early customer**, an **investor**, or a **donor** willing to help carry that load, it'll likely arrive sooner.

A proper contact channel lands here once the project domain is set up. Until then, the door is open via GitHub on any of the Leyline repos at [github.com/pawlenartowicz](https://github.com/pawlenartowicz/) — open an issue, leave a comment, find a way to say hi.

---

For the full operator manual — config flags, deployment, backups, monitoring — see [[@documentation/server-management/index|Server management]].
