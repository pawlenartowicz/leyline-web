---
title: History and tagging
description: "Edits land directly; name a vetted state with leyline tag, auto-stamp it with leyline review, undo any commit or restore a snapshot — backed by real git."
tags: [quickstart, act-2]
---

# History and tagging

## Edits land directly

When you save a file, that's the live state of the vault for everyone — there's no mandatory draft branch or staging step in between. (If you want a review step, the tag-and-revert flow below covers it.)

## Tags mark vetted states

When a version is good, name it.

- `leyline tag <name>` — snapshot the current state under a name you choose.
- `leyline review` — snapshot with an auto-generated timestamp (`reviewed-2026-05-20T14-30-00Z`).

Tags are how you say "this version is the one." Both commands require the `history.tag` capability (capabilities are the permissions attached to your API key — granted by your vault admin, see [[@documentation/vault-management/keys-and-roles|keys and roles]]).

## Revert is first-class

Mistakes are easy to walk back. Holders of `history.revert` can undo a single commit (`leyline revert`) or restore the vault to a tagged snapshot (`leyline restore`). The capability is separate from `history.tag`, so you can grant the undo button more widely than the publish button.

These operations are also exposed over the REST history API, so CI pipelines and scripts can tag, revert, or restore without needing the `leyline` binary installed.

## Real git underneath

Leyline uses git for history — your vault is a real git repository, and your tags are real git tags. If you ever want to walk away, the history is in a format every developer already knows: `git log`, `git checkout`, `git diff` all work, no Leyline binary required.

---

Full tag/revert workflow: [[@documentation/vault-management/publishing-with-tags|Publishing with tags]]; browsing commits and diffs: [[@documentation/collaboration/seeing-history|Seeing history]]; every flag: [[@documentation/reference/cli-flags|CLI flags]].
