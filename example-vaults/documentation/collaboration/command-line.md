---
title: The command-line client
---

# The command-line client

The `leyline` binary is a full sync client: one-shot commands for scripting, a headless daemon for continuous background sync, and the same wire protocol every Leyline client uses.

## Getting started

Run this once inside a local copy of the vault directory:

```sh
leyline init
```

It prompts for the vault address and API key, tests the connection, and writes the local config. After init you can run any of the sync commands from within that directory (or any subdirectory).

## One-shot vs daemon

Two pairs of commands, each with a different cadence:

| Command | Pushes changes? | Keeps running? |
|---|---|---|
| `leyline sync` | Yes | No — disconnects when done |
| `leyline pull` | No | No — disconnects when done |
| `leyline autosync` | Yes | Yes — watches for changes in the background |
| `leyline mirror` | No | Yes — holds a live connection and applies server changes as they arrive (pull-only) |

Use `sync` / `pull` for an explicit one-off update (scripting, before a writing session). Use `autosync` for continuous background sync. Use `mirror` on read-only machines.

### Starting and stopping the daemon

```sh
leyline autosync          # detaches to background; logs → .leyline/backend/daemon.log
leyline autosync --debug  # stays in foreground with live event output
leyline status            # show connection state and last sync time
leyline stop              # gracefully shut down the daemon
```

### Discard mode

`leyline pull --discard` and `leyline mirror --discard` overwrite local changes with the server version silently — no conflict block, no freeze. Local edits on the affected path are gone. `--discard` is rejected by `sync` and `autosync` (which also push) to prevent silent data loss.

## Ignoring files with `.leyline/leylineignore`

Create or edit `.leyline/leylineignore` in your vault root to stop specific files from being synced. The syntax is identical to `.gitignore`.

```gitignore
# scratch files that should stay local
*.tmp
.DS_Store
scratch/
```

Putting `*.tmp` here means `.tmp` files stay on your machine and are never sent to the server. They are also not overwritten by incoming changes from teammates.

The `leylineignore` file is local to your machine — it lives in `.leyline/` (not inside `.leyline/vaultconfig/`) and is not synced. Each team member can have a different ignore list.

The daemon hot-reloads the file: changes take effect within a few seconds without restarting.

For the server-side filter that controls which file types are allowed to sync at all, see [[../vault-management/what-syncs|what syncs]].

## Listing and removing vaults

```sh
leyline list            # show all vaults registered on this machine
leyline list --json     # machine-readable
leyline remove host/vaultID   # stop daemon (if running) and unregister
```

`leyline list` shows the status (`online`, `offline`, `off`, `missing`, or `error`) and the time of the last sync for every vault you have initialized on this machine.
