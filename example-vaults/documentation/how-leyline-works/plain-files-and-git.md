---
title: Plain files and Git
---

# Plain files and Git

Every file in a Leyline vault is a real file on the server's filesystem. There is no database. When a client opens a note, the Leyline server reads it off disk. When a client saves, the change is written to disk using an atomic rename — the file is never in a half-written state. Any tool that can read a folder — `grep`, an editor, an LLM, a backup script — can work with a vault directly.

## Git as the history layer

Every change to a history-tracked file (per the vault's `[history]` allowlist — Markdown and other configured types) is recorded in a git repository that lives alongside the vault directory. Files that pass the `[sync]` allowlist but fall outside `[history]` are written to disk but not versioned. You never need to interact with git directly; Leyline manages it. What you get:

- A full audit trail of who changed what and when.
- The ability to view, revert, or restore any previous state (see [[conflicts-and-history|conflicts and history]]).
- A history you can push to a remote forge for off-server backup, if you want one.

Commits are batched, not per-keystroke. A quiet period after editing (a few seconds of no new saves) triggers a commit, so `git log` stays readable rather than showing thousands of "save" entries. A clean client shutdown and explicit tag operations flush pending changes immediately; after an abrupt disconnect, changes still commit on the next quiet-window/max-delay timer (and survive crashes via the write-ahead log).

## Why this matters

Because the filesystem is the source of truth, you can always recover without Leyline. The vault is a normal directory. `rsync vault/` is a working backup. If you stop running the server, your files are still there, exactly as they were. See [[../server-management/backups-and-recovery|backups and recovery]] for concrete steps.

The git history lives in `<vault>/.git/` on the server — no remote required. Everything needed to reconstruct the vault's full history ships with the backup.

---

**Do this with:** [[../server-management/backups-and-recovery|Backups and recovery]] (copy the vault, restore from git) · [[../collaboration/seeing-history|Seeing history]] (browse commits, tags, diffs)
