---
title: Backups and recovery
---

# Backups and recovery

## What to back up

Leyline's backup story is intentionally simple: **each vault is a plain directory with a git repository inside it.** There is no separate database.

### Vault directories

Back up the entire vault root (`vaults_dir`), including all subdirectories and hidden files:

```
/opt/leyline/vaults/
├── research/
│   ├── .git/                  ← full git history
│   ├── .leyline/
│   │   ├── vaultconfig/
│   │   │   ├── access         ← API keys (SHA256-hashed) and roles — SECRET
│   │   │   ├── allowed        ← sync/history allowlists
│   │   │   ├── roles          ← custom role definitions
│   │   │   ├── meta           ← vault metadata
│   │   │   └── web.yaml       ← web reader settings
│   │   └── README.md          ← synced to non-admins
│   └── ... (vault content)
└── notes/
    └── ...
```

The `.leyline/vaultconfig/access` file is the only secret-bearing file. It contains SHA256-prefixed hashes of API keys (not the keys themselves). An attacker with a copy of this file and a key in hand can verify membership, but cannot reconstruct keys from the file alone. Still treat it as sensitive.

### Server configuration

```
/opt/leyline/config.yaml        ← server configuration
/opt/leyline/registry.toml      ← vault registry (ID → path + flags)
```

The registry maps vault IDs to filesystem paths and `server_wide_admins` flags. Without it, the server can still start (it creates an empty registry) but it will not know about existing vaults until they are re-registered.

### WAL directory

The WAL (`/var/lib/leyline/` under systemd, or `~/.local/state/leyline-server/` otherwise) holds uncommitted in-flight edits between client pushes and git commits. Under normal operation the WAL is empty or near-empty. It is safe to omit from scheduled backups — loss of the WAL means at most `stage.max_delay` seconds of unconfirmed edits (default 60 s) are dropped on crash. Include it if you want crash-consistent backups.

## Backup approach

A consistent snapshot requires that no commit is in progress while you copy `.git/`. The simplest approach is to stop the server first:

```sh
systemctl stop leyline-server
rsync -a --delete /opt/leyline/vaults/ /backup/leyline-vaults/
rsync -a /opt/leyline/config.yaml /opt/leyline/registry.toml /backup/leyline-config/
systemctl start leyline-server
```

For live backups (no service interruption), use a filesystem snapshot (LVM, ZFS, Btrfs) or a git-aware backup tool. A plain `rsync` of a live git repository can produce an inconsistent `.git/` if a commit lands mid-copy. Short downtime (seconds) is acceptable for most small research teams.

## Restoring a vault

### From a full backup

1. Stop the server: `systemctl stop leyline-server`
2. Copy the vault directory back into place: `rsync -a /backup/leyline-vaults/research/ /opt/leyline/vaults/research/`
3. Ensure permissions: `chown -R leyline:leyline /opt/leyline/vaults/research/`
4. Restore `config.yaml` and `registry.toml` if they were lost.
5. Start the server: `systemctl start leyline-server`

The server hydrates vaults lazily on first client connection — it does not scan the vault directory at startup. If the vault is in the registry, clients can connect immediately after the server starts.

### Registry recovery (registry lost, vaults intact)

If `registry.toml` is lost but vault directories are intact:

1. Stop the server.
2. Create a new `registry.toml` with an entry for each vault:

```toml
[vaults.research]
path = "/opt/leyline/vaults/research"
server_wide_admins = false
created = "2026-01-01T00:00:00Z"   # approximate date is fine
```

3. Verify offline: `leyline-admin vault list` reads the file directly without the server running.
4. Start the server.

The `created` timestamp is informational. The `server_wide_admins` flag must be set correctly — if you are unsure, leave it `false` and promote vaults to server-wide admin authority manually afterwards (`leyline-admin vault create` or hand-edit while the server is stopped).

### Rolling back vault content

Vault content history is stored as ordinary git commits. To roll back to a previous state, use the `leyline restore` command from a connected client (requires `history.revert` capability), or use `leyline-admin vault reset` to wipe all content and git history while keeping `.leyline/` — it re-inits `.git/` from scratch with a new first commit, so the entire commit history is discarded. This is a full content+history wipe, not just a working-tree clear (and not a point-in-time restore).

For git-level recovery without a client:

```sh
# On the server box, as the leyline user or with appropriate permissions.
cd /opt/leyline/vaults/research
git log --oneline -20          # find the target commit
git diff HEAD~5 HEAD           # inspect what changed

# Roll forward to a specific commit (destructive — writes to working tree).
# Then restart the server so it rehydrates from the new HEAD.
git checkout <commit> -- .
git add -A
git commit -m "manual restore: <reason>"
systemctl restart leyline-server
```

Direct git manipulation bypasses the server's WAL and stage state. Only do this while the server is stopped, or after first running `leyline-admin vault reload <id>` to evict the vault so the server does not have stale in-memory state.

## What is not backed up

- **Client-local files.** `.leyline/leylineignore`, `.leyline/leylinesetup`, `.leyline/backend/` (daemon runtime, conflict log, state) live on each user's machine and are intentionally excluded from sync. Operators do not need to back these up.
- **The trash directory.** `vault destroy` moves vaults to `<vaults_dir>/.trash/`. Back this up if you want a recovery path after `destroy`.

## Checking git integrity

After restoring, verify the vault repository is intact:

```sh
cd /opt/leyline/vaults/research
git fsck --full
```

A clean output (no dangling or missing objects) means the history is intact. Run `git gc` once after restore to compact the repository.

---

**See also:** [[../how-leyline-works/plain-files-and-git|Plain files and Git]] (why the vault is a plain directory) · [[leyline-admin-rescue|leyline-admin rescue]] (registry recovery, bootstrap-admin) · [[server-configuration|Server configuration]] (`trash_dir`, WAL path)
