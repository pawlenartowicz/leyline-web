---
title: Server management
description: "Running leyline-server and leyline-web — install, systemd, server.yaml, leyline-admin rescue, backups, health endpoints, and in-place upgrades."
---

# Server management

This section is for the person running `leyline-server` — and optionally `leyline-web` — on a VPS or LAN box. It covers everything from first install to day-two operations: deploying the binary, tuning configuration knobs, rescuing a locked-out server, hosting the web reader, taking backups, and keeping the service healthy over time.

If you are a vault member who wants to connect a client, see [[../collaboration/connecting-to-a-vault|connecting to a vault]] instead. If you manage who can access a vault and with what role, see the [[../vault-management/|vault management]] section.

## Pages in this section

- [[install-and-deploy|Install and deploy]] — binary placement, systemd unit, filesystem layout, reverse-proxy setup (TLS + WebSocket).
- [[server-configuration|Server configuration]] — every knob in `server.yaml`, with defaults and consequences.
- [[leyline-admin-rescue|`leyline-admin` (rescue)]] — the server-box operator CLI: vault lifecycle, bootstrap key recovery, offline `vault list`.
- [[web-reader-hosting|Web reader hosting]] — running `leyline-web` as a separate process, `config.yaml` walkthrough, auth and theme overview.
- [[backups-and-recovery|Backups and recovery]] — what to copy, git as the history store, restoring a vault, registry recovery.
- [[monitoring-and-upgrades|Monitoring and upgrades]] — health endpoints, Prometheus metrics, in-place upgrade flow, smoke test.

## How the pieces fit

```
Obsidian plugin / leyline CLI
        │ WebSocket (:8090)
        ▼
  leyline-server ──→ vault directory (plain files + git history)
                              │
                              └──→ leyline-web (reads FS directly, :8091)
                                         │ HTTP
                                         ▼
                                    Browser readers
```

`leyline-server` owns the vault directories on disk. `leyline-web` is an optional read-only HTTP frontend that reads those same directories directly — no IPC with the server. Both are long-running processes; each gets its own systemd unit.
