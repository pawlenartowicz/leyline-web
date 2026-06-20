---
title: Sync stuck
---

# Sync stuck

## Push rejected with `stuck_file` error

**Cause:** The server detected the same file being pushed repeatedly with the same content (ring buffer of last 4 hashes, ≥2 repeats). This is a safety guard against a client bouncing the same data in a tight loop.

**Fix:**
1. Stop the daemon: `leyline stop`.
2. Check whether another tool (backup, indexer) is touching the file on disk and triggering re-hashes.
3. Check `.leyline/leylineignore` — add the pattern if the file shouldn't be synced at all.
4. Restart the daemon: `leyline autosync`.

If the file legitimately changed and still triggers this, the fix is the same (stop, investigate, restart). The guard clears for a path as soon as a push with different content for that path commits successfully (the loop is, by definition, broken). A bare reconnect with the same client does not reset it.

**Where to dig next:** [[../vault-management/what-syncs|What syncs]]

---

## Push rejected with `rate_limited`

**Cause:** More than `push_rate_limit` pushes within a 5-second sliding window from your key (default `push_rate_limit: 1`, i.e. ~1 push per 5 seconds). Configurable by the server operator.

**Fix:**
- This is transient. The plugin reschedules; the CLI daemon backs off automatically.
- If it's persistent: the vault may be under load from multiple clients. Contact the server operator if the limit needs raising.
- If you're scripting against the API directly, add a delay of at least 5 seconds between pushes.

**Where to dig next:** [[../server-management/server-configuration|Server configuration]]

---

## Push rejected with `vault_full`

**Cause:** The vault has hit the operator-configured `max_files` or `max_total_bytes` cap.

**Fix:**
- Delete files from the vault to bring it under the cap.
- Or ask the server operator to raise the limit in `server.yaml` under `vault_limits:`.

---

## Daemon keeps reconnecting in a loop

**Likely causes:**
- Server is unreachable (network/TLS).
- Auth failing on every attempt (key revoked or expired).
- WAL replay is taking long on a large vault at startup.

**Fix:**
1. Run `leyline autosync --debug` (foreground) to see reconnect reason in real time.
2. Check server logs: `LEYLINE_LOG_LEVEL=debug leyline-server …` — look for `auth_fail` reason label.
3. If WAL replay: let it run. On a large vault, first startup after a crash can take seconds to minutes. Degraded replay surfaces as `wal replay partial` / `wal replay drop op` warnings in the server log — these only appear when entries are dropped, not on a clean replay.

---

## Sync appears stuck — `leyline status` shows `last_sync` from hours ago

**Likely causes:**
- Daemon is stuck alternating push and hold (the `push|hold` stance) due to `stale_base` — a conflicting remote change it can't get past.
- Pending ops in the staged log that haven't been acked.
- No file changes detected (fsnotify missed events — common on large vaults or network filesystems).

**Fix:**
1. `leyline status` — check `dirty_files` count.
2. `leyline conflicts` — see if any paths are frozen.
3. `leyline stop && leyline autosync` — reconnect; a fresh `Hello` will re-resolve the base.
4. If on NFS/sshfs: the OS file-change watcher can silently miss edits on network filesystems. Workaround today: restart the daemon (`leyline stop && leyline autosync`) to force a full re-scan. A built-in timer-based poll for network filesystems is planned but not yet available.

**Where to dig next:** [[../collaboration/resolving-conflicts|Resolving conflicts]]

---

## `stale_base` keeps looping — push never succeeds

**Cause:** Another client (or the daemon on a second machine) is pushing to the same file faster than your client can re-Hello and catch up.

**Fix:**
1. Check `leyline conflicts` — the conflicted file may need manual resolution before the loop breaks.
2. If two daemons are writing the same file continuously, coordinate writes at the application level.
3. As a last resort: `leyline pull --discard` on one side to accept the server state and break the loop.

---

**See also:** [[../how-leyline-works/conflicts-and-history|Conflicts and history]] · [[../vault-management/what-syncs|What syncs]] · [[../server-management/server-configuration|Server configuration]]
