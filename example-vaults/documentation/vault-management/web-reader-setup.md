---
title: Web reader setup
---

# Web reader setup

The web reader (`leyline-web`) presents your vault as a website. You configure how it behaves per-vault through three files inside `.leyline/vaultconfig/`: `web.yaml`, `webignore`, and the `theme/` directory.

These files differ from the server's `config.yaml` and the `leyline-web` binary's own `config.yaml` — those are operator concerns documented in [[../server-management/web-reader-hosting|web reader hosting]].

## Choosing a theme

A theme decides the overall layout. Set `parent_theme` in `web.yaml` to one of the two bundled themes:

- **`notes`** — the default. A reading layout with an auto-generated file-tree in the left sidebar. Use it for a knowledge base, a wiki, or any multi-page vault. The edit-mode switch is wired in but off by default.
- **`static_page`** — a chrome-light landing page: header navigation only, no sidebars, a full-width hero authored as raw HTML in `index.md`. Use it for a personal site or a vault front door.

### Documentation sites — `notes` in "docs mode"

There is no separate "documentation" theme. A docs site is the `notes` theme with two features switched on in the vault's own `web.yaml`: a release-style **version switcher** and a right-rail **table of contents**.

```yaml
parent_theme: notes
versions:
  switcher: true            # release-style version dropdown (needs git tags)
  default: latest_tag       # open on the newest tagged version
  show_head: true           # also expose the live HEAD
  mode: only_versioned      # list only tagged versions
right_sidebar: [table_of_content]   # this page's h2/h3 in the right rail
```

`versions:` is replaced wholesale, not deep-merged — spell out all four keys, because any key you omit reverts to its zero value rather than inheriting from the theme's defaults. The left file-tree comes from `notes`.

### Making your own theme

The themes live in the web reader's `config/themes/` directory (an operator path alongside `config.yaml`, not inside your vault). For a look beyond the two bundled themes, create a **child theme** rather than editing `leyline_base`, `notes`, or `static_page` in place — that keeps upstream updates clean:

1. Add `config/themes/<your-theme>/web.yaml` with a parent and any overrides:

   ```yaml
   parent_theme: notes       # inherit everything, then override
   custom:
     accent: "#5a7"          # reaches templates as .Custom.accent
   ```
2. Override only the files you need under `config/themes/<your-theme>/theme/` — e.g. `theme/static/theme.css` to retune CSS variables, or a single template under `theme/templates/`. Anything you don't supply resolves up the parent chain. The full CSS-variable list is in `config/themes/leyline_base/theme/static/theme.css`.
3. Point a vault at it with `parent_theme: <your-theme>`, or make it the default for every vault via `default_theme` in the operator `config.yaml` (see [[../server-management/web-reader-hosting|web reader hosting]]).

For a one-vault tweak that doesn't need a whole theme — a few colours, a font, some CSS — skip this and use the `vaultconfig/theme/` overlay described below.

## `vaultconfig/web.yaml`

`web.yaml` controls the vault's presentation layer. All fields are optional; absent fields inherit from the active theme chain.

```yaml
# .leyline/vaultconfig/web.yaml

# Vault identity (used by cross-vault wikilinks and the web reader header).
vault_id: my-research
vault_name: "My Research Vault"
vault_tagline: "A collaborative note-taking space"
vault_home: index.md          # entry page; defaults to index.md then README.md

# Theme selection. Must match a theme name in the themes directory.
# Bundled: `notes` (reading/sidebar, the default) or `static_page` (landing).
parent_theme: notes

# Guest access: what unauthenticated visitors can do.
# "view" (default) — read-only access to all non-ignored pages.
# "none" — no access; all paths return 404 for unauthenticated visitors.
# "edit" — read and edit access (Phase 2c, requires editor-capable session).
guest_role: view

# Inline PDF viewer: "server" (default, requires poppler) or "browser".
# "browser" uses the visitor's native PDF viewer via an <iframe>.
pdf_renderer: server

# Right sidebar: "references" renders footnotes as sidenotes in the right
# gutter; alternatives are a widget list (e.g. [table_of_content]), "body"
# (article absorbs the column), or "none".
right_sidebar: references

# Sidebar navigation style: "auto" (default), "compact", or "long".
menu: auto

header:
  navigation: nav.nav         # .nav file under .leyline/vaultconfig/
  logo: assets/logo.svg       # vault-relative path
  brand_link: /               # href for the logo/brand; defaults to "/"
  site_title: "My Research"   # visible brand text; falls back to vault_name

footer:
  navigation: footer-nav.nav
  license: "CC BY 4.0"
  copyright: "2026 The Research Team"
  built_with: true             # show "Built with Leyline" line

auth:
  login_button: header         # "header" | "footer" | "none" (default)
  redirect_to_login: false     # redirect unauthenticated visitors to login page

# Free-form theme author space: keys here override the theme's custom block.
# Values reach templates as .Custom.<key>.
custom:
  accent: "#5a7"
  font_body: Inter
```

