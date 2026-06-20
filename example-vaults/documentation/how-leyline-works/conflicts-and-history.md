---
title: Conflicts and history
---

# Conflicts and history

## How conflicts are handled

Leyline syncs on save, not on every keystroke. When two people edit the same file, the second client to sync computes a three-way merge — your changes, their changes, the shared ancestor — before pushing. If the edits touch different lines the merge succeeds silently. If both edits landed on the same lines and cannot be reconciled automatically, Leyline writes a conflict marker into the file.

The merge runs on the client; the server only stores the result.

## Conflict markers

The format of conflict markers depends on the file type and the `diff_mode` setting in `.leyline/leylinesetup`:

- **Markdown files** (default) — an Obsidian `[!conflict]` callout block, readable and renderable inside Obsidian.
- **Code and config files** — a language-appropriate comment block wrapping the conflicting sections.
- **Binary or unknown files** — a sidecar file placed next to the original, containing the alternative version.
- **`diff_mode = git`** — traditional `<<<<<<<` / `=======` / `>>>>>>>` markers, compatible with standard diff tools.

Unresolved conflicts are logged to `.leyline/backend/conflicts.log`; `leyline conflicts` lists them. See [[../collaboration/resolving-conflicts|resolving conflicts]] for the step-by-step process.

## Git tags as publication points

Edits land directly on files. There is no draft queue. Git tags mark vetted states:


- **Review tags** — created automatically with `leyline review` or the Obsidian "Mark reviewed" command. Named `reviewed-YYYY-MM-DDTHH-MM-SSZ`. Used to track when the vault was last checked; the Obsidian plugin also surfaces this as an "unreviewed edits" badge.
- **Named tags** — created with `leyline tag <name>`. Use these for stable reference points: a submitted draft, a release, a snapshot before a major restructure.

Both require the `history.tag` capability. Creating a tag does not modify any files — it marks the current commit as significant.

## Reverting and restoring

Anyone with `history.revert` can undo changes without admin involvement:

- **Revert** — undoes one specific commit while preserving everything after it. Good for a single bad push.
- **Restore** — rolls the entire vault forward to match what it looked like at a given commit. Good for recovering from widespread damage.

Both operations produce a new commit in the git history (the vault is never silently modified). All connected clients pick up the changes immediately via the normal sync broadcast.

For the commands and options, see [[../vault-management/publishing-with-tags|publishing with tags]] and [[../collaboration/seeing-history|viewing history]].

---

**Do this with:** [[../collaboration/resolving-conflicts|Resolving conflicts]] (clear conflict markers) · [[../vault-management/publishing-with-tags|Publishing with tags]] (create tags, revert, restore) · [[../collaboration/seeing-history|Seeing history]] (browse commits and diffs)
