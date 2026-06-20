---
title: Resolving conflicts
---

# Resolving conflicts

When you and a teammate edit the same lines at the same time, Leyline can't merge them automatically. Instead it writes a conflict block directly into the file so you can decide what to keep.

## What conflict blocks look like

The format depends on `diff_mode` in `.leyline/leylinesetup` (default: `leyline`). See [[../reference/leylinesetup|leylinesetup reference]] for how to change it.

### `leyline` mode — Markdown files

Conflicts in `.md` files appear as an Obsidian callout:

```markdown
> [!conflict] alice ⟷ bob · 2026-05-18T14:32:10Z
> **server:**
> ```
> The sample was collected on Tuesday.
> ```
> **yours:**
> ```
> The sample was collected on Wednesday.
> ```
> Edit above, then delete this block.
```

The Obsidian plugin renders this with a red bar. In any other editor you see the raw text above.

### `leyline` mode — code and config files

Files with a known comment syntax (`.py`, `.go`, `.yaml`, `.sh`, etc.) get a comment-block:

```python
threshold = 0.95
# === LEYLINE CONFLICT 2026-05-18T14:32:10Z · alice ⟷ bob ===
# Your version below. Edit above to merge, then remove this block.
#
# threshold = 0.90
# === END LEYLINE CONFLICT ===
```

The server's (winning) version stays live above the block, uncommented. Only your version is commented inside the block. Edit the live line to whatever you want to keep, then delete the entire comment block.

### `git` mode — all text files

```
<<<<<<< server (alice · 2026-05-18T14:32:10Z)
The sample was collected on Tuesday.
=======
The sample was collected on Wednesday.
>>>>>>> local
```

### Binary and unknown files — sidecar

Binary files and any file type that doesn't fit the above get a sidecar:

```
data.bin                   ← your version (unchanged)
data.conflict.20260518T143210Z.bin   ← incoming version
```

Keep one, delete the other, and rename if needed.

## Finding conflicts

```sh
leyline conflicts              # list pending conflicts
leyline conflicts --since 24h  # only show conflicts from the last 24 hours
leyline conflicts --all        # include already-resolved conflicts (audit view)
leyline conflicts --strict     # same as above but exits non-zero when pending entries remain
```

The Obsidian plugin shows a notice when a conflict is written.

## Resolving a conflict

1. Open the file and decide what to keep.
2. Delete the entire conflict block (or keep the sidecar file you want and delete the other).
3. Save the file. The next sync push marks the conflict as resolved.

There is no special "accept mine" or "accept theirs" command — just edit the file until the conflict marker is gone.

## Conflict behaviour by sync mode

| Mode | What happens |
|---|---|
| `autosync` / `sync` | Conflict block written, then pushed to the server. |
| `pull` | Conflict block written; that path is **frozen** — no further incoming updates until you edit the file. |
| `mirror` | Same as `pull` — frozen until you edit. |
| `pull --discard` / `mirror --discard` | Server version silently overwrites local; no block written, no freeze. |
