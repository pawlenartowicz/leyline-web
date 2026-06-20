---
title: Vault lifecycle
---

# Vault lifecycle

Vault creation and destruction are operator-level operations. From your laptop, use the `leyline admin` subcommand, which talks to the server over HTTPS. On the server box itself, the equivalent is `leyline-admin`, which uses the UNIX socket — see [[../server-management/leyline-admin-rescue|leyline-admin rescue]] for that path.

## Creating a vault

Unlike `destroy` and `reset`, which take a full `<host>/<vaultID>` address, `create` takes a bare vault id (lowercase alphanumeric and hyphens only — e.g. `my-research`). The server is inferred from `--server` or your keystore.

```sh
leyline admin vault create my-research \
  --server https://myserver.example \
  --admin-key-name alice \
  --admin-email alice@lab.example
```

This registers the vault on the server, initializes the `.leyline/` control plane, and mints the first admin key. The key token is printed once to stdout — copy it immediately and treat it as a secret. Add it to your keystore as described in [[../collaboration/connecting-to-a-vault|connecting to a vault]].

Optional flags:

| Flag | Purpose |
|------|---------|
| `--path PATH` | Absolute path for the vault directory on the server. Defaults to `<vaults_dir>/<id>`. |
| `--server-wide-admin` | Flag this vault so any key with `vault.admin` here gains server-wide authority. |
| `--admin-email EMAIL` | Contact email stored in the registry for this vault. |
| `--admin-key-name NAME` | Name for the first admin key (default: `initial-admin`). |

## Listing vaults

```sh
leyline admin vault list
leyline admin vault list --json
```

Shows vault ID, server path, server-wide-admin flag, and hydration state. With `--json`, also includes admin email and creation time.

## `vaultconfig/meta`

`.leyline/vaultconfig/meta` is an optional, operator-created YAML file that holds vault-level metadata. The server does **not** write this file on vault creation — the creation timestamp is stored separately in the server-side registry. If you create the file and include `created_at`, the server reads it; absent the file, the field is simply ignored. Do not add arbitrary keys; the parser is strict and treats unknown top-level keys as an error.

```yaml
# .leyline/vaultconfig/meta
created_at: "2026-01-10T09:00:00Z"
```

Currently only `created_at` is read by the server. The `encryption:` and `recovery:` keys are reserved for future use; do not populate them.

## Renaming a vault

Vault IDs are part of the server-side registry and cannot be changed in place. To effectively rename a vault:

1. Create a new vault with the desired ID.
2. Push your content to the new vault from a local checkout.
3. Update all collaborators' keystores and `leylinesetup` files to point at the new vault address.
4. Destroy the old vault once everyone has migrated.

There is no in-place rename command.

## Backing up the access file

The `access` file is the only file that can lock you out of a vault permanently if lost. Keep a copy outside the vault's git history.

The server automatically writes `.leyline/vaultconfig/access.bak` before every mutation. You can copy either the live file or the `.bak` to a safe location.

```sh
# Copy from the server host (requires SSH access):
scp server.example:/var/lib/leyline/vaults/my-research/.leyline/vaultconfig/access \
  ~/backups/my-research-access-$(date +%Y%m%d)
```

If the live access file ever becomes unreadable, the server automatically promotes the `.bak` file. If both are lost, use `leyline admin key bootstrap-admin` (server-wide admin required) or `leyline-admin key bootstrap-admin` (on the server box) to inject a recovery admin key without needing an existing valid key.

## Destroying a vault

```sh
leyline admin vault destroy myserver.example/my-research
```

This disconnects all connected clients, removes the vault from the server registry, and moves the vault directory to the server's trash directory (`<vaults_dir>/.trash/` by default). The vault data is **not immediately deleted** — the server operator can recover it from trash. There is no undo from the client side once the server has moved the directory.

## Resetting a vault (wipe content, keep config)

```sh
leyline admin vault reset myserver.example/my-research
```

Wipes the vault's content files but preserves `.leyline/` (keys, roles, `allowed`, `meta`, `web.yaml`, etc.). Use this to start fresh without losing your access configuration. All connected clients are disconnected first.
