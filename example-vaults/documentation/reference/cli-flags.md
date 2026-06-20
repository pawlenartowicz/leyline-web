---
title: CLI flags and env vars
---

# CLI flags and env vars

The common subcommands for `leyline` and `leyline-admin`. For conceptual context see [[../how-leyline-works/index|How Leyline works]]; for the HTTP routes served by `leyline-server` see [[../server-management/server-configuration|Server configuration]].

---

## `leyline`

Cobra dispatcher. Vault root is discovered by walking up from cwd to `.leyline/leylinesetup` (git-style). Global commands (`list`, `remove`, `admin`) run from anywhere.

**Global env vars (all `leyline` subcommands):**

| Env var | Default | Effect |
|---------|---------|--------|
| `LEYLINE_KEY` | — | Direct literal API key. Bypasses `~/.config/leyline/keys` entirely. |

---

### `leyline init`

Initialize a leyline vault in the current directory. Prompts for vault address and API key, tests the connection, then writes `.leyline/leylinesetup` and appends to `~/.config/leyline/keys`.

| Flag | Default | Description |
|------|---------|-------------|
| `--reset` | `false` | Wipe `.leyline/backend/` before re-initializing. Regenerates `client_id`. |
| `--merge` | default | Bootstrap mode: three-way merge incoming server state with local files (default when no mode flag given). |
| `--from-server` | — | Bootstrap mode: accept server state as canonical; move local files to `.leyline/trash/` for a clean checkout. |
| `--from-local` | — | Bootstrap mode: push local content to the server as the authoritative state. Requires `vault.admin`. |

---

### `leyline autosync`

Start the sync daemon in bidirectional mode (watch + push + pull). Detaches to background by default; log output goes to `.leyline/backend/daemon.log`.

| Flag | Default | Description |
|------|---------|-------------|
| `-d`, `--debug` | `false` | Run in foreground; stream log and event output to terminal. |

---

### `leyline mirror`

Start the sync daemon in pull-only mode. Detaches to background by default.

| Flag | Default | Description |
|------|---------|-------------|
| `-d`, `--debug` | `false` | Run in foreground; stream log and event output to terminal. |
| `--discard` | `false` | Drop locally staged edits and apply server state directly on each catchup. Use to recover a mirror that has drifted. |

---

### `leyline sync [paths...]`

One-shot bidirectional sync. Delegates to the running daemon over IPC if `.leyline/backend/daemon.sock` answers; otherwise runs a one-shot WebSocket session.

| Flag | Default | Description |
|------|---------|-------------|
| `-d`, `--debug` | `false` | Print every sync step (IPC vs one-shot, dial target, op counts) to terminal. |
| `--strict` | `false` | Exit non-zero if any pending conflicts remain after the sync completes. |

---

### `leyline pull`

One-shot server-to-client pull. No push. Delegates to the running daemon if available; falls back to one-shot WebSocket.

| Flag | Default | Description |
|------|---------|-------------|
| `-d`, `--debug` | `false` | Print every pull step to terminal. |
| `--discard` | `false` | Drop locally staged edits and let server state replace them. |

---

### `leyline status`

Print the running daemon's status: role, dirty file count, last sync time. Reads from the IPC socket.

No flags.

---

### `leyline stop`

Send a stop signal to the running daemon over IPC.

No flags.

---

### `leyline conflicts`

List conflict events from `.leyline/backend/conflicts.log`.

| Flag | Default | Description |
|------|---------|-------------|
| `--all` | `false` | Include resolved entries (audit view). |
| `--since DURATION` | — | Filter to entries newer than duration, e.g. `24h`, `90m`. (Day/week suffixes like `7d` are accepted by `history --since` only; `time.ParseDuration` is used here and rejects `d`/`w`.) |
| `--strict` | `false` | Exit non-zero if any pending conflicts remain. |

---

### `leyline list`

List every initialized vault on this machine. Probes each vault in parallel: reads `leylinesetup`, checks key file, reads `state.json`, pings the daemon socket.

| Flag | Default | Description |
|------|---------|-------------|
| `--json` | `false` | Emit one JSON row per registered vault. `error` rows include `error_reason`. |
| `--prune` | `false` | Rewrite the registry to drop `missing` rows. `off` rows with intact `leylinesetup` are kept. |

