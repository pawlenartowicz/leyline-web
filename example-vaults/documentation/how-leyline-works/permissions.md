---
title: Permissions
---

# Permissions

Leyline uses a capability model. Every action is controlled by one of six atomic capabilities. Roles are just named bundles of capabilities — they are a convenience, not a special access tier. Adding a new role never changes what any existing key can do.

## The six capabilities

| Capability | What it permits |
|---|---|
| `sync.pull` | Receive files from the vault (read, download, sync to disk) |
| `sync.push` | Send changes to the vault (write, upload, sync from disk) |
| `keys.manage` | Create and revoke API keys; change roles |
| `vault.admin` | Modify vault-level configuration (allowed file types, metadata, web settings) |
| `history.tag` | Create and delete tags; mark the vault as reviewed |
| `history.revert` | Revert a specific commit or restore the vault to an earlier snapshot |

## Built-in roles

Three roles ship with every vault:

| Role | Capabilities |
|---|---|
| `admin` | All six |
| `editor` | `sync.pull`, `sync.push`, `history.revert` |
| `reader` | `sync.pull` |

Editors can revert and restore their own mistakes without needing admin involvement. Only admins can tag a state as published or manage who has access.

## Custom roles

You can define additional roles in `.leyline/vaultconfig/roles`. A custom role is a name paired with any subset of the six capabilities. Built-in role names (`admin`, `editor`, `reader`) and names ending in `_guest` are reserved and cannot be used for custom roles (`_guest` is reserved for web guest roles — see Web guest access below).

## Web guest access

The web reader supports anonymous access, configured per-vault in `.leyline/vaultconfig/web.yaml`:

- **`guest_role: view`** — anyone can read the vault through the web reader without a key (the default).
- **`guest_role: none`** — a key is required for any web access.

The validator also accepts `edit` and `propose`, but these are placeholder values with no active write path in the current release. For now, `view` and `none` are the two values with defined behaviour.

Anonymous access applies only to the web reader. The Obsidian plugin and CLI always require a key.

## Server-wide admin

The capabilities above are all per-vault. Creating or destroying vaults, and emergency recovery operations, require server-wide admin authority. On the server itself, this is the `leyline-admin` command (available only to OS users with filesystem access). From a laptop, it is `leyline admin` using a key that holds `vault.admin` on a vault the server operator has flagged to grant server-wide admin. See [[../server-management/leyline-admin-rescue|operator access]] for details.

For how to assign roles and rotate keys in practice, see [[../vault-management/keys-and-roles|managing keys and roles]].

---

**Do this with:** [[../vault-management/keys-and-roles|Keys and roles]] (assign roles, define custom roles) · [[../server-management/leyline-admin-rescue|leyline-admin rescue]] (bootstrap a locked-out vault)
