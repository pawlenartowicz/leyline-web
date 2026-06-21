---
title: Obsidian Markdown parity
---

# Obsidian Markdown parity

Scope: **web reader rendering** only. Sync, auth, and storage features are not listed here. Obsidian-the-app features that depend on plugins or the Obsidian runtime (graph view, canvas, plugin UIs) are out of scope — Leyline renders Markdown files, not the Obsidian runtime.

Source of truth: [`FEATURES.md`](https://github.com/pawlenartowicz/leyline) in the leyline-web-source repo. For the underlying goldmark extension state, see the goldmark-obsidian notes in `docs/thirdparty/`.

---

## Links and embeds

| Feature | Status | Notes |
|---------|--------|-------|
| Internal links `[[Link]]` | Implemented | |
| Embeds `![[Link]]` | Implemented | |
| CSV/TSV/PSV embeds `![[data.csv]]` | Implemented | Renders as inline table. Oversize (>1 MiB), missing, or unparseable embeds degrade to a labeled link. |
| Block references `![[Link#^id]]` | Implemented | |
| Block IDs `^id` | Implemented | |
| Image sizing `![[img.png\|300]]`, `![[img.png\|300x200]]` | Implemented | Also handles `![[img.png\|caption\|300]]` and standard markdown form `![alt\|300](url)`. Size tokens lifted onto `<img width= height=>`. |
| Theme-conditional images `![[img.png\|theme-dark]]` | Implemented | Leyline-web only. A `theme-dark` / `theme-light` segment (case-insensitive, any order with the size token) shows the image only in that light/dark mode — both variants present ⇒ swap on toggle, one ⇒ gate. In Obsidian the segment is inert. |

---

## Text formatting

| Feature | Status | Notes |
|---------|--------|-------|
| Highlights `==text==` | Implemented | Renders as `<mark>`. |
| Comments `%%text%%` | Implemented | Both inline and block forms. Stripped entirely from output (no HTML comments). |
| Tags `#tag` | Implemented | |
| Strikethrough (GFM) | Implemented | |
| Footnotes (goldmark-obsidian) | Implemented | |
| Autolinks (GFM) | Implemented | |

---

## Callouts

| Feature | Status | Notes |
|---------|--------|-------|
| Callouts `> [!type]` | Implemented | Non-foldable renders as `<div class="callout …">`. |
| Foldable callouts `> [!type]+` / `> [!type]-` | Implemented | Renders as `<details open>` / `<details>` with `<summary class="callout-title">`. |
| Callout title inline markdown (bold/em/code/highlight) | Implemented | Parsed and preserved. |

---

## Code

| Feature | Status | Notes |
|---------|--------|-------|
| Fenced code blocks with syntax highlighting | Implemented | Chroma-based; github light + github-dark palettes, selected by a `data-theme` attribute that defaults to the OS `prefers-color-scheme` and is overridable by the in-page theme toggle. |

---

## Math and diagrams

| Feature | Status | Notes |
|---------|--------|-------|
| LaTeX / MathJax `$$…$$` | Implemented | |
| Inline math `$…$` | Implemented | |
| Mermaid diagrams | Implemented | |

---

## Frontmatter and metadata

| Feature | Status | Notes |
|---------|--------|-------|
| Frontmatter / properties | Implemented | 1+ leading dashes accepted. |

---

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| GFM tables | Implemented | |

---

## Task lists

| Feature | Status | Notes |
|---------|--------|-------|
| Task lists `- [ ]` | Implemented | |
| Obsidian Tasks plugin format (emoji dates, priority markers) | Not implemented | Only plain GFM/Obsidian `- [ ]` task lists are rendered today; emoji dates and priority markers pass through as literal text. The Tasks plugin parser is a separate goldmark-obsidian extension not wired into the web reader. |

---

## Planned

| Feature | Status | Notes |
|---------|--------|-------|
| Kanban boards | Planned | Obsidian Kanban plugin stores boards as Markdown with `kanban-plugin: basic` in frontmatter, columns as `## Heading`, cards as `- [ ]` items. Currently renders as plain task lists. |
| References | Planned | Specific rendering approach to be determined. |

---

## Not planned

| Feature | Status | Notes |
|---------|--------|-------|
| Inline footnotes `^[...]` | Not planned | Upstream goldmark-obsidian marked not planned. |
| Dataview queries | Not planned | Upstream goldmark-obsidian marked not planned. |
| Excalidraw / canvas | Not planned | Outside the Markdown rendering layer. |