**Status values in output:** `online` / `offline` / `off` / `missing` / `error`.

---

### `leyline remove <vault>`

Stop the daemon (if running) and unregister a vault from this machine. Leaves `.leyline/` on disk and `~/.config/leyline/keys` untouched. `<vault>` may be an absolute path, `host/vaultID`, or a bare `vaultID` (ambiguous bare ID → exit 2).

| Flag | Default | Description |
|------|---------|-------------|
| `--force` | `false` | Skip the courtesy `/stop` request; signal the daemon directly (SIGTERM → SIGKILL). |
| `--json` | `false` | Emit JSON result: `{"id","path","stopped","removed"}`. |

---

### `leyline history [n]`

Print recent commits. Requires the daemon to be running (proxied through IPC to the server). Default `n` = 20; `--all` raises to server cap (200).

| Flag | Default | Description |
|------|---------|-------------|
| `--all` | `false` | Fetch full history (up to server cap of 200). |
| `--out FILE` | — | Write output to FILE instead of stdout. |
| `--with-diff` | `false` | Include unified diffs per commit. |
| `--since DURATION` | — | Filter by recency: `30m`, `2h`, `7d`, `2w`. |

---

### `leyline tag [name] [commit]`

Create or delete a git tag on vault history. Requires daemon. Default target commit is HEAD.

| Flag | Default | Description |
|------|---------|-------------|
| `-d`, `--delete` | `false` | Delete the named tag instead of creating. Non-zero exit if missing. |
| `--commit SHA` | — | (with `-d`) Delete every tag at this commit. Accepts any git-resolvable prefix. Zero lines + exit 0 on no match. |

---

### `leyline review [commit]`

Create an auto-named `reviewed-YYYY-MM-DDTHH-MM-SSZ` tag. Requires daemon. Server bumps the timestamp by 1 s on collision (up to 5 retries).

No flags beyond the optional positional `[commit]` (default HEAD).

---

### `leyline revert <commit>`

Revert a commit via a new commit. Conflict paths printed to stdout; exits non-zero on conflict. Requires daemon.

No flags.

---

### `leyline restore <commit>`

Roll the vault tree forward to the state at `<commit>` (`read-tree --reset` + fresh commit). Cannot conflict. Requires daemon.

No flags.

---

### `leyline admin`

HTTPS operator surface for laptop use. Talks to the server via `/_leyline/operator/*` and `/_leyline/admin/{vault}/*`. For server-box use, see `leyline-admin` below — identical verbs, bare `<id>` instead of `<host>/<vaultID>`.

**Persistent flags:**

| Flag | Env | Default | Description |
|------|-----|---------|-------------|
| `--key STRING` | `LEYLINE_KEY` | — | Direct literal key; bypasses keystore. Requires `--server`. |
| `--server URL` | — | — | Server base URL. Required when `--key` is used. |
| `--keyname NAME` | — | — | Keystore selector when multiple rows match the target. |
| `--key-file PATH` | — | `~/.config/leyline/keys` | Keystore file location override. |
| `--json` | — | `false` | Machine-readable output. |
| `--insecure` | — | `false` | Skip TLS certificate verification. Development only. |

**Vault verbs:**

| Command | Description |
|---------|-------------|
| `vault create <id> [--path PATH] [--server-wide-admin] [--admin-email EMAIL] [--admin-key-name NAME]` | Register a new vault, init its directory, mint the first admin key (printed once). |
| `vault list [--json]` | List registered vaults: id, path, server_wide_admins, hydrated, last-activity. |
| `vault destroy <host>/<vaultID>` | Disconnect clients, remove registry entry, move vault directory to trash. |
| `vault reset <host>/<vaultID>` | Disconnect clients, wipe content (keeps `.leyline/`), preserve registry entry. |
| `vault reload <host>/<vaultID>` | Evict vault from in-memory cache; next client hit rehydrates. |

**Key verbs:**

