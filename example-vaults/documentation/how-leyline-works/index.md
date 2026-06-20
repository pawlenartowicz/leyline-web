---
title: How Leyline works
description: "Five-page primer: plain files and git, vaults and keys, permissions, the .leyline/ directory, and three-way merge — read once, understand everything."
---

# How Leyline works

Leyline keeps a shared vault of notes in sync across a small team. Edits travel over a live connection to a server you run yourself, land as real files on disk, and are tracked in git — no database, no cloud service, no vendor lock-in. Read these five pages once and the rest of the docs will make sense.

- [[plain-files-and-git|Plain files and Git]] — why a vault is just a directory and a git repo, and what that means for backup and recovery.
- [[vaults-and-keys|Vaults and keys]] — how a vault is identified, what an API key is and how it's stored.
- [[permissions|Permissions]] — the six capabilities, the three built-in roles, and how custom roles work.
- [[the-leyline-directory|The `.leyline/` directory]] — layout of the control plane: what syncs to whom, what stays local.
- [[conflicts-and-history|Conflicts and history]] — how three-way merge works, what conflict markers look like, how tags and reverts work.
