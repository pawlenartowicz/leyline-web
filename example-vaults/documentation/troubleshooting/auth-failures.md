---
title: Auth failures
---

# Auth failures

## `auth_fail` — key rejected

**Likely causes:**
- Key doesn't exist in the vault's access file.
- Key has expired (`expires_at` in the past).
- Per-IP auth rate limit hit (5 failures/min from your IP).

**Fix:**
1. Confirm the key in `~/.config/leyline/keys` matches what was issued. Format: `host/vaultID  ley_xxx  [keyname]`.
2. Check for expiry: ask a vault admin to run `leyline admin key list <vault> --json` and inspect the `expires_at` field — the default table has no expires_at column.
3. If rate-limited, wait a minute. The failure is recorded as the `rate_limited` label on the server's auth-failure metric; the client receives an `auth_fail` frame with reason `"rate limited"` (no server log line is emitted).
4. If the key is simply wrong: have an admin issue a new one with `leyline admin key add <vault> --name <n>` and append the new line to `~/.config/leyline/keys`.

**Where to dig next:** [[../vault-management/keys-and-roles|Keys and roles]]

---

## Plugin shows "Authentication failed — plugin_outdated"

**Cause:** The server's `min_plugin_version` is higher than the installed plugin version.

**Fix:** Update the Leyline plugin in Obsidian Settings → Community Plugins. The client receives an `auth_fail` frame with reason `plugin_outdated` and the required `min_version`; no server log line is emitted for this condition.

**CLI equivalent:** The CLI's version-floor enforcement surfaces as a wire-version 1002 close rather than an `auth_fail` frame. See [[connection-issues#Can't connect — "incompatible server, update client"|"incompatible server, update client"]] for the CLI/daemon path.

---

## Key resolves to the wrong vault

**Cause:** Multiple rows in `~/.config/leyline/keys` match the target vault, and `ResolveKey` is picking the wrong one.

**Fix:**
1. Open `~/.config/leyline/keys` and check for duplicate or ambiguous rows.
2. Add a `keyname` in column 3 for the correct key.
3. Set `keyname = "yourname"` in `.leyline/leylinesetup` (CLI) or in the plugin settings (keyname field).

Resolution order: `LEYLINE_KEY` env wins, then `keyname` selector, then last matching row.

---

## `leyline admin` returns 403

**Cause:** The key you're using doesn't have server-wide admin authority.

Server-wide admin authority is derived from any vault where:
- `server_wide_admins = true` in `registry.toml`, and
- your key holds `vault.admin` in that vault's access file.

**Fix:**
1. Check which vault has `server_wide_admins = true`: look in `registry.toml` on the server (or `leyline-admin vault list`).
2. Make sure your key has the `admin` role in that vault.
3. If you need to recover access entirely, use `leyline-admin key bootstrap-admin <vault> --name recovery` on the server box — no auth needed over the socket.

**Where to dig next:** [[../server-management/leyline-admin-rescue|leyline-admin rescue]]

---

**See also:** [[../how-leyline-works/vaults-and-keys|Vaults and keys]] · [[../how-leyline-works/permissions|Permissions]] · [[../vault-management/keys-and-roles|Keys and roles]]
