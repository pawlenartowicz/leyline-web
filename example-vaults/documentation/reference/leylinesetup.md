---
title: leylinesetup TOML
---

# `leylinesetup` TOML

Per-vault client configuration. Location: `<vault-root>/.leyline/leylinesetup`. Written by `leyline init`; edit manually to change defaults. Mode `0600` — treated as a secret (contains keyname). Never synced to the server.

All keys are optional except `vault`.

| Key | Type | Default | Accepted values | Consequence |
|-----|------|---------|-----------------|-------------|
| `vault` | string | — (**required**) | `<host>/<vaultID>` — no protocol prefix | Canonical vault address. Resolved by `NormalizeVaultAddress`; strips `wss://`, `ws://`, `https://`, `http://`, trailing slashes. Error if empty. |
| `keyname` | string | `""` | Any non-empty string | Selects the key row in `~/.config/leyline/keys` when multiple rows match this vault. Omitting or leaving empty uses the last matching row for this vault. Overridden by `LEYLINE_KEY` env. |
| `debounce` | string (duration) | `"5s"` | Go duration string, e.g. `"2s"`, `"500ms"` | Minimum quiet window after the last fsnotify event before a push is triggered (`autosync` mode). |
| `max_debounce` | string (duration) | `"60s"` | Go duration string | Maximum time a pending push can be held back regardless of new events. Prevents starvation in high-write vaults. |
| `diff_mode` | string | `"leyline"` | `"leyline"` \| `"git"` | Conflict marker format. `leyline`: callouts for Markdown, comment-prefix blocks for code, sidecars for binary. `git`: `<<<<<<<`/`=======`/`>>>>>>>` markers everywhere (sidecar for binary). See [[../how-leyline-works/conflicts-and-history\|Conflicts and history]]. |
| `watch_warn_threshold` | integer | `1200` | Any positive integer | Log a warning when the number of watched directories exceeds this value. Soft limit only — does not stop watching. |
| `[daemon]` | section | — | TOML section | Daemon tuning knobs parsed by `LoadVaultConfig`. |
| `[daemon].base_verify_every` | integer | `1` | Any positive integer | Verify the local base hash against the server every N sync cycles. |
| `[daemon].idle_rescan_interval` | string (duration) | `"10m"` | Go duration string | How often the daemon rescans the vault when no fsnotify events arrive. |
| `[daemon].idle_rescan_grace` | string (duration) | `"30s"` | Go duration string | Grace period after the last fsnotify event before an idle rescan is triggered. |
| `[lock]` | reserved | — | opaque TOML section | Reserved for a future feature. The loader accepts and ignores it. |
| `[scratch]` | reserved | — | opaque TOML section | Reserved. Accepted and ignored. |

**Example file written by `leyline init`:**

```toml
vault = "sync.example.com/research"
keyname = "laptop"
diff_mode = "leyline"
```

**Example with all optional keys set:**

```toml
vault = "sync.example.com/research"
keyname = "laptop"
debounce = "2s"
max_debounce = "30s"
diff_mode = "git"
watch_warn_threshold = 800
```

**Key resolution order** (for both the daemon and one-shot commands):

1. `LEYLINE_KEY` environment variable — wins over everything.
2. `keyname` set → exact `(vault, keyname)` match in `~/.config/leyline/keys`.
3. No `keyname` → last row in `~/.config/leyline/keys` whose `vault` column matches.

See also: [[../vault-management/index|Vault management]] for `vaultconfig/` files (server-side, synced). See [[../server-management/server-configuration|Server configuration]] for `server.yaml` knobs.
