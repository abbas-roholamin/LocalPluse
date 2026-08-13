# localpulse

## 0.1.0

### Minor Changes

- c5c506e: First public release of `localpulse`, a tiny type-safe `localStorage` observer with cross-tab synchronization.
  
  - `createLocalStorageObserver(key)` (aliased as `observe`) returns a typed view over a single key with `get`, `set`, `remove`, `subscribe` and `destroy`.
  - Subscribers are notified for writes in the current tab and for `storage` events from other tabs, including a full `localStorage.clear()`.
  - The `storage` listener is attached only while the observer has subscribers and detached when the last one unsubscribes, so observers no longer leak window listeners.
  - `destroy()` drops every listener and detaches the handler; `get`/`set`/`remove` remain usable afterwards.
  - Safe when `localStorage` is unavailable — during SSR, in sandboxed iframes, or when a write exceeds quota — returning `null` and skipping notification instead of throwing.
  - Falsy stored values (`""`, `0`, `false`) round-trip correctly instead of collapsing to `null`.
