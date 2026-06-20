---
title: Collaboration
description: "For vault members — connect with an API key from Obsidian, the leyline CLI, or the web reader; resolve conflicts, and browse history. Any process speaking the REST API is a client too."
---

# Collaboration

This section is for researchers editing notes in a shared vault — whether through Obsidian or the `leyline` command-line client. It covers everything from first login to reading notes on the web.

## Where to start

If you haven't connected to the vault yet, begin with [[connecting-to-a-vault|Connecting to a vault]]. Your vault admin gives you an API key; this page explains where to put it and how to verify it works.

## Pages in this section

- [[connecting-to-a-vault|Connecting to a vault]] — install your API key, understand the key file format, test the connection.
- [[obsidian-plugin|The Obsidian plugin]] — install the plugin, configure it, understand what each setting does.
- [[command-line|The command-line client]] — `leyline sync`, `pull`, `autosync`, `mirror`; one-shot vs daemon; ignoring files.
- [[resolving-conflicts|Resolving conflicts]] — what conflict markers look like, how to find them, how to clear them.
- [[seeing-history|Seeing history]] — browse commits, view diffs, see tags.
- [[reading-on-the-web|Reading on the web]] — log in to the web reader, navigate notes, share links.

## Editing: which client should I use?

The Obsidian plugin and the `leyline` CLI are both full editing clients — they connect to the same vault and stay in sync with each other. Use whichever fits your workflow:

- **Obsidian plugin** — best if you are already editing notes in Obsidian. Sync runs automatically in the background.
- **`leyline` CLI** — best for scripting, headless environments, or if you prefer the terminal. The `autosync` daemon keeps the vault in sync continuously.

For read-only access without installing anything, see [[reading-on-the-web|Reading on the web]]. Automation and CI can also interact with the vault directly via the REST API.

For background on how sync works, see [[../how-leyline-works/plain-files-and-git|plain files and Git]].
