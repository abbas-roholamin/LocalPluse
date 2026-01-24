import { deserialize, serialize } from "./serializer";
import type { Listener, LocalStorageObserver } from "./types";

export function createLocalStorageObserver<T>(
  key: string,
): LocalStorageObserver<T> {
  const listeners = new Set<Listener<T>>();

  const isBrowser = typeof window !== "undefined";

  const notify = (value: T | null) => {
    listeners.forEach((listener) => listener(value));
  };

  const get = (): T | null => {
    if (!isBrowser) return null;
    return deserialize<T>(localStorage.getItem(key));
  };

  const set = (value: T) => {
    if (!isBrowser) return;
    localStorage.setItem(key, serialize(value));
    notify(value);
  };

  const remove = () => {
    if (!isBrowser) return;
    localStorage.removeItem(key);
    notify(null);
  };

  const subscribe = (listener: Listener<T>) => {
    listeners.add(listener);

    // Emit current value immediately
    listener(get());

    return () => {
      listeners.delete(listener);
    };
  };

  if (isBrowser) {
    window.addEventListener("storage", (event) => {
      if (event.key === key) {
        notify(deserialize<T>(event.newValue));
      }
    });
  }

  return {
    get,
    set,
    remove,
    subscribe,
  };
}
