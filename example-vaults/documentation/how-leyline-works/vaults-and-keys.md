---
title: Vaults and keys
---

# Vaults and keys

## What a vault is

A vault is a directory on the server — a self-contained folder of files with its own git history, its own access control, and its own configuration. One server can host multiple vaults. Each vault is completely independent: keys, roles, and settings from one vault have no effect on any other.

## Vault addresses

A vault is identified by its address in the form `<host>/<vaultID>` — for example, `sync.example.com/research`. There is no protocol prefix. You use this address when connecting the Obsidian plugin or the CLI; see [[../collaboration/connecting-to-a-vault|connecting to a vault]].

The vault ID is the short name assigned when the vault was created (lowercase letters, numbers, and hyphens; up to 64 characters).

## API keys

Access to a vault is controlled by API keys. Each key has the format `ley_` followed by 20 alphanumeric characters — for example, `ley_aB3kQ9rMx2fTv8nHpLwZ`. This is the only string you need to connect; paste it once into your client (Obsidian plugin, CLI, or web reader) and it handles authentication from there.

Keys are per-vault. A key for one vault does not work on any other vault. One person may hold keys for multiple vaults, but each is a separate string. The recommended practice is one key per person per vault — that way, revoking a key cuts off exactly one person without affecting anyone else.

Keys are stored server-side as a truncated hash, not as the token itself. A stolen copy of the server's access file cannot be used to authenticate without brute-forcing the original key.

## Managing keys

Admins create and revoke keys through the admin API or the CLI. See [[../vault-management/keys-and-roles|managing keys and roles]] for the step-by-step process.

---

**Do this with:** [[../collaboration/connecting-to-a-vault|Connecting to a vault]] (install your key) · [[../vault-management/keys-and-roles|Keys and roles]] (create or revoke keys) · [[../vault-management/vault-lifecycle|Vault lifecycle]] (create a vault)
