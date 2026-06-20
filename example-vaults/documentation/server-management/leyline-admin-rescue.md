---
title: leyline-admin (rescue)
---

# `leyline-admin` (rescue)

`leyline-admin` is the server-box operator CLI for vault lifecycle and emergency key recovery. It ships alongside `leyline-server` (built from the same repo at `cmd/leyline-admin/`) and talks to the running server over the UNIX socket at `/run/leyline/admin.sock`. Because the socket is mode `0600` and owned by the service user, access to the socket **is** the auth boundary — no Bearer key is required.

The laptop equivalent is `leyline admin <verb>`, which exposes the same verbs and output format but resolves vault addresses from the keystore rather than accepting bare vault IDs.

## When to use `leyline-admin`

- **Vault lifecycle.** Creating and destroying vaults, especially when the server has just been set up and no vault admin key exists yet.
- **Locked out.** All admin keys for a vault have been lost or rotated away. Use `key bootstrap-admin` to force-mint a new admin key without needing an existing one.
- **Server is down.** `vault list` reads `registry.toml` directly from disk without needing the socket. All other verbs require the server to be running.
- **Registry inspection.** Quick offline audit of registered vaults and their paths.

## Flags

| Flag | Env | Default | Purpose |
|---|---|---|---|
| `--socket PATH` | `LEYLINE_ADMIN_SOCKET` | `/run/leyline/admin.sock` | UNIX socket path. |
| `--registry PATH` | `LEYLINE_REGISTRY` | `/etc/leyline/registry.toml` | Registry file; used by offline `vault list`. `leyline-admin` uses this fixed fallback and does not read `server.yaml` — set `--registry` or `LEYLINE_REGISTRY` if the server stores the registry elsewhere. |
| `--json` | — | — | Machine-readable output. |

## Vault verbs

```sh
# Create a new vault, print the first admin key once.
leyline-admin vault create research \
  --path /opt/leyline/vaults/research \
  --admin-key-name ops \
  --server-wide-admin

# List all registered vaults (works when server is down).
leyline-admin vault list

# Evict a vault from memory; next client reconnect rehydrates.
leyline-admin vault reload research

# Disconnect all clients and wipe vault content (keeps .leyline/).
leyline-admin vault reset research

# Permanently remove a vault. Moves its directory to the trash.
leyline-admin vault destroy research
```

`vault destroy` moves the vault directory to `<trash_dir>/<id>-<timestamp>` (e.g. `research-2026-05-18T10-05-00Z`). The trash directory defaults to `<vaults_dir>/.trash`; override with `trash_dir:` in `server.yaml`. The server does not auto-prune the trash — clean it up manually when you are satisfied the data is no longer needed.

## Key verbs

```sh
# List keys for a vault.
leyline-admin key list research

# Add a new key (role defaults to editor if not specified).
leyline-admin key add research --name alice --role editor

# Remove a key.
leyline-admin key remove research alice

# Force-add an admin key when all admins are locked out.
# This is the recovery path — no server-wide admin check applies over the socket.
leyline-admin key bootstrap-admin research --name recovery-ops
```

`key bootstrap-admin` prints the new key once to stdout. Store it in your secrets manager immediately.

## Server verbs

```sh
# Show server status: uptime, active connections, hydrated vault count.
leyline-admin status
```

`reload-config` is reserved but returns HTTP 501 "reload-config not yet implemented" in this build — calling it always fails with a non-zero exit. To apply `server.yaml` changes, restart the server:

```sh
systemctl restart leyline-server
```

## Offline `vault list`

When the server is not running, `vault list` reads `registry.toml` directly:

```
$ leyline-admin vault list
[offline] (server not running — runtime columns elided)
ID          SERVER-WIDE  PATH
research    true         /opt/leyline/vaults/research
notes       false        /opt/leyline/vaults/notes
```

With `--json`, the output includes `"offline": true` and omits runtime columns (hydrated, active connections).

## Registry file format

`registry.toml` is the server's vault index. Each vault is a TOML table:

```toml
[vaults.research]
path = "/opt/leyline/vaults/research"
server_wide_admins = true
admin_email = "ops@example.com"
created = "2026-05-18T10:00:00Z"
```

Fields:

| Field | Required | Notes |
|---|---|---|
| `path` | yes | Absolute path to the vault root. |
| `server_wide_admins` | no (default `false`) | If `true`, any key holding `vault.admin` in this vault has server-wide admin authority across all vaults. |
| `admin_email` | no | Informational only. |
| `created` | yes | Set by the server; do not edit. |

**Server-wide admin.** Authority is derived at request time — the server checks the registry for `server_wide_admins = true` vaults and then verifies the calling key against each such vault's `access` file. There is no separate operator-credentials store. Limit `server_wide_admins = true` to vaults whose members should have permanent server-wide authority.

## Manual registry recovery

If `registry.toml` is lost or corrupted and the server will not start:

1. Stop the server.
2. Re-create `registry.toml` with entries for each vault directory that still exists on disk.
3. Verify the file parses: `leyline-admin vault list` (offline mode reads the file without a running server).
4. Start the server. Vaults will hydrate lazily on first client connection.

The only irrecoverable loss in a registry failure is the `server_wide_admins` flag — vault content and keys live in the vault directories themselves and are unaffected.

## Troubleshooting

- **`server not running (no socket at /run/leyline/admin.sock)`** — the server is stopped, or the socket path is wrong. Check `--socket` or `LEYLINE_ADMIN_SOCKET`.
- **`permission denied`** on the socket — you are not running as the `leyline` user (or equivalent). Use `sudo -u leyline leyline-admin ...` or add your user to the service group.
- **`vault list` shows stale entries** — the registry still references a vault directory that was moved or deleted. Stop the server, remove the entry from `registry.toml`, and restart.

---

**See also:** [[../how-leyline-works/permissions|Permissions]] (capability and server-wide admin model) · [[backups-and-recovery|Backups and recovery]] (registry recovery procedure) · [[server-configuration|Server configuration]] (`admin_socket` and `registry` knobs)
