---
title: Publishing with tags
---

# Publishing with tags

Tags mark known-good states in the vault's git history. Use them to signal "this version was reviewed," recover from a bad batch of edits, or anchor the web reader to a published snapshot (web/tag integration is planned for a future release).

## Who can do what

| Capability | Built-in roles | Operations |
|------------|---------------|------------|
| `history.tag` | `admin` | Create and delete tags, run `leyline review` |
| `history.revert` | `admin`, `editor` | Revert a commit, restore a snapshot |
| `sync.pull` | `admin`, `editor`, `reader` | Read history (`leyline history`, `GET /_leyline/api/v1/.../log`) |

Custom roles can be granted these capabilities individually — see [[keys-and-roles]].

## Creating a tag

```sh
leyline tag my-release
leyline tag my-release <commit-sha>   # tag a specific commit instead of HEAD
```

Tags are lightweight git refs. The name must match `^[A-Za-z0-9][A-Za-z0-9._/-]*$`, be 64 characters or fewer, contain no `..`, and not start with `-`.

Tagging the same commit twice with the same name succeeds silently (idempotent). Tagging a different commit with an existing name fails with a conflict error; delete the tag first.

All connected clients receive a `tag_created` broadcast immediately.

## Marking a review

```sh
leyline review
```

Creates an auto-named tag `reviewed-YYYY-MM-DDTHH-MM-SSZ` at HEAD (colons replaced with hyphens because git refnames forbid `:`). The timestamp is UTC and lexicographically sortable.

The server retries on collision (two reviews in the same second) by bumping the timestamp by one second, up to five attempts. All connected clients receive a `tag_created` broadcast when the review tag lands. The Obsidian plugin additionally surfaces this as a status-bar badge: `(N unreviewed)` resets to zero after a review and ticks up again as new commits arrive.

## Deleting a tag

```sh
leyline tag -d my-release                # delete by name
leyline tag -d --commit <sha>            # delete every tag at a commit
```

Deletion broadcasts `tag_deleted` to all connected clients.

## Reverting a commit

Use `leyline revert` to undo one specific commit while keeping everything that came after it.

```sh
leyline revert <commit-sha>
```

This creates a new "revert" commit. All connected clients converge to the new state immediately via a broadcast.

If the revert conflicts with a later change to the same lines, the operation aborts cleanly (no half-applied state) and prints the conflicting paths. You can then resolve the conflict manually or use `leyline restore` instead.

## Restoring a snapshot

Use `leyline restore` to roll the entire vault forward to exactly what it looked like at a past commit.

```sh
leyline restore <commit-sha>
```

This is the recovery path for "the vault is completely garbled." It rewrites the working tree to match `<commit>` and creates a new commit recording the change. It cannot conflict.

## Browsing history and finding commits

To look up commit hashes to use with `revert` or `restore`, browse the vault history from any connected client — see [[../collaboration/seeing-history|seeing history]].

## Note on web reader integration

Web/tag integration (serving the vault at a named tag URL) is planned for a future release. For now, the web reader always serves the working tree.
