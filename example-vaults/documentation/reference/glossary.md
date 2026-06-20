---
title: Glossary
---

# Glossary

Alphabetical. Each entry is 1–2 sentences. Links point to canonical concept pages.

---

**access file** — The `.leyline/vaultconfig/access` file listing API keys, their SHA256-prefix hashes, roles, and optional metadata (email, keyname). Synced to the server; admin-only. See [[../vault-management/index|Vault management]].

**allowed file** — `.leyline/vaultconfig/allowed`: an INI file with `[sync]`, `[history]`, and `[limits]` sections that whitelist file extensions, sizes, and git-tracking rules. Server-enforced; clients cannot bypass it.

**API key** — A credential of the form `ley_<20 alphanumeric chars>`. Stored in cleartext in `~/.config/leyline/keys` (mode 0600); stored as a 24-hex-char SHA256 prefix in the `access` file on the server.

**autosync** — The bidirectional sync daemon mode: watches the local vault with fsnotify, debounces writes, pushes to the server, and applies incoming broadcasts. Contrast with [[#mirror|mirror]].

**base** — The last server-acknowledged sync position, stored in `.leyline/backend/base.json`. Carries the hash of the last accepted commit (plus sync bookkeeping: last_sync, next_seq, next_batch_id). The manifest digest is computed separately at reconnect time, not stored here. Sent to the server on reconnect so it can determine how much the client has missed. See [[../how-leyline-works/index|How Leyline works]].

**bootstrap** — A full-vault catchup response from the server when the client's base is unknown or missing (`base_lost`). The server streams all current-state `write` ops. Contrast with [[#catchup|catchup]].

**broadcast** — A `MsgBroadcast` frame the server sends to all other connected clients after a push batch is committed. Contains the ops from that commit, scoped to each client's `[sync]` filter. See [[../how-leyline-works/plain-files-and-git|Plain files and Git]].

**callout** — The Obsidian callout block syntax `> [!type]`. Leyline uses `> [!conflict]` callouts as the conflict marker format for Markdown files in the default `leyline` mode. See [[#diff_mode|diff_mode]].

**capability** — A named permission string (e.g. `sync.pull`, `sync.push`, `history.tag`, `vault.admin`). Roles resolve to sets of capabilities; the server checks capabilities directly, never role names. See [[../how-leyline-works/permissions|permissions]].

**catchup** — A partial sync response from the server delivering only the commits the client has missed since its `base`. Contrast with [[#bootstrap|bootstrap]].

**client ID** — A UUID generated at `leyline init`, persisted to `.leyline/backend/client_id`, included in every `Hello` frame. Identifies a specific vault installation. Regenerated only by `leyline init --reset`.

**conflict marker** — The on-disk annotation written when a three-way merge produces an overlap. Format depends on `diff_mode` and file type: `[!conflict]` callout (Markdown, `leyline` mode), comment-prefix block (text with known comment syntax, `leyline` mode), `<<<<<<<`/`=======`/`>>>>>>>` markers (`git` mode), or a sidecar file (binary or unknown). See [[#sidecar|sidecar]].

**diff_mode** — The `leylinesetup` TOML key controlling conflict marker format. `leyline` (default) uses Obsidian-native formats; `git` uses traditional merge markers everywhere. See [[leylinesetup|`leylinesetup` TOML]].

**keystore** — The file `~/.config/leyline/keys` (mode 0600). Whitespace-columnar format: `<host>/<vaultID>  <key>  [keyname]`. One row per vault binding. Used by the sync daemon and `leyline admin` to resolve API keys.

**manifest digest** — A hash over the local manifest (`.leyline/backend/manifest.jsonl`, the path-to-content-hash map). Sent in `Hello` alongside `base` so the server can detect and correct manifest drift without comparing individual file hashes.

**mirror** — The pull-only daemon mode. Holds local staged edits rather than pushing them; applies incoming server ops. A per-path freeze prevents overwriting locally-edited files until the user resolves. Contrast with [[#autosync|autosync]].

**op** — A single file operation (`write`, `delete`, `rename`) sent between client and server during sync. Each write op includes a hash of the file content the client last saw; the server uses it to detect stale pushes.

**push** — A batch of file ops sent from client to server, carrying a `base` hash. The server applies the ops, commits to git, then acknowledges with `ok` or `stale_base`. Only `sync` and `autosync` modes push.

**reviewed state** — A vault snapshot marked by a `reviewed-YYYY-MM-DDTHH-MM-SSZ` git tag, created by `leyline review`. Indicates a vetted state of the vault. Clients can surface this — the Obsidian plugin, for example, shows an unreviewed-edits badge when new commits exist since the latest such tag.

**role** — A named capability bundle assigned to an API key. Built-in roles: `admin` (all capabilities), `editor` (sync + revert), `reader` (sync.pull only). Custom roles defined in `.leyline/vaultconfig/roles`. See [[../how-leyline-works/permissions|permissions]].

**server-wide admin** — A key in a vault marked `server_wide_admins = true` in `registry.toml` that holds `vault.admin`. Such a key is accepted on `/_leyline/admin/{vault}/*` for any vault and on all `/_leyline/operator/*` routes. There is no separate operator-credentials store. See [[../server-management/index|Server management]].

**sidecar** — A conflict output file named `<original-name>.conflict.<timestamp>.<ext>` written alongside the original when a binary file or file of unknown type cannot be merged inline. Resolving a sidecar conflict means deleting the sidecar after incorporating it.

**staged log** — `.leyline/backend/staged.jsonl`: the client-local queue of ops generated by fsnotify that have not yet been pushed. Survives daemon restarts. Drained by the push phase of each sync session.

**sync mode** — One of four operating modes for the `leyline` CLI: `sync` (one-shot push+pull), `pull` (one-shot pull-only), `autosync` (daemon, push+pull), `mirror` (daemon, pull-only). All four share the catchup-apply phase and three-way merge engine.

**three-way merge** — The conflict resolution algorithm run client-side during catchup. Compares three versions of a file: the common base, the server's version, and the local version. Auto-merges non-overlapping edits; writes a conflict marker when the same lines were changed by both sides.

**vault** — A directory synchronized by Leyline, identified by a `<host>/<vaultID>` address. Contains the synchronized content files plus a `.leyline/` control directory.

**vault address** — The canonical form `<host>/<vaultID>` — always without a protocol prefix (`wss://`, `https://`, etc.). Used in `leylinesetup`, the keystore, CLI arguments, and log output everywhere. See [[../how-leyline-works/index|How Leyline works]].

**vault ID** — The path segment identifying a vault on a server, e.g. `research` in `sync.example.com/research`. Validated by `pathutil.ValidateVaultID`.

**WAL** — Write-ahead log on the server (`internal/stage/`). Ensures in-flight push batches survive a server crash between receive and commit. Replayed during vault hydration.

**webignore** — `.leyline/vaultconfig/webignore`: a multi-section gitignore file (`[view]`, `[history-ignore]`, `[edit-ignore]`) controlling what the web reader exposes. Independent of the sync `[allowed]` file. See [[../vault-management/index|Vault management]].
