---
title: Plain files, your editor of choice
description: "Your vault is a plain directory of .md files — cat, grep, rsync, or git it directly; Obsidian, the leyline CLI, and LLM coding assistants all fit in."
tags: [quickstart, act-1]
---

# Plain files, your editor of choice

Your vault is a directory of `.md` files — the same layout Obsidian uses. You can `cat`, `grep`, `mv`, back up with `rsync`, or version-control with git (Leyline already keeps a `.git` for you, transparently). If Leyline disappears tomorrow, your notes are still there, unchanged.

That portability is the foundation the rest builds on. Because the file format isn't proprietary, most tools that open, edit, and save Markdown files fit in — sync just keeps everyone's copy current.

## What you can use today

The **Obsidian plugin** is the desktop GUI client — live sync, conflict markers in the editor, an API key to get started.

The **`leyline` CLI** runs as a daemon (`leyline autosync`, `leyline mirror`, or one-shot `leyline sync` / `leyline pull`). Point it at a folder and pick a mode that fits — it speaks the same WebSocket wire protocol every client uses.

**The REST API** is a first-class client too: CI pipelines can publish an entire vault snapshot via `POST /publish`, and the history API exposes tagging and revert without requiring the CLI binary.

**LLM coding assistants** like Claude Code, Cursor, or Aider work too: point one at the synced directory and the daemon picks up its edits like any other file change. No special integration is needed, and the same is true for most editors that save files to disk.

And **the web reader** (`leyline-web`) renders the same folder as a browsable site, with no separate build pipeline to maintain.

## What's coming

In active development: a **VS Code extension**, a **Rust client/library** (foundation for a possible native desktop app), **collaborative LaTeX** editing with PDF output, **Typst → PDF** export, **native Kanban rendering**, **mobile**, and a **browser-native editor**.

The browser editor is the least certain, currently aimed at roughly 2–5 months out. The Features tour covers each in turn.

---

One vault, many editors — the wire stays stable while clients come and go.
