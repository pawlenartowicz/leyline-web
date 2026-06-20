---
title: Reading on the web
---

# Reading on the web

The web reader is a browser-based, read-only client — it serves vault notes directly from disk, rendering Obsidian-flavored Markdown (callouts, wikilinks, embedded images). No install required.

## Opening the web reader

Your vault admin gives you the URL. It typically looks like:

```
https://research.example.org/lab-notes/
```

Open it in any browser. If the vault requires a login you'll be redirected to a login page.

## Logging in

Enter your [[../how-leyline-works/vaults-and-keys|API key]] (`ley_AbCdEfGhIj0123456789`) on the login page. The session is stored in a cookie that lasts 30 days — you won't be asked again on the same browser.

To log out, use the sign-out button or form in the vault navigation or login page (it submits a POST to `/_logout`). Navigating directly to the URL will not work.

Your read access is determined by your key's role. A key with the `reader` role can browse notes but cannot push changes. See [[../vault-management/keys-and-roles|keys and roles]].

## What's visible

The vault admin controls what's exposed via `webignore`. Files and folders excluded under `[view]` return a 404 — you won't see them in navigation or get them through a direct URL.

Obsidian metadata and control files under `.leyline/` are never served to readers regardless of any settings.

If you can see a file in Obsidian but not in the web reader, ask your vault admin to check [[../vault-management/web-reader-setup|web reader setup]].

## Navigation and deep links

The web reader URL mirrors the vault's folder structure. To link a teammate to a specific note, copy the browser URL — it's stable and shareable.

```
https://research.example.org/lab-notes/methods/sampling-protocol
```

Wikilinks inside notes (`[[other note]]`) are rendered as clickable links within the vault. Cross-vault links (`[[@other-vault/path]]`) render as clickable links when the operator has wired that vault ID into the reader's configuration. Links to vaults the reader's instance doesn't know about render as a non-clickable visual indicator instead.

## What the web reader does not do

- It does not let you edit notes (a future phase).
- It does not show the latest reviewed tag by default — it always shows the current working tree.
- It does not connect to the sync server; it reads files directly from disk.

For questions about the reader's configuration (themes, exposed paths, login settings), see [[../vault-management/web-reader-setup|web reader setup]].
