---
title: Permissions
---

# Permissions

## Push rejected with `permission_denied`

**Cause:** Your key's role doesn't include `sync.push`. The `reader` built-in role is pull-only.

**Fix:**
1. Check your role: `leyline status` shows the current role in the connected state.
2. Ask a vault admin to update your role. There is no single-step role-change command — the admin must either:
   - Call `PUT /_leyline/admin/{vault}/keys/{name}/role` with body `{"role":"editor"}` (or `"admin"`), or
   - Remove and re-add the key: `leyline admin key remove <vault> <keyname>` then `leyline admin key add <vault> --name <keyname> --role editor`.

**Where to dig next:** [[../vault-management/keys-and-roles|Keys and roles]], [[../how-leyline-works/permissions|Permissions]]

---

## `history.tag` / `history.revert` rejected

**Cause:** Your role is `reader` or `editor`. `history.tag` requires `admin`. `history.revert` requires `editor` or `admin`.

**Fix:** Ask an admin to promote your role, or have them run the tag/revert operation on your behalf.

---

## Keys.manage operation rejected

**Cause:** You need the `keys.manage` capability, which is only in the built-in `admin` role (or a custom role that includes it).

**Fix:** This operation must be done by a vault admin or a server-wide admin.

---

## Role shows as unknown / `role_unresolved`

**Cause:** Your key has a custom role that has been removed from `.leyline/vaultconfig/roles`, or the roles file is malformed.

**Symptom:** Server sends `role_unresolved` close reason; client disconnects.

**Fix:**
1. An admin checks `.leyline/vaultconfig/roles` — ensure the role is present and syntactically valid.
2. If the role was deleted: reassign the key to a known role. Call `PUT /_leyline/admin/{vault}/keys/{name}/role` with body `{"role":"editor"}`, or remove and re-add the key: `leyline admin key remove <vault> <keyname>` then `leyline admin key add <vault> --name <keyname> --role editor`.
3. If the roles file is corrupt: fix or recreate `.leyline/vaultconfig/roles` — invalid rows are skipped with a warning and never block parsing, so partial corruption silently drops only the affected roles.

**Where to dig next:** [[../vault-management/keys-and-roles|Keys and roles]]

---

## File type blocked — `type_not_allowed`

**Cause:** The file's extension or size is blocked by `.leyline/vaultconfig/allowed [sync]`.

**Fix:**
1. Ask a vault admin to check `allowed [sync]` in `.leyline/vaultconfig/allowed`.
2. To allow an extension, add it to the `[sync]` section.
3. To allow larger files, raise the size limit in `[limits]`.

**Where to dig next:** [[../vault-management/what-syncs|What syncs]]

---

**See also:** [[../how-leyline-works/permissions|Permissions]] · [[../vault-management/keys-and-roles|Keys and roles]] · [[../vault-management/what-syncs|What syncs]]
