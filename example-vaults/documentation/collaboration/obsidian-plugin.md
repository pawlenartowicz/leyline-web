---
title: The Obsidian plugin
---

# The Obsidian plugin

The Leyline plugin keeps your Obsidian vault in sync with your team's shared vault. It connects as soon as you open Obsidian and downloads anything new since you last had it open.

## Installing the plugin

The plugin is not yet listed in the Obsidian community plugins directory. Install it manually:

1. Download `main.js` and `manifest.json` from the latest release.
2. Create the folder `.obsidian/plugins/leyline/` inside your vault.
3. Copy both files into that folder.
4. In Obsidian: Settings → Community plugins → enable **Leyline**.

The plugin requires Obsidian 1.5.0 or later, and is desktop-only (no mobile).

## First-time setup

Before enabling the plugin, make sure:

- `.leyline/leylinesetup` exists in your vault with `vault = "host/vaultID"`.
- Your platform's leyline keys file contains an entry for that vault address (Linux: `~/.config/leyline/keys`; macOS: `~/Library/Application Support/leyline/keys`; Windows: `%APPDATA%\leyline\keys`).

If you ran `leyline init` on the command line, both files are already in place. See [[connecting-to-a-vault|Connecting to a vault]] for details.

## Settings

Open Settings → Leyline.

| Setting | What it does |
|---|---|
| **Vault setup** | Shows the vault address read from `.leyline/leylinesetup`. Read-only — edit the file to change it. |
| **Key** | Shows the keyname in use (e.g. `laptop`). The key value is never displayed. |
| **Test Connection** | Opens a one-off WebSocket connection and reports whether it succeeded. Doesn't affect the live connection. |
| **Status** | Shows `Connected as "<name>"` and how long ago the last sync was. |
| **Ignore patterns** | Edits `.leyline/leylineignore` directly. Changes take effect within a second. Clearing this field removes the file — no ignore rules apply. |
| **Start from server** | Downloads everything from the server and replaces any local-only files. Use this after cloning a new vault. Requires confirmation. |
| **Sync everything** | Builds a manifest from your local files and syncs from there. Use this when local and remote have both changed and you want a full reconciliation. Requires confirmation. |
| **Stop syncing** | Disconnects and stops reconnecting until you re-enable sync. The stopped state persists across restarts. |

## How sync works

When you open Obsidian, the plugin connects to the server and downloads all changes since your last session. After that it stays connected: every save you make is sent to the server within a few seconds, and changes from teammates arrive the same way.

The status bar shows the connection state:
- ⚪ Disconnected
- 🟡 Connecting
- 🟢 Connected
- 🔄 Syncing
- 🔴 Error

If a teammate has edited the same passage you just saved, the plugin writes a conflict block into the file — see [[#Conflicts in Obsidian]] below.

## Conflicts in Obsidian

When a conflict can't be auto-merged, the plugin writes a `[!conflict]` callout directly into the note and shows a notice. Obsidian renders the callout with a red bar. To resolve it: edit the note and delete the callout block. The plugin marks the conflict resolved on your next save.

Full details on conflict formats and how to find them: [[resolving-conflicts|Resolving conflicts]].

## History commands (command palette)

| Command | What it does |
|---|---|
| **Leyline: Tag current state** | Creates a named tag on the server at the current commit. |
| **Leyline: Mark reviewed** | Creates a timestamped `reviewed-…` tag. |
| **Leyline: Show history** | Writes a formatted history file to `.leyline/backend/history-{timestamp}.txt`. |

For background on tags and reviews, see [[seeing-history|Seeing history]].
