---
title: Publishing from CI (GitHub Actions)
description: "Publish a whole vault from a Git repo on a tag push — one streaming curl, no leyline binary on the runner. Full workflow, the overwrite contract, and the publish-then-tag caveat."
---

# Publishing from CI (GitHub Actions)

`POST /_leyline/api/v1/{vault}/publish` overwrites a vault's content to match an
uploaded snapshot — **pure `curl`, no `leyline` binary on the runner**. The
external source (your Git repo) is authoritative for that vault: the publish makes
the vault become exactly the tarball, inferring deletes from absence.

This is the right tool for a vault whose content lives in a repo and is built by CI
— a docs site, generated notes, a published handbook. It is **not** for a
collaborative vault: a publish clobbers whatever is on the server, which is why it
is `vault.admin`-gated. Hand human readers `reader` keys (`sync.pull` only) so
their local edits can never collide with a publish.

This page assumes you already have a server and a vault — if not, start at
[[install-and-deploy|Install and deploy]].

## The flow in one curl

Tar the content tree, gzip it, and stream it to `/publish`:

```sh
tar czf - -C "$DOCS_DIR" --exclude=.git --exclude=.leyline . \
 | curl -fsS -X POST \
   "https://$HOST/_leyline/api/v1/$VAULT_ID/publish?tag=$GITHUB_REF_NAME" \
   -H "Authorization: Bearer $LEYLINE_KEY" \
   -H "Content-Type: application/gzip" --data-binary @-
```

That is the whole integration: one process, one key as a secret, zero state.
`$HOST/$VAULT_ID` is the canonical vault address (`<host>/<vaultID>`, no scheme in
the ID). `--data-binary @-` streams stdin, so nothing touches disk on the runner.
The `?tag=$GITHUB_REF_NAME` is optional — drop it to publish without tagging.

A `200` returns JSON: `{"commit":"<sha>","written":3,"deleted":1,"ref":"v1.4.0"}` —
`written` files created or changed, `deleted` files removed because they were absent
from the tarball, `commit` the resulting HEAD sha, and `ref` only when `?tag=`
succeeded.

## A complete workflow (tag push → publish)

```yaml
# .github/workflows/publish.yml
name: Publish to Leyline
on:
  push:
    tags: ["v*"]            # publish whenever a vX.Y.Z tag is pushed

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Build/generate your content into ./site if you have a build step;
      # otherwise point DOCS_DIR at the checked-out content directly.
      - name: Publish vault
        env:
          HOST: notes.example.com
          VAULT_ID: my-notes
          DOCS_DIR: .                       # directory whose tree becomes the vault
          LEYLINE_KEY: ${{ secrets.LEYLINE_KEY }}
        run: |
          tar czf - -C "$DOCS_DIR" --exclude=.git --exclude=.leyline . \
           | curl -fsS -X POST \
             "https://$HOST/_leyline/api/v1/$VAULT_ID/publish?tag=$GITHUB_REF_NAME" \
             -H "Authorization: Bearer $LEYLINE_KEY" \
             -H "Content-Type: application/gzip" --data-binary @-
```

Store the `vault.admin` key as the repository secret `LEYLINE_KEY` (Settings →
Secrets and variables → Actions). Scope it to this one vault and rotate it
periodically.

## The overwrite contract

- **The vault becomes the tarball.** Every file in the tarball is written; every
  file currently on the server but *absent* from the tarball is deleted. There is
  no additive-only mode — overwrite is the point. Last-write-wins; the publish never
  authors merge content.
- **Hidden trees are skipped server-side.** `.leyline/` (the control plane: access
  keys, roles, config), `.git/`, `.obsidian/`, and any dotfile/dot-dir are dropped
  during unpacking — they never enter the diff, so they are never written *or*
  deleted. CI cannot touch auth or lock anyone out. The `--exclude=.git
  --exclude=.leyline` flags above are optional hygiene (smaller upload), not a
  safety requirement.
- **Same gates as a normal sync.** Each path passes path validation and the vault's
  `allowed [sync]` whitelist (extension + size) and per-vault size caps. A bad path
  rejects the whole request with `400` — nothing is committed partially.
- **Empty-tarball guard.** A zero-file tarball is refused with `400` — this catches
  a broken CI checkout that would otherwise wipe the vault. To intentionally empty a
  vault, pass `?allow_empty=true`.
- **Indistinguishable from a normal push.** The publish commits through the same
  path a WebSocket push uses, so reconnecting clients catch up from git and live
  `leyline mirror` readers receive the publish as a real-time broadcast.

## Publish + tag is not atomic

When you pass `?tag=`, the **content commits first**; the tag is a best-effort
follow-up (the tagging path re-acquires the vault lock, so it cannot run inside the
publish). Consequences:

- A tag failure returns the **tag's** status code (e.g. `409` on `tag_exists`) but a
  body that still carries `commit`/`written`/`deleted` plus a `tag_error` field.
  **The publish already landed.** Do not re-run to "retry the tag": re-publishing
  identical content is a no-op commit, but the tag still collides. Delete or move the
  existing tag, or tag the returned `commit` directly with a separate `POST …/tag`.
- `?tag=` additionally requires the key to hold `history.tag` (admin keys do). An
  invalid tag name returns `400`.

Because `curl -fsS` exits non-zero on any 4xx, a tag collision fails the CI step
even though the content published. If your pipeline re-tags releases, delete the old
tag first (`DELETE /_leyline/api/v1/{vault}/tag/{name}`) or use a fresh tag name per
publish.

## What publish does not do

- **No client-side merge.** The server is authoritative; there is no three-way merge
  on a publish.
- **Tags are provenance only.** They mark the published commit in history; the web
  reader ignores tags and always serves current HEAD.
- **It never writes the control plane.** Configuring `.leyline/` from a repo is a
  deliberate future decision, not a default — publish leaves it untouched.
