# localpulse

## 0.1.1

### Patch Changes

- b766b30: Fix the release toolchain. No change to the published package, which is browser-only and has no runtime dependencies.
  
  - Restrict the CI test matrix to Node 22 and 24. jsdom 30 requires Node `^22.22.2 || ^24.15.0 || >=26.0.0` and its undici 8 dependency requires `>=22.19.0`, so the Node 20 job could not start the jsdom test environment at all.
  - Move to pnpm 11 and Node 24 for releases, so npm trusted publishing works. `changeset publish` delegates to `pnpm publish`, and pnpm only supports OIDC from v11.

## 0.1.0

### Minor Changes

- c5c506e: First public release of `localpulse`, a tiny type-safe `localStorage` observer with cross-tab synchronization.
  
  - `createLocalStorageObserver(key)` (aliased as `observe`) returns a typed view over a single key with `get`, `set`, `remove`, `subscribe` and `destroy`.
  - Subscribers are notified for writes in the current tab and for `storage` events from other tabs, including a full `localStorage.clear()`.
  - The `storage` listener is attached only while the observer has subscribers and detached when the last one unsubscribes, so observers no longer leak window listeners.
  - `destroy()` drops every listener and detaches the handler; `get`/`set`/`remove` remain usable afterwards.
  - Safe when `localStorage` is unavailable — during SSR, in sandboxed iframes, or when a write exceeds quota — returning `null` and skipping notification instead of throwing.
  - Falsy stored values (`""`, `0`, `false`) round-trip correctly instead of collapsing to `null`.
