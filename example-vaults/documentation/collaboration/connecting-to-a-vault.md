---
title: Connecting to a vault
---

# Connecting to a vault

Your vault admin sends you an API key that looks like `ley_AbCdEfGhIj0123456789`. You need to put it in the right place before either the Obsidian plugin or the `leyline` CLI can connect.

## The key file

Both clients read the same file: `~/.config/leyline/keys`. Platform paths: Linux: `$XDG_CONFIG_HOME/leyline/keys` if set, else `~/.config/leyline/keys`. macOS: `~/Library/Application Support/leyline/keys` (XDG_CONFIG_HOME is not consulted on macOS). Windows: `%APPDATA%\leyline\keys`.

The file is whitespace-columnar, one vault per line:

```
# vault address        key                       keyname (optional)
research.example.org/lab-notes  ley_AbCdEfGhIj0123456789  laptop
```

**Format rules:**
- Each line: `<host>/<vaultID>  <key>  [keyname]`
- Vault address is always `host/vaultID` — no `https://` prefix.
- `keyname` is optional. Use `-` in that column if you want no name. Use a name if you have multiple keys for the same vault (e.g. `laptop` and `server`).
- Lines starting with `#` and blank lines are ignored.
- Set the file mode to `0600`. `leyline init` refuses to write the file (errors out) if it already exists with wider permissions; fix with `chmod 600 ~/.config/leyline/keys`.

### Example with two keys for the same vault

```
research.example.org/lab-notes  ley_AbCdEfGhIj0123456789  laptop
research.example.org/lab-notes  ley_ZyXwVuTsRq9876543210  workstation
```

When connecting from the laptop, set `keyname = "laptop"` in `.leyline/leylinesetup` so the right key is picked. Without a keyname, the last matching line is used.

## Adding a key with `leyline init`

The easiest way to set everything up at once is to run `leyline init` inside a local copy of the vault directory. It prompts you for the vault address and key, tests the connection, and writes both the key file and the local config.

```sh
cd ~/Notes/lab-notes
leyline init
# Vault address: research.example.org/lab-notes
# API key: ley_AbCdEfGhIj0123456789
# Key name (optional): laptop
# Testing connection… OK
```

## Connecting from the Obsidian plugin

The plugin reads the same `~/.config/leyline/keys` file via Node's filesystem API — no separate credential entry in Obsidian settings. Before opening Obsidian, make sure the key file is in place and `0600`.

The vault address and optional keyname come from `.leyline/leylinesetup` inside the vault. If you used `leyline init` to set up the vault, this file is already written. If not, see [[../reference/leylinesetup|leylinesetup reference]] for the format.

Open the vault in Obsidian. The plugin status bar shows **🟢 Connected** once authentication succeeds. If it shows **🔴 Error**, open Settings → Leyline → **Test Connection** for a diagnostic message.

## Key management

Keys are created and revoked by vault admins. To see what keys exist or add a new one, see [[../vault-management/keys-and-roles|keys and roles]].
