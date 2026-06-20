---
title: Keys and roles
---

# Keys and roles

Every collaborator connects with an API key. Keys are issued per-vault, stored in `.leyline/vaultconfig/access`, and carry a role that determines what the holder can do.

## The `access` file

`.leyline/vaultconfig/access` is the authoritative list of keys for the vault. It syncs to the server and is visible only to keys holding `vault.admin`. The file is tab-separated; the server also accepts spaces (be liberal on read, strict on write).

```
# .leyline/vaultconfig/access — vault identity and roles
# name	role	hash	generated	last_seen	expires_at	email
# Managed via admin API. Manual edits are supported.
alice	admin	a3f9c2e1b4d85f6e7a2b	2026-01-10T09:00	2026-05-17	-	alice@lab.example
bob	editor	8d1e3a7c6f924b05e3d1	2026-02-14T14:30	2026-05-18	-	bob@lab.example
charlie	reader	2c5b9f4a1d837e06b9c2	2026-03-01T11:00	2026-04-12	2026-12-31	charlie@guest.example
ci-bot	reader	f7e4d2a3b18950c6d7e5	2026-03-15T08:00	-	-	-
```

Fields:

| Column | Required | Notes |
|--------|----------|-------|
| `name` | yes | Human-readable label; must be unique. |
| `role` | yes | Built-in or custom role name. |
| `hash` | yes | First 24 hex chars of `SHA256(token)`. Never the raw token. |
| `generated` | yes | ISO-8601 date-time when the key was minted. |
| `last_seen` | no | Date of last successful auth; updated by the server. Use `-` when absent. |
| `expires_at` | no | `YYYY-MM-DD`; key becomes invalid after this date. Use `-` for no expiry. |
| `email` | no | Contact address. Use `-` when absent. |

The server keeps a `.bak` copy before every write. If the live file becomes unparseable, the server restores from `.bak` automatically. Never delete both.

Removing a key from `access` immediately denies access to anyone using it. In-flight WebSocket connections are closed promptly when the server re-evaluates sessions after the access change (with a `key_revoked` close reason).

## Creating a key

```sh
leyline admin key add myserver.example/myvault --name bob --role editor
```

The token (`ley_` + 20 alphanumeric chars) is printed **once** to stdout. Copy it now — the server stores only the hash, not the token itself. Hand the token to your collaborator out-of-band; they add it to `~/.config/leyline/keys` as described in [[../collaboration/connecting-to-a-vault|connecting to a vault]].

The `email` column in the `access` file is not populated by `key add` — the `--email` flag is accepted by the CLI but is not currently persisted server-side. To set an email address, edit `.leyline/vaultconfig/access` directly and add the address in the `email` column for the relevant row.

## Revoking a key

```sh
leyline admin key remove myserver.example/myvault bob
```

The server refuses the operation if removing `bob` would leave the vault with no keys holding `vault.admin`. To replace the last admin, add a new admin key first.

## Changing a role

There is no CLI verb for changing an existing key's role. Use one of two approaches:

**REST API** — send a `PUT` request to the role endpoint:

```sh
curl -X PUT https://myserver.example/_leyline/admin/myvault/keys/bob/role \
  -H "Authorization: Bearer ley_<your-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role":"editor"}'
```

**Edit the access file directly** — open `.leyline/vaultconfig/access` in any editor, change the role column for the relevant row, and save. The server's fsnotify watcher picks up the change automatically; no restart needed.

The server reevaluates all connected sessions on every access-file change. A client whose role changes receives a `role_changed` close reason and must reconnect.

## Built-in roles

Three roles ship with every vault: `admin` (all six capabilities), `editor` (`sync.pull`, `sync.push`, `history.revert`), and `reader` (`sync.pull` only). Built-in role names are reserved; you cannot redefine them in the `roles` file.

For the full capability table and role definitions, see [[../how-leyline-works/permissions|Permissions]].

## Custom roles

Define custom roles in `.leyline/vaultconfig/roles`. The file is absent by default; create it when you need roles that don't map to the three built-ins.

Format: one role per line, two whitespace-separated fields — name and comma-separated capability list.

```
# .leyline/vaultconfig/roles
# name  cap1,cap2,...

# A reviewer can tag states but cannot push changes.
reviewer  sync.pull,history.tag

# A curator can push and tag, but cannot manage keys or admin the vault.
curator  sync.pull,sync.push,history.tag,history.revert
```

Rules:
- Names must match `^[a-z][a-z0-9_-]*$`.
- Names ending in `_guest` are reserved.
- All capabilities in the list must be known; an unknown capability drops the entire row (with a server log warning).
- Duplicate names drop the second row.

Assign a custom role the same way as a built-in:

```sh
leyline admin key add myserver.example/myvault --name dana --role reviewer
```

The `roles` file is reloaded by the server on every write without restarting. Connected sessions with the affected role receive a `role_changed` or `caps_changed` close reason.
