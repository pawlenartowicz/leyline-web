---
title: Conflicts not resolving
---

# Conflicts not resolving

## Conflict marker written but `leyline conflicts` still shows it as pending

**Cause:** Leyline decides a conflict is resolved by checking whether any conflict-block marker still remains in the file. If you edited the content but left part of the marker — the callout header, a `=======` line, the sidecar filename — it still counts as unresolved.

**Fix:**
1. Open the conflicted file. Look for:
   - `> [!conflict]` callout block (leyline mode, Markdown)
   - comment-prefix block (leyline mode, code/config files)
   - `<<<<<<<` / `=======` / `>>>>>>>` markers (git mode)
   - A sidecar file named `<name>.conflict.<ts>.<ext>` (binary or unknown extension)
2. Delete **the entire block** (or the sidecar file), not just the conflicting lines.
3. Save. The daemon will push the resolved version and clear the conflict log entry.

---

## Conflict keeps reappearing after resolution

**Likely causes:**
- Another client is still writing the same value that originally conflicted (race between two daemons).
- The file is being modified externally (another app, script, or backup tool) in a way that re-introduces the conflict pattern.

**Fix:**
1. `leyline conflicts --all` — lists pending and resolved entries with path, kind, and origin. Then open the file at the listed path manually and check whether the conflict block content is the same each time or different. Same content = a loop; different content = new conflicting edits.
2. For a loop: stop the daemon on both machines, decide which copy wins, overwrite the other, restart.
3. For ongoing conflicts: resolve once, then coordinate with your collaborators.

---

## `diff_mode` set wrong — getting unexpected marker format

**Cause:** `.leyline/leylinesetup` has `diff_mode = "git"` but you expected callouts (or vice versa). The format is set per client — collaborators on different settings produce different markers.

**Fix:**
1. Open `.leyline/leylinesetup`.
2. Set `diff_mode = "leyline"` for Obsidian callout format, `diff_mode = "git"` for `<<<<<<<` markers.
3. The change takes effect on the next conflict. Existing conflict blocks are not retroactively reformatted.

Marker formats:

| `diff_mode` | Markdown | Text with comment syntax | Other / binary |
|---|---|---|---|
| `leyline` | `[!conflict]` callout | comment-prefix block | sidecar file |
| `git` | `<<<<<<<` markers | `<<<<<<<` markers | sidecar file |

**Where to dig next:** [[../how-leyline-works/conflicts-and-history|Conflicts and history]], [[../reference/leylinesetup|leylinesetup reference]]

---

## Path frozen in `mirror` mode — file won't update

**Cause:** `mirror` (and `pull`) freeze a path after writing a conflict marker, until the user edits the file. This is intentional — `mirror` never discards local changes.

**Fix:**
1. Resolve the conflict in the file (delete the marker block, keep the content you want).
2. Save. Saving triggers an fsnotify event; after the debounce window (default 5s) the daemon picks up the edit and the freeze on that path lifts.
3. To accept the server version without editing: `leyline pull --discard` — note this is vault-wide: it drops **all** locally staged edits and replaces them with server HEAD. There is no per-path discard option.

**Where to dig next:** [[../collaboration/resolving-conflicts|Resolving conflicts]]

---

**See also:** [[../how-leyline-works/conflicts-and-history|Conflicts and history]] · [[../reference/leylinesetup|leylinesetup reference]]
