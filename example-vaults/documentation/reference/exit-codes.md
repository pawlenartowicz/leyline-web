---
title: Exit codes
---

# Exit codes

## `leyline`

| Code | Meaning | Produced by |
|------|---------|-------------|
| `0` | Success. | All commands on clean completion. |
| `1` | General error (config missing, connection failed, command usage error, daemon not found, tag not found, stale socket, etc.). | All commands. |
| `2` | Requires user action before proceeding — ambiguous bare vault ID (`leyline remove`), pending bulk-change/confirm marker or unavailable vault root (`leyline sync`/`pull`), or `init --from-local` without vault.admin. | `leyline remove`, `leyline sync`, `leyline pull`, `leyline init --from-local` |

**Strict-mode codes (scripts and CI):**

| Code | Meaning | Produced by |
|------|---------|-------------|
| `1` | Pending conflicts remain after sync. | `leyline sync --strict`, `leyline conflicts --strict` |

Notes:

- Cobra collapses all errors that are not `ExitError` to exit `1`.
- A stale `.leyline/backend/daemon.sock` (socket file present but no daemon answering) exits `1`.
- `leyline tag -d --commit <sha>` exits `0` with no output when no tags match — this is not an error.
- `leyline revert` exits `1` and prints conflicted paths to stdout when the revert produces conflicts.

---

## `smoketest`

| Code | Meaning |
|------|---------|
| `0` | All subtests passed. |
| `1` | Authentication failure. |
| `2` | Content mismatch. |
| `3` | Protocol error. |

---

## `leyline-admin` and `leyline admin`

| Code | Meaning |
|------|---------|
| `0` | Success. |
| `1` | Error (server unreachable, socket missing, auth failure, vault not found). |
| `2` | Usage error (`leyline-admin` only: missing/unknown verb or subverb, wrong argument count). Note: the laptop `leyline admin` Cobra subcommand collapses these to `1`. |

`leyline-admin status` (and `/_leyline/operator/status` generally) requires no auth and never exits `1` on auth grounds. When the server is down, `vault list` exits `0` with offline output; all other verbs exit `1` with `server not running (no socket at <path>)`.

---

## `leyline-web`

| Code | Meaning |
|------|---------|
| `0` | Clean shutdown (SIGINT / SIGTERM). |
| `1` | Runtime serving error (ListenAndServe failure). |
| `2` | Fatal startup error (config parse failure, server/vault init failure). |

`leyline-web rules --effective` exits `1` if any configured vault fails to load.
