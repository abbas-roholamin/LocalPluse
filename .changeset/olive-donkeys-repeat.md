---
"localpulse": patch
---

Fix the release toolchain. No change to the published package, which is browser-only and has no runtime dependencies.

- Restrict the CI test matrix to Node 22 and 24. jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26.0.0` and its undici 8 dependency requires `>=22.19.0`, so the Node 20 job could not start the jsdom test environment at all.
- Move to pnpm 11 and Node 24 for releases, so npm trusted publishing works. `changeset publish` delegates to `pnpm publish`, and pnpm only supports OIDC from v11.
