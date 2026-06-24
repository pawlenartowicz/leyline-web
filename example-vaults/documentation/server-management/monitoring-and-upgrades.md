---
title: Monitoring and upgrades
---

# Monitoring and upgrades

## Health endpoints

`leyline-server` exposes three health/status routes with no authentication:

| Endpoint | Auth | Returns |
|---|---|---|
| `GET /_leyline/healthz` | none | Plain text `ok` with status 200. Use for liveness probes in load balancers and uptime monitors. |
| `GET /_leyline/health` | none | JSON object: `{"status":"ok","connected_clients":<n>,"vaults":<n>,"uptime":"<human>","uptime_seconds":<n>}`. Richer than `/_leyline/healthz`; use for health dashboards. |
| `GET /_leyline/operator/status` | none (open for monitoring probes) | Server stats including build version, hydrated vaults, and active connections. Server-wide admin can call this too but auth is not required. |

`leyline-web` exposes one health route:

| Endpoint | Auth | Returns |
|---|---|---|
| `GET /_health` | none | 200 if at least one vault is registered in the config. |

### Adding to a load balancer (nginx upstream)

```nginx
location = /_leyline/healthz {
    proxy_pass http://127.0.0.1:8090/_leyline/healthz;
    access_log off;
}
```

### Uptime monitoring (e.g. UptimeRobot)

Use `https://example.com/_leyline/healthz` with expected status 200 and keyword `ok`. `/_leyline/healthz` is the simplest probe; `/_leyline/health` is better for alerting on vault or client anomalies.

## Prometheus metrics

`LEYLINE_METRICS_LISTEN=127.0.0.1:9100` exposes `GET /metrics` in Prometheus text format (v0.0.4). The listener refuses non-loopback bind addresses.

Key metrics:

| Metric | Type | Description |
|---|---|---|
| `leyline_ws_connections_total{vault}` | counter | WebSocket connections established per vault. |
| `leyline_ws_auth_failures_total{vault,reason}` | counter | Auth failures by reason (`invalid_key`, `rate_limited`, `wire_format`, etc.). |
| `leyline_sync_pushes_total{vault,outcome}` | counter | Push outcomes: `ok` (the only value currently wired). |
| `leyline_git_ops_total{vault,op,result}` | counter | Git operations: `commit_ops`, `revert`, `restore`, `tag`, `tag_delete`. |
| `leyline_git_gc_runs_total{vault,result}` | counter | Daily `git gc` outcomes (`ok` / `error`). |
| `leyline_admin_key_ops_total{vault,op}` | counter | Key management operations: `create`, `delete`, `update_role`. |
| `leyline_panics_recovered_total` | counter | Panic recoveries in HTTP handlers. Non-zero warrants immediate attention. |
| `leyline_active_clients{vault}` | gauge | Current connected WebSocket clients per vault. |
| `leyline_vaults_hydrated` | gauge | Number of vaults currently loaded in memory. |

**Scrape interval.** 30 s is fine. Metrics are lightweight; the server does not buffer them.

**Alert suggestions:**
- `leyline_panics_recovered_total` increases → investigate immediately.
- `leyline_ws_auth_failures_total{reason="rate_limited"}` spikes → possible credential stuffing.
- `leyline_git_gc_runs_total{result="error"}` → vault repository may be corrupt; check `journalctl -u leyline-server`.

## Logs

The server logs to stderr in JSON format by default. Under systemd, logs go to journald:

```sh
journalctl -u leyline-server -f             # tail live
journalctl -u leyline-server --since "1h ago"
journalctl -u leyline-server -p err         # errors only
```

Switch to human-readable text format for local debugging:

```sh
# In the systemd unit's [Service] block:
Environment=LEYLINE_LOG_FORMAT=text
Environment=LEYLINE_LOG_LEVEL=debug
```

Set `LEYLINE_ACCESS_LOG=off` to suppress per-request access records (useful when a load balancer already logs them).

## In-place upgrade

The server does not perform rolling upgrades — stop it, replace it, start it. Stay within the minor (`0.4.*`); crossing to `0.5` carries no compatibility guarantee.

**Package install (recommended).** If you installed from a `.deb`/`.rpm`/`.apk`, upgrade with the package manager — it replaces both `leyline-server` and `leyline-admin` and leaves the systemd unit in place:

```sh
VER=0.4.0            # the release you're upgrading to (stay within 0.4.*)
cd /tmp && curl -fsSL -O "https://github.com/pawlenartowicz/leyline/releases/download/v${VER}/leyline-server_${VER}_amd64.deb"
sudo apt install ./leyline-server_${VER}_amd64.deb         # Fedora/RHEL: dnf install ./…_amd64.rpm · Alpine: apk add --allow-untrusted ./…_amd64.apk
sudo systemctl restart leyline-server
journalctl -u leyline-server -f                            # watch the first 30–60s
```

