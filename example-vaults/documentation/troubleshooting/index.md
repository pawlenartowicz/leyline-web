---
title: Troubleshooting
description: "Symptom-first troubleshooting — connection failures, auth errors, stuck or rate-limited sync, conflict markers, permission denials, and web reader 404s."
---

# Troubleshooting

Start with the symptom that matches what you're seeing.

## Can't connect

- [[connection-issues#Can't connect — "incompatible server, update client"|"incompatible server, update client"]] — wire protocol mismatch
- [[connection-issues#Can't connect — server returns 404 for `/_leyline/sync/<vault>`|Server returns 404 for `/_leyline/sync/<vault>`]] — vault not registered or wrong ID
- [[connection-issues#Can't connect — "server not available" / 503|"server not available" / 503]] — vault hydration failed
- [[connection-issues#Daemon socket stale — `leyline sync` exits non-zero|Daemon socket stale]] — leftover `.sock` / `.pid` from a crash
- [[connection-issues|All connection issues]]

## Auth errors

- [[auth-failures#`auth_fail` — key rejected|`auth_fail` — key rejected]] — wrong key, expired, or rate-limited
- [[auth-failures#Plugin shows "Authentication failed — plugin_outdated"|"Authentication failed — plugin_outdated"]] — plugin version too old
- [[auth-failures#`leyline admin` returns 403|`leyline admin` returns 403]] — missing server-wide admin authority
- [[auth-failures|All auth failures]]

## Sync stuck or slow

- [[sync-stuck#Push rejected with `stuck_file` error|Push rejected with `stuck_file`]] — same file pushed in a loop
- [[sync-stuck#Push rejected with `rate_limited`|Push rejected with `rate_limited`]] — exceeding push rate limit
- [[sync-stuck#Push rejected with `vault_full`|Push rejected with `vault_full`]] — vault cap reached
- [[sync-stuck#Daemon keeps reconnecting in a loop|Daemon keeps reconnecting]] — network, auth, or WAL replay
- [[sync-stuck#Sync appears stuck — `leyline status` shows `last_sync` from hours ago|Last sync hours ago]] — fsnotify miss, stale base, or frozen path
- [[sync-stuck|All sync-stuck issues]]

## Conflicts

- [[conflicts-not-resolving#Conflict marker written but `leyline conflicts` still shows it as pending|Conflict marker still pending]] — partial cleanup
- [[conflicts-not-resolving#Conflict keeps reappearing after resolution|Conflict reappears]] — two clients racing
- [[conflicts-not-resolving#`diff_mode` set wrong — getting unexpected marker format|Wrong marker format]] — `diff_mode` mismatch
- [[conflicts-not-resolving#Path frozen in `mirror` mode — file won't update|Path frozen in mirror mode]] — intentional freeze, how to clear
- [[conflicts-not-resolving|All conflict issues]]

## Permissions

- [[permissions#Push rejected with `permission_denied`|Push rejected — `permission_denied`]] — role lacks `sync.push`
- [[permissions#Role shows as unknown / `role_unresolved`|Role `role_unresolved`]] — custom role deleted or malformed
- [[permissions#File type blocked — `type_not_allowed`|File type blocked — `type_not_allowed`]] — extension not in `allowed [sync]`
- [[permissions|All permission issues]]

## Web reader

- [[web-reader-404s#Page exists in the vault but returns 404|Page exists but returns 404]] — webignore, extension, or hidden path
- [[web-reader-404s#Authenticated user gets 404 instead of page content|Authenticated user gets 404]] — wrong vault scope or missing role
- [[web-reader-404s#PDF page renders blank / returns 501|PDF renders blank / 501]] — poppler not installed
- [[web-reader-404s#Login redirect loop — `/_login` redirects to itself|Login redirect loop]] — config mismatch
- [[web-reader-404s|All web reader 404s]]