### Key fields

**`vault_id`** — used for cross-vault `[[@vault_id/path]]` wikilinks. If unset, the vault is excluded from the cross-vault link map. Must be unique across vaults served by the same `leyline-web` instance.

**`guest_role`** — the most common knob. Set to `none` to require login for all pages. Set to `view` (default) for public read access.

**`auth.redirect_to_login`** — when `true`, unauthenticated visitors who hit a protected page are redirected to the login form instead of receiving a 404. Requires `login_path` to be set in the operator's `config.yaml` (see [[../server-management/web-reader-hosting|web reader hosting]]); the web reader refuses to start if `redirect_to_login: true` while `login_path` is empty.

**`parent_theme`** — override the default theme. The value must match a directory name under the themes root. Theme inheritance is a chain: the vault's `web.yaml` overrides the active theme, which may declare its own `parent_theme`.

**`custom`** — open-ended key/value space for theme templates. Values reach templates as `.Custom.<key>`. A vault setting a `custom` key overrides the theme's value for that key; unset keys inherit. Nested maps are replaced wholesale, not deep-merged. Vault admins are trusted; note that CSS string values are not escaped against injection if a theme renders them directly into `<style>` blocks.

## `vaultconfig/webignore`

`webignore` hides paths from web exposure using gitignore syntax. It has three named sections.

```
# .leyline/vaultconfig/webignore

[view]
# Paths hidden from the web reader entirely (404 for everyone).
drafts/
*.private.md
internal/

[history-ignore]
# Paths served from the live filesystem regardless of version selection.
# .leyline/ is always here (system-enforced, cannot be removed).
assets/

[edit-ignore]
# Paths where the edit-mode switch is suppressed even for editors.
# .leyline/ is always here (system-enforced, cannot be removed).
assets/
generated/
```

**`[view]`** — paths that return 404 for all visitors, authenticated or not. Pre-section lines (no section header) are treated as `[view]` entries for compatibility.

**`[history-ignore]`** — paths that always serve from the live working tree, ignoring any version selector. `.leyline/` is always present here (system-enforced); you cannot remove it. Use this section for assets that change frequently and should not be pinned to a tagged state.

**`[edit-ignore]`** — paths where the edit-mode switcher is suppressed even for editors. `.leyline/` is always present here. Use this for generated files, assets, or config that should not be edited through the web reader.

Absent `webignore` file means nothing is hidden (except `.leyline/` in the history and edit sections, which are always enforced).

To inspect the effective rules after merging system-enforced patterns, run:

```sh
leyline-web rules --effective
```

## `vaultconfig/theme/`

Place override files in `.leyline/vaultconfig/theme/` to customize presentation for this vault without forking the theme. The web reader overlays this directory on top of the active theme, file by file.

```
.leyline/vaultconfig/theme/
├── static/
│   ├── theme.css   # vault-specific CSS additions or overrides
│   └── theme.js    # vault-specific JS
└── templates/      # override specific theme templates (advanced)
```

Files here are served at `/<vault-prefix>/_theme/_vault/<asset-path>` and concatenated with the theme chain (parent-first, vault last). For `theme.css` and `theme.js`, all layers load in order; later layers win on specificity.

This is the recommended way to adjust colours, fonts, or layout for one vault without touching the shared theme. For changes that affect all vaults, edit the theme files directly in the themes directory instead.
