<p align="center">
  <img src="https://raw.githubusercontent.com/abbas-roholamin/localpulse/main/assets/localpulse.jpg" alt="localpulse" width="640">
</p>

<h1 align="center">localpulse</h1>

<p align="center">
  A tiny, type-safe <code>localStorage</code> observer with cross-tab synchronization.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/localpulse"><img src="https://img.shields.io/npm/v/localpulse.svg" alt="npm version"></a>
  <a href="https://bundlephobia.com/package/localpulse"><img src="https://img.shields.io/bundlephobia/minzip/localpulse.svg" alt="gzipped size"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/localpulse.svg" alt="MIT license"></a>
</p>


`localStorage` is a plain key/value bag: it cannot tell you when a value changes in the current tab, and the native `storage` event only fires in _other_ tabs and hands you raw strings. `localpulse` wraps a single key so you get typed reads and writes, a subscription that fires wherever the change came from, and no window listeners left behind.

- **Zero dependencies**, ~1 kB gzipped
- **Typed** — `observe<User>("user")` gives you `User | null`, never `any`
- **Cross-tab** — writes in one tab reach subscribers in every other tab
- **SSR-safe** — no `window` access at import time; `get()` returns `null` on the server
- **No leaks** — the `storage` listener exists only while something is subscribed
- **Framework-agnostic** — works with vanilla JS, React, Vue, Svelte, or nothing at all

## Install

```bash
npm install localpulse
# or
pnpm add localpulse
# or
yarn add localpulse
```

Ships both ESM and CJS builds with bundled type declarations.

## Quick start

```ts
import { observe } from "localpulse";

interface User {
  id: number;
  name: string;
}

const user = observe<User>("user");

// Fires immediately with the current value, then on every change.
const unsubscribe = user.subscribe((value) => {
  console.log("User changed:", value); // User | null
});

user.set({ id: 1, name: "Abbas" }); // → { id: 1, name: "Abbas" }
user.get(); //                      → { id: 1, name: "Abbas" }
user.remove(); //                   → null

unsubscribe();
```

`observe` is a shorter alias for `createLocalStorageObserver`. They are the same function, so use whichever reads better:

```ts
import { createLocalStorageObserver } from "localpulse";
```

## API

### `observe<T>(key): LocalStorageObserver<T>`

Creates a typed, observable view over one `localStorage` key. Creating an observer touches nothing — no read, no listener — until you call a method on it.

| Member                  | Returns       | Notes                                                                       |
| ----------------------- | ------------- | --------------------------------------------------------------------------- |
| `key`                   | `string`      | The key this observer is bound to.                                          |
| `get()`                 | `T \| null`   | `null` when missing, unparsable, or on the server.                          |
| `set(value)`            | `void`        | JSON-serializes, writes, then notifies subscribers in this tab.             |
| `remove()`              | `void`        | Deletes the key and notifies subscribers with `null`.                       |
| `subscribe(listener)`   | `Unsubscribe` | Calls the listener immediately with the current value, then on each change. |
| `destroy()`             | `void`        | Drops every listener and detaches the `storage` handler.                    |

Multiple observers on the same key work fine and stay in sync — a `set()` on one is seen by the others through the same storage the whole page shares. Observers are cheap; create one per key and share it as a module-level constant.

### Cleanup

`subscribe()` returns an unsubscribe function. When the last subscriber leaves, the `storage` listener is detached automatically, so calling `destroy()` is only needed if you want to tear down every subscriber at once:

```ts
const unsubscribe = user.subscribe(render);
unsubscribe(); // this listener only

user.destroy(); // all listeners, in one call
```

`get`, `set` and `remove` keep working after `destroy()` — it removes observation, not the observer.

### Behaviour worth knowing

- **Values are JSON.** Anything `JSON.stringify` can round-trip works. `undefined`, functions, `Map`, `Set` and `Date` do not survive intact — `Date` comes back as a string.
- **Falsy values survive.** `""`, `0` and `false` round-trip correctly; only a missing or unparsable value reads as `null`.
- **Corrupt data reads as `null`** rather than throwing, so a hand-edited or half-written value cannot crash your app.
- **Unavailable storage degrades quietly.** During SSR, inside a sandboxed iframe, or when a write exceeds quota, reads return `null` and writes are skipped without throwing. A failed write does _not_ notify subscribers.
- **A `localStorage.clear()` in another tab** notifies subscribers with `null`, same as a removal.
- **Same-tab writes made directly** via `localStorage.setItem(...)`, bypassing the observer, are not detected — the browser fires `storage` only for other tabs. Go through `set()`.

