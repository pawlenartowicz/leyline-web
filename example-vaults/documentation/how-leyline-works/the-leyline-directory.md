---
title: The .leyline directory
---

# The `.leyline/` directory

Every vault has a `.leyline/` folder at its root. This is where Leyline stores configuration, runtime state, and the files that control access and sync behaviour. You will rarely need to touch it directly — most settings are managed through the CLI or admin API — but understanding its layout helps when something needs diagnosing.

## What gets synced to everyone

`.leyline/README.md` is the only file in `.leyline/` that syncs to all users regardless of role. It is a good place to leave connection instructions or team notes.

## What syncs to admins only

Everything under `.leyline/vaultconfig/` is synced only to users with the `vault.admin` capability. This directory is the vault's control plane:

| File | Purpose |
|---|---|
| `access` | API key records (hashed tokens, names, roles, expiry) |
| `allowed` | Which file extensions and sizes are permitted to sync and to be tracked in history |
| `roles` | Custom role definitions |
| `meta` | Vault metadata (`created_at`; see [[../vault-management/vault-lifecycle\|vault lifecycle]] for reserved keys) |
| `web.yaml` | Web reader settings (guest access, auth/login button) |
| `webignore` | Which files the web reader hides from view or history |
| `theme/` | Per-vault web theme overrides |

These files are git-tracked alongside vault content, so changes to access or configuration are part of the same audit trail as edits to notes.

## What stays local only

Three things in `.leyline/` are never synced — they exist only on the client device (the laptop running the Obsidian plugin or the CLI daemon) and are never sent to the server:

- **`leylineignore`** — a gitignore-syntax file controlling which local files are never sent to the server. See [[../vault-management/what-syncs|what syncs]].
- **`leylinesetup`** — per-device configuration (TOML format): server address (the `vault` host/vaultID), key name, and conflict display (`diff_mode`). Sync mode is chosen per-invocation by the CLI subcommand, not configured here. See [[../reference/leylinesetup|leylinesetup reference]].
- **`backend/`** — runtime files written by the daemon: `daemon.pid`, `daemon.sock`, `state.json`, conflict log. These are transient; deleting them is safe when the daemon is not running.

## If you delete something

Deleting a file from `vaultconfig/` is an admin-level change that propagates to the server on next sync. Deleting `leylineignore` or `leylinesetup` removes local-only preferences; neither affects other team members. Deleting files in `backend/` is harmless when the daemon is stopped.

---

**Do this with:** [[../collaboration/command-line|The command-line client]] (leylineignore) · [[../reference/leylinesetup|leylinesetup reference]] (leylinesetup TOML) · [[../vault-management/index|Vault management]] (vaultconfig files)