**Source / tarball install (manual binary swap).** The step-by-step form:

1. **Stop the service.** Connected clients will disconnect and retry.
   ```sh
   systemctl stop leyline-server
   ```

2. **Replace the binary.** Preserve the old binary as a rollback option.
   ```sh
   cp /usr/local/bin/leyline-server /usr/local/bin/leyline-server.prev
   install -m 0755 leyline-server-NEW /usr/local/bin/leyline-server
   ```

3. **Replace `leyline-admin`** (ships in the same release):
   ```sh
   install -m 0755 leyline-admin-NEW /usr/local/bin/leyline-admin
   ```

4. **Start the service.**
   ```sh
   systemctl start leyline-server
   ```

5. **Watch the logs** for the first 30–60 seconds.
   ```sh
   journalctl -u leyline-server -f
   ```
   Look for successful vault hydrations (first client connections), no error-level messages, and `WAL replayed` entries completing cleanly.

6. **Run the smoke test** (optional but recommended after non-trivial upgrades):
   ```sh
   LEYLINE_SMOKE_URL=ws://127.0.0.1:8090/_leyline/sync/myvault \
   LEYLINE_SMOKE_API_KEY=ley_xxxx \
   smoketest
   ```
   Exit 0 means all subtests passed. See the [[#Smoke test|smoke test]] section below for the full `smoketest` flag reference.

### Rolling back

```sh
systemctl stop leyline-server
cp /usr/local/bin/leyline-server.prev /usr/local/bin/leyline-server
systemctl start leyline-server
```

The WAL and vault directories are forward-compatible within the v0.x series; a rollback does not require touching vault data.

## Smoke test

`smoketest` (built from `cmd/smoketest/` in the server repo) is a black-box protocol battery that connects to a live server and exercises core operations:

```sh
# Default: run all standard subtests
LEYLINE_SMOKE_URL=ws://127.0.0.1:8090/_leyline/sync/myvault \
LEYLINE_SMOKE_API_KEY=ley_xxxx \
smoketest

# Run a specific subtest
smoketest -test auth_fail
```

Standard subtests: `crud`, `rename`, `traversal`, `allowed`, `multi`, `reader_push_denied`, `ipv6`, `auth_fail`.
Opt-in (slower/strict): `auth_ratelimit`, `push_rate_limit_strict`.

Exit codes: `0` pass · `1` auth failure · `2` content mismatch · `3` protocol error.

Run `smoketest` after every upgrade and after any change to reverse-proxy configuration. A passing smoke test confirms the WebSocket protocol is intact end-to-end.

## `leyline-web` upgrades

`leyline-web` upgrades follow the same stop/replace/start pattern. No WAL or vault state is held in memory between requests; the process can be stopped at any time without data loss.

**Two parts must move together: the engine binary *and* every instance's theme clone.** The engine and the `web` theme template share a versioned contract — a newer engine against an older clone fails to render (e.g. a template field the old theme lacks). Keep both on the same minor: bump the binary, then check the clone out to the matching tag.

**Package install (recommended).** Replace `INST` with your instance name (the directory under `/opt/leyline-web/`):

```sh
VER=0.4.0            # the release you're upgrading to (stay within 0.4.*)
INST=mysite          # your instance — the dir under /opt/leyline-web/

cd /tmp && curl -fsSL -O "https://github.com/pawlenartowicz/leyline/releases/download/v${VER}/leyline-web_${VER}_amd64.deb"
sudo apt install ./leyline-web_${VER}_amd64.deb           # Fedora/RHEL: dnf · Alpine: apk add --allow-untrusted

# Bring the instance's theme clone to the latest matching tag, then restart it:
sudo git -C "/opt/leyline-web/$INST" fetch --tags
sudo git -C "/opt/leyline-web/$INST" checkout "$(git -C /opt/leyline-web/$INST tag -l 'v0.4.*' | sort -V | tail -1)"
sudo systemctl restart "leyline-web@$INST"
curl -sf http://127.0.0.1:8091/_health                   # expect 200
```

**Source / tarball install (manual binary swap):**

```sh
INST=myinstance
systemctl stop "leyline-web@$INST"
install -m 0755 leyline-web-NEW /usr/local/bin/leyline-web
git -C "/opt/leyline-web/$INST" fetch --tags
git -C "/opt/leyline-web/$INST" checkout "$(git -C /opt/leyline-web/$INST tag -l 'v0.4.*' | sort -V | tail -1)"
systemctl start "leyline-web@$INST"
curl -sf http://127.0.0.1:8091/_health   # expect 200
```