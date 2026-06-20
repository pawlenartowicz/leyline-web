---
title: Themes
description: "Themes live in .leyline/vaultconfig/theme/ and travel with the vault — fork the web repo, drop per-vault overrides, toggle dark/light in the reader."
tags: [quickstart, act-2]
---

# Themes

Each vault carries its own look. Themes live in `.leyline/vaultconfig/theme/` inside the vault — synced like any other admin file, travelling with the vault from server to server.

That means a docs site, a team wiki, and a customer-facing knowledge base can run on the same `leyline-web` binary with three different looks, with little to no per-server config.

## Dark and light

A button in the reader UI flips dark and light — try it on this page right now. That's not a theme swap; it's the built-in mode toggle that ships with the default templates.

## Building a theme

The fastest start is to fork the [`web`](https://github.com/pawlenartowicz/leyline-web) repo — themes, demo config, and deploy stubs in one place — then customise from `leyline_base` (the default theme the reader ships with). For a per-vault tweak, drop overrides into `.leyline/vaultconfig/theme/`; the renderer picks them up on the next request.

Configuring visibility, login, and theme overrides: [[@documentation/vault-management/web-reader-setup|Web reader setup]].
