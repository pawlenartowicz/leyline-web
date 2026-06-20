---
title: LaTeX and Typst
description: "Planned: collaborative LaTeX with PDF output and Typst → PDF export — .tex and .typ files already sync today; editor and build integration are coming."
tags: [quickstart, act-2, planned]
---

# LaTeX and Typst

> [!info]
> **These are future expansions.** The capabilities described below are in development. Today, `.typ` files sync like any other file by default; `.tex` files require adding `*.tex` to `.leyline/vaultconfig/allowed` first (it isn't in the default whitelist). What's coming is editor and build integration, not the storage.

## Collaborative LaTeX

The goal: Overleaf-style live editing on `.tex` files inside a Leyline vault, with PDF output. The vault is already the source of truth — sync, history, tags, and access control all work for `.typ` files today out of the box; `.tex` files need `*.tex` added to `.leyline/vaultconfig/allowed` first. What's still to come is a first-party editing surface tuned for LaTeX, plus a build pipeline that produces a PDF without standing up a separate service.

## Typst → PDF

Typst is a younger typesetting language with a faster build and friendlier syntax. Typst notes already render in the web reader where applicable; PDF export closes the loop for anyone who wants a printable artifact.

## Why they share a page

Both are typeset-document workflows. Both still need a build step. Both will likely share the same editor surface and PDF-output plumbing, which is why they sit together rather than on independent pages.
