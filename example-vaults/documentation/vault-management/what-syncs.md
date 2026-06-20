---
title: What syncs
---

# What syncs

Leyline has three gates that control what reaches the server and git history. Two are server-enforced and live in `.leyline/vaultconfig/allowed`; one is client-local and lives in `.leyline/leylineignore`.

## Gate overview

| Gate | File | Enforced by | Who can edit |
|------|------|------------|-------------|
| 1. Client ignore | `.leyline/leylineignore` | Client only | Each client locally |
| 2. Sync whitelist | `.leyline/vaultconfig/allowed [sync]` | Server | Vault admin |
| 3. History whitelist | `.leyline/vaultconfig/allowed [history]` | Server | Vault admin |

Gate 1 is covered in [[../collaboration/command-line|the command-line client]]. Gates 2 and 3 are covered here.

## The `allowed` file

`.leyline/vaultconfig/allowed` is an INI-style file with three sections. The server creates a default copy when a vault is first hydrated.

```ini
# .leyline/vaultconfig/allowed

[sync]
# Text documents
*.md
*.rmd
*.typ
*.txt
*.csv
*.json
*.yaml
*.yml
*.html
*.css
*.canvas
*.svg

# Images + PDFs (sync but no git history)
*.png
*.jpg
*.jpeg
*.gif
*.webp
*.pdf

[history]
# Subset of [sync] — line-based text formats that get git history
# Must also be in [sync] to matter
*.md
*.rmd
*.typ
*.txt
*.csv
*.json
*.yaml
*.yml
*.html
*.css
*.canvas
*.svg

[limits]
# Maximum file sizes per tier
# Supported units: kb, mb, gb (case-insensitive)
sync = 10mb
history = 1mb
```

### `[sync]` — what the server accepts

Patterns are filename globs matched against the bare filename (not the full path). A file that does not match any `[sync]` pattern is rejected with a `type_not_allowed` error. The server rejects the push with a `type_not_allowed` error frame; unlike the client `leylineignore` gate, the `[sync]` whitelist is not consulted by the client, so the file is sent and then refused.

A file that exceeds the `[limits] sync` size is rejected with a `file_too_large` error.

### `[history]` — what gets git tracking

A file that matches `[history]` patterns and is within the `[limits] history` size gets committed to git and participates in `leyline history`, `leyline tag`, `leyline revert`, and `leyline restore`. Files that match `[sync]` but not `[history]` are written to disk and synced between clients, but never committed — they don't appear in the git log.

A `[history]` pattern only matters if the file also passes the `[sync]` gate. Listing a pattern only in `[history]` has no effect.

### `[limits]` — size caps

```ini
[limits]
sync = 10mb       # per-file ceiling for sync; default 10 MB
history = 1mb     # per-file ceiling for git commits; default 1 MB
```

Supported units: `kb`, `mb`, `gb` (case-insensitive). Omitting a limit disables that cap.

The history limit is typically set lower than the sync limit so that large binaries (PDFs, images) sync to collaborators but don't bloat the git repository.

## Reloading after changes

The server watches `.leyline/vaultconfig/` and reloads `allowed` automatically within a few seconds of any write. No restart is needed.

## Pattern matching

Patterns use filename-only glob syntax (`*`, `?`, `[abc]`). They match the bare filename, not the full path. To allow `*.md` everywhere in the vault, a single `*.md` line is sufficient — there is no need to list subdirectory patterns.

## Typical customizations

**Add a file type:**

```ini
[sync]
*.md
*.excalidraw   # add this

[history]
*.md
*.excalidraw   # add here too if you want git history for it
```

**Increase the sync size limit for a video-heavy vault:**

```ini
[limits]
sync = 100mb
history = 1mb
```

**Lock down to text-only (no images or PDFs):**

Remove the images/PDFs block from `[sync]`. Any client that already has images locally will stop syncing them on the next push attempt.
