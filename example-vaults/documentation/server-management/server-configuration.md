---
title: Server configuration
---

# Server configuration

All configuration lives in a single `server.yaml` (path set by `--config`, default `config.yaml` in the working directory). The file is read at startup. `reload-config` (`leyline admin reload-config` / `leyline-admin reload-config`) is not yet implemented — it returns HTTP 501 and exits non-zero. Config changes currently require a server restart (`systemctl restart leyline-server`).

## Annotated `server.yaml`

```yaml
# ─── Required ────────────────────────────────────────────────────────────────
vaults_dir: /var/lib/leyline/vaults
# Absolute path to the directory that holds vault subdirectories.
# The server may also register vaults whose `path` is outside this directory
# (via registry.toml `path:`), but this is the default parent for vault create.

# ─── server: ─────────────────────────────────────────────────────────────────
server:
  host: 127.0.0.1          # default: 0.0.0.0 (all interfaces)
  port: 8090               # default: 8090
  vault_idle_eviction: 30m # default: 30m  min: 1m
  # After the last client disconnects, a vault's in-memory state is kept for
  # this long before being discarded. Shorter values free memory; longer values
  # make the next connection faster. Must be >= 1m.

  access_reload_debounce: 500ms  # default: 500ms  min: 50ms
  # How long the server waits after an access-file change before reloading it.
  # Debounce absorbs rapid saves from editors that write in two passes.
  # Connected clients are re-evaluated immediately after the reload; revoked
  # keys are disconnected within debounce + one round-trip.

  pinned_vaults: []        # default: [] (none pinned)
  # List of vault IDs to hydrate sequentially at startup and never evict.
  # Useful for vaults that must be reachable the instant the server starts.
  # Missing pinned directories log a warning; startup does not fail.
  # Example: pinned_vaults: [ops, main-lab]

# ─── sync: ───────────────────────────────────────────────────────────────────
sync:
  ping_interval: 30        # default: 30  (seconds)
  ping_timeout: 10         # default: 10  (seconds)
  # The server sends a WebSocket ping every ping_interval seconds.
  # A client that does not respond within ping_timeout seconds is disconnected.
  # The client read deadline is 2 × ping_interval. Your reverse proxy's
  # read/idle timeout must be > 2 × ping_interval (i.e. > 60 s with defaults).

  push_rate_limit: 1       # default: 1  (pushes/second/key, sliding window)
  # Per-API-key push budget. The default of 1 push/s is intentionally tight
  # for a small research team — it limits runaway daemons and surfaces an
  # early warning if a key is being abused. Raising to 5–10 is safe for
  # trusted teams but loses that early-warning signal.

  failed_push_rate_limit: 5  # default: 5  (failed pushes/second/connection)
  # Circuit breaker on bad pushes from a single connection. Disconnects the
  # client after this many consecutive pre_hash mismatches per second.

  max_connections_per_key: 7  # default: 7  (0 disables the cap)
  # Maximum simultaneous WebSocket connections sharing one API key.
  # A researcher with Obsidian on three machines and a daemon on one more
  # uses 4 connections under normal operation. The default of 7 leaves room
  # for restarts without tripping the cap. Raising it past ~10 means a stolen
  # key can open many connections before the admin notices.

  allowed_origins: []      # default: [] (reject any browser-present Origin)
  # WebSocket Origin allowlist for browser-initiated upgrades. The Obsidian
  # plugin and leyline-cli omit the Origin header entirely and are always
  # accepted. Only set this if you have a custom browser-based sync client.
  # Example: allowed_origins: ["https://app.example.com"]

  min_plugin_version: "0.1.0"  # default: "0.0.0" (accept any version)
  # Minimum plugin/CLI version allowed to connect. Connections from older
  # versions are rejected with auth_fail reason=plugin_outdated.
  # The default "0.0.0" accepts all versions; set this to enforce a floor.

# ─── git_gc_at: ──────────────────────────────────────────────────────────────
git_gc_at: "05:00"         # default: "05:00"  (UTC HH:MM; "" disables)
# Daily time to run `git gc` across every hydrated vault. Pushes to a vault
# are stalled for the duration of that vault's gc (typically seconds on a
# healthy repo; longer on first run after months of unmanaged growth). With
# 24 h cadence that is one bounded stall per vault per day.
# Set to "" to disable. The server will not catch up a missed window.

# ─── stage: ──────────────────────────────────────────────────────────────────
stage:
  quiet_window: 3s         # default: 3s
  # Seconds of no new ops before a client's buffered edits are committed to
  # git. This is the dominant source of commit latency. Shorter values
  # produce more granular git history at the cost of more commit I/O.

  max_delay: 60s           # default: 60s  (must be >= quiet_window)
  # Hard upper bound on how long edits can sit before a commit is forced,
  # even if the client keeps writing. Bounds the crash-loss window.

  byte_cap: 52428800       # default: 52428800 (50 MiB)
  # Per-client stage payload ceiling. When exceeded, the stage flushes
  # immediately. Prevents one client uploading a large folder from holding
  # the commit slot indefinitely.

  file_cap: 200            # default: 200
  # Per-client stage op-count ceiling. Same intent as byte_cap, op-count axis.

  idempotency_prune: 24h   # default: 24h
  # How long a client's idempotency sequence is remembered after the client
  # goes silent. Pruning too aggressively risks re-applying a replayed push
  # after reconnect.

  wal_dir: ""              # default: "" (auto-resolved)
  # Explicit WAL directory. Empty resolves in priority order:
  #   1. stage.wal_dir (this field)
  #   2. $STATE_DIRECTORY env var (set automatically by systemd)
  #   3. $XDG_STATE_HOME/leyline-server/
  #   4. $HOME/.local/state/leyline-server/
  # Set explicitly if the service account has no home directory.

  compression: true        # default: true
  # Enable WebSocket permessage-deflate compression. Reduces bandwidth for
  # text-heavy vaults. Disable if your reverse proxy decompresses and
  # recompresses (rare).

# ─── vault_limits: ───────────────────────────────────────────────────────────
vault_limits:
  max_files: 0             # default: 0 (disabled)
  # Cap on tracked file count per vault. Pushes that would exceed the cap
  # are rejected with wire error vault_full. 0 disables.
  # Recommended floor for guest-accessible vaults: 100000.

  max_total_bytes: 0       # default: 0 (disabled)
  # Cap on total tracked bytes per vault. Same rejection behavior. 0 disables.
  # Recommended floor for guest-accessible vaults: 21474836480 (20 GiB).

# ─── Admin-surface keys (set by leyline-admin defaults; rarely need changing)
registry: /var/lib/leyline/registry.toml  # packaged default; falls back to <config-dir>/registry.toml
admin_socket: /run/leyline/admin.sock  # default: /run/leyline/admin.sock
trash_dir: /var/lib/leyline/vaults/.trash  # default: <vaults_dir>/.trash
```