| Command | Description |
|---------|-------------|
| `key list <host>/<vaultID> [--json]` | List keys: keyname, role, email, created. |
| `key add <host>/<vaultID> --name N [--role R] [--email E]` | Mint a new key; printed once. Role must exist in vault roles file or be a built-in. |
| `key remove <host>/<vaultID> <keyname>` | Remove a key entry. |
| `key bootstrap-admin <host>/<vaultID> --name N [--email E]` | Force-add an admin key. Server-wide admin only. Recovery path when existing admins are unreachable. |

**Server verbs:**

| Command | Description |
|---------|-------------|
| `status [--json]` | Server stats: uptime, hydrated vaults, active connections, build version. No auth required. |
| `reload-config` | Re-read `server.yaml`. Does not re-read `registry.toml`. Server-wide admin only. |

---

## `leyline-admin`

Standalone operator binary built from `leyline-server`. For use directly on the server box. Speaks to a running `leyline-server` via a UNIX socket; socket file permissions (`0600`) are the auth boundary — no Bearer key needed.

Same verbs as `leyline admin`, but positional arguments use bare `<id>` instead of `<host>/<vaultID>`.

**Persistent flags:**

| Flag | Env | Default | Description |
|------|-----|---------|-------------|
| `--socket PATH` | `LEYLINE_ADMIN_SOCKET` | `/run/leyline/admin.sock` | UNIX socket path. |
| `--registry PATH` | `LEYLINE_REGISTRY` | `/etc/leyline/registry.toml` | Registry file; used by offline `vault list`. |
| `--json` | — | `false` | Machine-readable output. |

**Verbs (identical to `leyline admin`):**

| Command | Description |
|---------|-------------|
| `vault create <id> [--path PATH] [--server-wide-admin] [--admin-email EMAIL] [--admin-key-name NAME]` | Same as laptop variant. |
| `vault list [--json]` | Same as laptop variant; works offline (reads `registry.toml` directly when server is down). |
| `vault destroy <id>` | Same as laptop variant. |
| `vault reset <id>` | Same as laptop variant. |
| `vault reload <id>` | Same as laptop variant. |
| `key list <vault-id> [--json]` | Same as laptop variant. |
| `key add <vault-id> --name N [--role R] [--email E]` | Same as laptop variant. |
| `key remove <vault-id> <keyname>` | Same as laptop variant. |
| `key bootstrap-admin <vault-id> --name N [--email E]` | No server-wide admin check — socket access implies the authority. |
| `status [--json]` | Same as laptop variant. |
| `reload-config` | Same as laptop variant. |
| `update` | Check both components against the latest GitHub release; print the install line. |

**Offline behavior:**

- `vault list` reads `registry.toml` from disk. Human output is prefixed `[offline]`; `--json` adds `"offline": true`.
- `status` and all mutating verbs exit non-zero: `server not running (no socket at <path>)`.

---

## `leyline-server`

Single long-running daemon. No subcommands.

```
leyline-server [--config config.yaml]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--config` | `config.yaml` | Path to server config YAML. See [[../server-management/server-configuration\|Server configuration]]. |

**Env vars:**

| Var | Default | Effect |
|-----|---------|--------|
| `LEYLINE_LOG_FORMAT` | `json` | `text` switches slog to text handler on stderr. |
| `LEYLINE_LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error`. |
| `LEYLINE_METRICS_LISTEN` | (off) | Opt-in Prometheus listener, e.g. `127.0.0.1:9100`. Loopback-only. |
| `LEYLINE_PPROF_LISTEN` | (off) | Opt-in pprof listener, e.g. `127.0.0.1:6060`. Loopback-only. |

---

## `leyline-web`

Long-running HTTP server that reads the vault filesystem directly.

```
leyline-web [--config config/config.yaml] [--themes DIR]
leyline-web rules --effective [--config PATH]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--config` | `config/config.yaml` | Web config path (vault paths, site title, theme, exposure rules). |
| `--themes` | `<config-dir>/themes` | Themes directory (CSS + templates). |

**Signals:** `SIGHUP` reloads config in place (parse failure keeps previous config serving). `SIGINT`/`SIGTERM` shuts down.

**Subcommand `rules --effective`:** print the effective webignore rule set per section (`view`, `history-ignore`, `edit-ignore`) for every configured vault. Non-zero exit if any vault fails to load.
