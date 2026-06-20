---
title: Seeing history
---

# Seeing history

Leyline keeps a git-backed history of every change. You can browse commits, see what changed in each one, and look up named snapshots your team has tagged.

These commands require the `sync.pull` capability — a permission attached to your API key by your vault admin (see [[../vault-management/keys-and-roles|keys and roles]]). History operations that create or delete tags require `history.tag`. Reverts require `history.revert`.

## Browsing recent commits

```sh
leyline history           # last 20 commits
leyline history 50        # last 50 commits
leyline history --all     # up to 200 (server cap)
leyline history --since 7d   # commits from the last 7 days
leyline history --with-diff  # include the diff for each commit
leyline history --out history.txt  # write to a file instead of stdout
```

Output shows the timestamp, author, file count, and commit message.

**In Obsidian:** use **Leyline: Show history** from the command palette. The output is written to `.leyline/backend/history-{timestamp}.txt` and opened as a note.

## Viewing a diff

Pass `--with-diff` to include the changed paths and line-level diff for each commit. This works for any commit in the server's history, not just recent ones.

## Named tags and review tags

Tags are named snapshots — they mark a commit as a meaningful state (a submitted draft, a version sent for review, etc.).

```sh
leyline tag "draft-submitted"       # tag the current state
leyline tag -d "draft-submitted"    # delete a tag by name
```

To list existing tags, use the REST API: `GET /_leyline/api/v1/{vault}/tags`. There is no `leyline tags` CLI command.

**Review tags** are auto-named with a timestamp and used as a "last reviewed" marker:

```sh
leyline review      # creates reviewed-2026-05-18T14-32-10Z at the current state
```

The Obsidian status bar shows `(N unreviewed since HH:MM)` when there are commits after the most recent `reviewed-*` tag. Running **Leyline: Mark reviewed** from the command palette clears the badge.

## Undoing changes

If you have `history.revert` capability:

```sh
leyline revert <commit>    # undo a specific commit via a new commit
leyline restore <commit>   # set the whole vault to that snapshot
```

`revert` creates a new commit that undoes one previous commit. If there are conflicts (because later commits touch the same lines), the conflicting paths are printed and the command exits non-zero — resolve them like any other conflict.

`restore` sets the entire vault to look like it did at `<commit>`. It cannot conflict. Use it to recover from a bad batch of edits.

Both commands run against the live server and affect all connected clients immediately.
