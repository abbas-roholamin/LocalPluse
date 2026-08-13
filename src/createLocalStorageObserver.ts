import { deserialize, serialize } from "./serializer";
import type { Listener, LocalStorageObserver, Unsubscribe } from "./types";

/**
 * Returns the `localStorage` object, or `null` when it is unavailable.
 *
 * `window` is missing during SSR, and accessing `localStorage` itself throws in
 * sandboxed iframes or when the user has blocked site data — so both are guarded.
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Creates a typed, observable view over a single `localStorage` key.
 *
 * Changes made through `set`/`remove` notify listeners in the current tab, and
 * changes made in other tabs arrive through the `storage` event.
 *
 * @param key - The `localStorage` key to observe.
 */
export function createLocalStorageObserver<T>(
  key: string,
): LocalStorageObserver<T> {
  const listeners = new Set<Listener<T>>();

  let onStorage: ((event: StorageEvent) => void) | null = null;

  const notify = (value: T | null) => {
    // Copy first so a listener that unsubscribes mid-notify cannot skip another.
    for (const listener of [...listeners]) {
      listener(value);
    }
  };

  const get = (): T | null => {
    const storage = getStorage();
    if (!storage) return null;
    try {
      return deserialize<T>(storage.getItem(key));
    } catch {
      return null;
    }
  };

  const set = (value: T) => {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(key, serialize(value));
    } catch {
      // Quota exceeded or storage blocked — skip notifying about a write that
      // never landed.
      return;
    }
    notify(value);
  };

  const remove = () => {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      return;
    }
    notify(null);
  };

  const attach = () => {
    if (onStorage || typeof window === "undefined") return;
    onStorage = (event: StorageEvent) => {
      // `key === null` means the whole store was cleared, which affects us too.
      if (event.key !== null && event.key !== key) return;
      notify(event.key === null ? null : deserialize<T>(event.newValue));
    };
    window.addEventListener("storage", onStorage);
  };

  const detach = () => {
    if (!onStorage || typeof window === "undefined") return;
    window.removeEventListener("storage", onStorage);
    onStorage = null;
  };

  const subscribe = (listener: Listener<T>): Unsubscribe => {
    listeners.add(listener);
    // Attach lazily so an observer with no subscribers holds no window listener.
    attach();

    // Emit current value immediately.
    listener(get());

    let active = true;
    return () => {
      if (!active) return;
      active = false;
      listeners.delete(listener);
      if (listeners.size === 0) detach();
    };
  };

  const destroy = () => {
    listeners.clear();
    detach();
  };

  return {
    key,
    get,
    set,
    remove,
    subscribe,
    destroy,
  };
}
