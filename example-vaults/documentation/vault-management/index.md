---
title: Vault management
description: "Vault admin guide — mint and revoke keys, control what syncs, mark reviewed states with tags, configure the web reader, and manage vault lifecycle."
---

# Vault management

This section is for vault admins: people who own a vault and control who can access it, what files sync, how history is marked, and how the web reader presents it.

A vault admin holds the `admin` role, which grants the full capability set. If you're a collaborator who just wants to connect — whether that's the Obsidian plugin, the `leyline` CLI daemon, or any process speaking the wire or REST protocol — start at [[../collaboration/connecting-to-a-vault|connecting to a vault]] instead.

## In this section

- [[keys-and-roles|Keys and roles]] — mint keys, assign roles, write custom roles, revoke access
- [[what-syncs|What syncs]] — control which file types and sizes reach the server and git history
- [[publishing-with-tags|Publishing with tags]] — mark reviewed states, revert bad commits, restore snapshots
- [[web-reader-setup|Web reader setup]] — configure the web reader: visibility, theme, login, navigation
- [[seo-and-link-previews|SEO and link previews]] — page metadata, OpenGraph cards, the sitemap and robots.txt
- [[vault-lifecycle|Vault lifecycle]] — create, rename, back up, and destroy a vault

## The `.leyline/vaultconfig/` directory

All vault-admin configuration lives under `.leyline/vaultconfig/` inside the vault. These files sync to the server and are visible only to keys holding `vault.admin`. The one exception is `.leyline/README.md`, which syncs to all roles.

| File | What it controls | Canonical reference |
|------|-----------------|---------------------|
| `access` | Keys, roles, and token hashes | [[keys-and-roles\|Keys and roles]] |
| `roles` | Custom role definitions | [[keys-and-roles\|Keys and roles]] |
| `allowed` | Sync and history whitelists | [[what-syncs\|What syncs]] |
| `meta` | Vault metadata (`created_at`) | [[vault-lifecycle\|Vault lifecycle]] |
| `web.yaml` | Web reader presentation | [[web-reader-setup\|Web reader setup]] |
| `webignore` | Web visibility filters | [[web-reader-setup\|Web reader setup]] |
| `theme/` | Per-vault theme overrides | [[web-reader-setup\|Web reader setup]] |

Client-local files (`.leyline/leylinesetup`, `.leyline/leylineignore`) are covered in [[../collaboration/command-line|the command-line client]] and [[../reference/leylinesetup|leylinesetup reference]].
