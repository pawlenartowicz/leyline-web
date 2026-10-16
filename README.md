# web

User-facing template repo for the Leyline self-hosted, read-only web view.

**Documentation:** [pawlenartowicz.pl/leyline](https://pawlenartowicz.pl/leyline)

## Versioning

Check out the `v0.y.*` tag that matches your installed `leyline-web` minor
(`leyline-web --version`) — an engine needs themes of the same minor. Mixing minors (e.g.
older themes on a newer engine) is unsupported and can fail to render. During the `0.x`
prerelease a minor bump (`0.y` → `0.(y+1)`) may break the engine ↔ theme contract; patch
releases never do. Full policy in the [`leyline`](https://github.com/pawlenartowicz/leyline)
repo.
