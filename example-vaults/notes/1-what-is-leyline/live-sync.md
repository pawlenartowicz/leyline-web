---
title: Real-time sync
description: "Changes flow over WebSocket as files are saved; three-way merge handles most overlaps automatically, and same-line conflicts are marked where you edit."
tags: [quickstart, act-1]
---

# Live sync, on your terms

Three to five people editing one vault is the size we test against; the protocol doesn't impose a ceiling, and solo sync across your devices works the same way. Changes flow over WebSocket as files are saved, with a few modes to pick from: `autosync` (push as you go), `mirror` (pull as others change things), or one-shot `sync` / `pull`.

When two people edit the same file in different places, the line-level three-way merge usually lands both edits without anyone noticing. When two edits land on the *same* line, you get a conflict marker on disk in the form your editor already understands: an Obsidian `[!conflict]` callout in Markdown, a language-aware comment block in code, or traditional `<<<<<<<` markers if you prefer git-style — your pick via `diff_mode`.

How merge works in depth and how to clear conflict markers: [[@documentation/how-leyline-works/conflicts-and-history|Conflicts and history]] and [[@documentation/collaboration/resolving-conflicts|Resolving conflicts]].

The same wire carries every client — the `leyline` CLI daemon, the Obsidian plugin, the web reader, and anything else speaking the protocol — one shape of pipe, shared by everything.
