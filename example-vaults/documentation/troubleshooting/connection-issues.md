---
title: Connection issues
---

# Connection issues

## Can't connect — "incompatible server, update client"

**Cause:** The server closed the WebSocket with code 1002 (`expected CBOR (v1 wire)`). The client and server are on mismatched wire versions.

**Fix:**
1. Check your client version — Obsidian: Settings → Community Plugins → Leyline; CLI: `leyline version`.
2. Check the server's build: `curl -s https://<host>/_leyline/health | jq .version`.
3. Update whichever is older to match.

The Obsidian plugin stops reconnecting after a 1002 close — updating alone won't restart it. Toggle sync off and on again in Settings after updating. The CLI daemon retries on restart: `leyline stop && leyline autosync`.

**Where to dig next:** [[auth-failures#Plugin shows "Authentication failed — plugin_outdated"|Plugin/server version mismatches]]

---

## Can't connect — server returns 404 for `/_leyline/sync/<vault>`

**Likely causes:**
- Vault ID is wrong in `.leyline/leylinesetup`.
- The vault hasn't been registered with the server yet.
- The vault's data directory doesn't exist on disk (registered but missing path).
- The vault's `.leyline/vaultconfig/access` file is missing (maps to `ErrVaultNotFound` → 404).

**Fix:**
1. Confirm the vault address: open `.leyline/leylinesetup` and check `vault = "host/vaultID"` — no `wss://` prefix.
2. On the server box: `leyline-admin vault list` — verify the vault ID is present.
3. If missing: `leyline-admin vault create <id>`.
4. If the path column is wrong or the directory doesn't exist, stop the server, fix `registry.toml`, restart.
5. If the access file is missing → run `leyline-admin key bootstrap-admin <vault> --name recovery` to recreate it.

---

## Can't connect — "server not available" / 503

**Cause:** Vault is known to the registry but failed to hydrate due to a corrupt git repo or filesystem error.

**Fix:**
1. Check server logs: `LEYLINE_LOG_LEVEL=debug leyline-server --config …` and look for `hydrate` errors.
2. Common sub-causes:
   - Git repo corrupt → `git fsck` inside the vault directory; restore from backup if needed.

**Where to dig next:** [[../server-management/backups-and-recovery|Backups and recovery]]

---

## Per-IP connection cap exceeded

**Cause:** More than 20 WebSocket connections from the same IP (hardcoded server limit). Typical in NAT/proxy setups where multiple users appear to come from one address.

**Symptom:** The upgrade request is rejected with HTTP 429 (too many connections) before the WebSocket handshake completes.

**Fix:** This cap is hardcoded; it can't be raised in config. If legitimate users share an IP, contact the server operator. Per-key cap (`max_connections_per_key`, default 7) is configurable — see [[../server-management/server-configuration|server configuration]].

---

## Daemon socket stale — `leyline sync` exits non-zero

**Cause:** A previous daemon process left `.leyline/backend/daemon.sock` without cleaning up (crash, SIGKILL).

**Fix:**
1. Check whether the daemon is actually running: `leyline status`.
2. If `status` fails: `rm .leyline/backend/daemon.sock .leyline/backend/daemon.pid`
3. Start a fresh daemon: `leyline autosync` (or `mirror`).

**Where to dig next:** [[../collaboration/command-line|Command-line sync]]

---

**See also:** [[../how-leyline-works/vaults-and-keys|Vaults and keys]] · [[../server-management/install-and-deploy|Install and deploy]] · [[../server-management/leyline-admin-rescue|leyline-admin rescue]]