## Environment variables

| Variable | Default | Effect |
|---|---|---|
| `LEYLINE_LOG_FORMAT` | `json` | `text` switches slog to human-readable output on stderr. |
| `LEYLINE_LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error`. |
| `LEYLINE_ACCESS_LOG` | (on) | Set `off` to suppress per-request access records. |
| `LEYLINE_METRICS_LISTEN` | (off) | Opt-in Prometheus listener, e.g. `127.0.0.1:9100`. Loopback only. |
| `LEYLINE_PPROF_LISTEN` | (off) | Opt-in pprof listener, e.g. `127.0.0.1:6060`. Loopback only. |

## Hardcoded limits

These values are not configurable:

| Limit | Value |
|---|---|
| Auth failures per IP per minute | 5 |
| Simultaneous connections per IP (hard cap) | 20 |
| WS auth timeout (first frame) | 5 s |
| Read limit per WS frame | 15 MiB |
| `git gc` runs | sequential, one per hydrated vault |

## Registry (`registry.toml`)

The registry maps vault IDs to filesystem paths and server-wide admin flags. It lives at `<config-dir>/registry.toml` by default and is managed exclusively by the server through the admin API (`vault create`, `vault destroy`). Do not hand-edit while the server is running; stop the server first.

For the registry schema, offline recovery procedure, and `server_wide_admins` semantics, see [[leyline-admin-rescue|`leyline-admin` (rescue)]].

## Validation errors at startup

The server exits on the following startup errors (malformed-YAML parse failures include `file:line`; the semantic checks below emit a plain message without location info):
- Missing `vaults_dir`
- `max_delay < quiet_window`
- `vault_idle_eviction < 1m` or `access_reload_debounce < 50ms`
- Malformed `git_gc_at` (must be `HH:MM` UTC or empty)
- Malformed or duplicate entries in `registry.toml`

If the server fails to start, check `journalctl -u leyline-server -n 50` for the full error.