## Vanilla JavaScript

A cart badge that stays correct across every open tab:

```html
<span id="cart-count">0</span>
<button id="add">Add item</button>

<script type="module">
  import { observe } from "https://esm.sh/localpulse";

  const cart = observe("cart");

  const badge = document.getElementById("cart-count");

  // Runs now with the stored value, and again on every change — including
  // changes made in another tab.
  cart.subscribe((items) => {
    badge.textContent = String(items?.length ?? 0);
  });

  document.getElementById("add").addEventListener("click", () => {
    cart.set([...(cart.get() ?? []), { id: crypto.randomUUID() }]);
  });
</script>
```

Open the page in two tabs and click **Add item** in one — the badge in the other updates immediately.

With a bundler, the import is just `import { observe } from "localpulse";`.

### Sharing one observer across modules

```js
// store.js
import { observe } from "localpulse";

export const theme = observe("theme");
export const token = observe("auth-token");
```

```js
// app.js
import { theme } from "./store.js";

theme.subscribe((value) => {
  document.documentElement.dataset.theme = value ?? "light";
});

document.getElementById("toggle").addEventListener("click", () => {
  theme.set(theme.get() === "dark" ? "light" : "dark");
});
```

## React

`localpulse` has no React dependency. It is an external store, which is exactly what React's built-in `useSyncExternalStore` is for — so a hook is about ten lines and needs nothing extra.

```tsx
// useLocalStorage.ts
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { observe, type LocalStorageObserver } from "localpulse";

export function useLocalStorage<T>(key: string) {
  // One observer per key, kept stable across renders.
  const store: LocalStorageObserver<T> = useMemo(() => observe<T>(key), [key]);

  const value = useSyncExternalStore(
    // React unsubscribes on unmount, which detaches the storage listener.
    useCallback((onChange) => store.subscribe(onChange), [store]),
    () => store.get(),
    // Server snapshot: no localStorage during SSR.
    () => null,
  );

  const setValue = useCallback((next: T) => store.set(next), [store]);
  const removeValue = useCallback(() => store.remove(), [store]);

  return [value, setValue, removeValue] as const;
}
```

> `getSnapshot` must return a stable reference between renders or React will loop. `store.get()` re-parses the JSON on each call, so pass a **primitive** key (`"theme"`, `"count"`, a token string) to this hook. For objects, see the cached variant below.

Using it:

```tsx
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme");

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Theme: {theme ?? "light"}
    </button>
  );
}
```

Two components using `useLocalStorage("theme")` stay in sync with each other, with other tabs, and across reloads — no context provider, no reducer.

### Object values

To store objects, cache the parsed snapshot so its identity only changes when the underlying string does:

```ts
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { observe } from "localpulse";

export function useLocalStorageObject<T>(key: string) {
  const store = useMemo(() => observe<T>(key), [key]);
  const cache = useRef<{ raw: string | null; value: T | null }>({
    raw: null,
    value: null,
  });

  const getSnapshot = useCallback(() => {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(key);
    if (raw !== cache.current.raw) {
      cache.current = { raw, value: store.get() };
    }
    return cache.current.value;
  }, [key, store]);

  const value = useSyncExternalStore(
    useCallback((onChange) => store.subscribe(onChange), [store]),
    getSnapshot,
    () => null,
  );

  const setValue = useCallback((next: T) => store.set(next), [store]);

  return [value, setValue] as const;
}
```

### Next.js and other SSR frameworks

Nothing extra is required. The module reads no browser API on import, `get()` returns `null` on the server, and the `() => null` server snapshot above keeps the first client render matching the server HTML. Expect one post-hydration render once the real value arrives — render a neutral default (`theme ?? "light"`) rather than branching on `null`.

## TypeScript

Strict-mode clean, with declarations generated from source.

```ts
import type {
  LocalStorageObserver,
  Listener,
  Unsubscribe,
} from "localpulse";
```

`get()` and the listener argument are always `T | null`, never `any` — the `null` case is impossible to forget.

## Contributing

```bash
pnpm install
pnpm test        # vitest, jsdom environment
pnpm typecheck   # tsc --noEmit
pnpm build       # tsdown → dist/, validated with publint + attw
```

Add a changeset (`pnpm changeset`) with any user-facing change; CI publishes from `main` once the version PR is merged.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide — project layout, how to test cross-tab behaviour, code style, and how releases work.

## License

[MIT](./LICENSE) © Abbas Roholamin
