---
title: SEO and link previews
description: "How the web reader builds page metadata — title and description frontmatter, OpenGraph and Twitter tags, canonical URLs, and the auto sitemap and robots.txt."
---

# SEO and link previews

When a vault is published with the web reader, Leyline builds the metadata search engines and chat apps read: the page `<title>`, a meta description, OpenGraph and Twitter Card tags for rich link previews, a canonical URL, plus a site-wide `sitemap.xml` and `robots.txt`. Most of it is automatic. The one knob worth setting by hand is a per-page `description`.

## The master switch: a public domain

None of this renders until the operator gives the web reader a public hostname. Set `domain` in the `leyline-web` `config.yaml` (see [[../server-management/web-reader-hosting|web reader hosting]]):

```yaml
domain: notes.example.com      # or https://notes.example.com
```

With `domain` set, every page emits canonical and OpenGraph tags, and the reader serves `/sitemap.xml` and `/robots.txt`. With `domain` empty, all of it is suppressed — the routes 404 and the page head carries no SEO tags. This is deliberate: absolute URLs are meaningless until the reader knows its own address.

`domain` is an operator setting, not a vault one. A vault admin who wants previews on a self-hosted reader needs the operator to set it once for the whole instance.

## Per-page description

The meta description is the sentence a search result or a shared link shows under the title. Set it in page frontmatter:

```markdown
---
title: Resolving conflicts
description: "What a conflict looks like on disk, why Leyline never picks a winner, and the three ways to clear one."
---
```

When `description` is absent, the reader falls back to an excerpt: the page body, stripped of Markdown, whitespace-collapsed, and cut to 160 bytes at a word boundary with an ellipsis. The fallback is serviceable but blunt — it takes whatever the page opens with, which for a page that opens mid-thought (or with a raw-HTML hero) reads poorly. Write a description for any page you expect people to find or share.

Keep it to roughly 160 bytes — about what a search result displays, and the same budget the fallback truncates to. (The limit is bytes, not characters: an em-dash or en-dash costs 3 bytes each, so a description heavy with them fits fewer glyphs than you might expect.)

Non-Markdown pages (a served `.py` or `.csv`, an attachment) get no description at all — a code excerpt makes a poor preview, so the tag is simply omitted.

## Title

The `<title>` is `Page title — Vault name`, and the OpenGraph `og:title` is the page title on its own. The page title comes from the `title` frontmatter key, falling back to a humanized filename. The vault name comes from `vault_name` in `web.yaml` (see [[web-reader-setup|web reader setup]]), falling back to "Leyline". Setting `title` on every page is the cheapest SEO win there is.

## What gets emitted

For a content page with `domain` set, the head carries:

- `<link rel="canonical">` — the page's one true URL. Index pages (`index.md`, `README.md`) are served at their directory URL, so the canonical drops the trailing `/index` or `/README` to match.
- `og:url`, `og:type`, `og:title`, `og:description` — the OpenGraph block chat apps and social cards read. `og:type` is `website` for a folder's landing page, `article` for everything else. `og:description` is omitted when there is no description (see above).
- `og:image`, `og:image:alt`, `og:image:width`, `og:image:height`, `twitter:image` — the preview card (see [Preview image](#preview-image) below). Emitted whenever a card resolves, which out of the box is always.
- `twitter:card` — `summary_large_image` when a card image is present (the normal case), `summary` (text-only) when none is.

There is no separate `<meta name="description">` tag; `og:description` is the single description Leyline emits, and modern crawlers and preview bots read it.

## Preview image

The big image on a shared link is `og:image`. Out of the box every page gets the bundled Leyline card, so a fresh deployment looks finished rather than text-only. You can override it per vault or per page, in this order (first match wins):

1. **Per page** — a frontmatter `image:` (with optional `image_alt:`):

   ```markdown
   ---
   title: Resolving conflicts
   image: assets/conflicts-card.png
   image_alt: A three-way merge shown as a conflict callout
   ---
   ```

2. **Per vault** — `og_image` in `web.yaml`, the brand default for every page that doesn't set its own:

   ```yaml
   og_image: assets/brand-card.png
   og_image_alt: "Project X — engineering notes"
   ```

3. **The bundled default** — the theme's `static/og-card.png`. A custom theme replaces it to rebrand, or removes it to opt a white-label site out of preview images entirely.

The value is either an **absolute URL** (`https://…` or `//…`), emitted as-is so you can host the card off the vault, or a **vault-relative path** (like the `assets/…` examples above) resolved the same way an embedded image is. Alt text falls back frontmatter → `web.yaml` → the page title, so it is never empty.

Cards should be **1200×630** (the 1.91:1 ratio every platform expects); that is the size the bundled card ships and the dimensions advertised by default. If you must use a different size, set `og_image_width`/`og_image_height` in `web.yaml`. The reader serves whatever PNG you point it at — it does not generate, resize, or validate the image, so make it 1200×630 yourself.

## Sitemap and robots.txt

Both are generated on demand — you do not author or maintain them.

**`/sitemap.xml`** lists every publicly readable Markdown page across all served vaults, each with a `lastmod` from the file's modification time. Excluded: vaults set to `guest_role: none` (private vaults never appear), pages hidden by `webignore [view]`, and non-Markdown attachments.

**`/robots.txt`** is permissive — it allows the whole site, advertises the sitemap, and disallows only the paths a crawler should never index: the raw-asset and PDF-render routes, and the login/logout pages when login is enabled.

Because the sitemap is built from each vault's `guest_role` and `webignore`, the way to keep a page out of search is the same as the way to hide it from visitors: set the vault private, or list the path under `webignore [view]`. See [[web-reader-setup|web reader setup]] for both.

## Checklist for a published vault

1. Operator sets `domain` in the reader's `config.yaml`.
2. Every page has a `title`.
3. Pages you expect to be found or shared have a hand-written `description` (~160 bytes).
4. Previews carry the bundled card automatically; set `og_image` in `web.yaml` (or `image:` on a key page) to brand it, 1200×630.
5. Pages you do *not* want indexed are private (`guest_role: none`) or in `webignore [view]`.
6. Submit `https://<domain>/sitemap.xml` to search consoles if you want faster discovery.
