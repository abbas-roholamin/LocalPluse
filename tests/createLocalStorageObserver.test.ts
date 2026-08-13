import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalStorageObserver } from "../src/createLocalStorageObserver";

interface User {
  id: number;
  name: string;
}

/** Simulates a write from another tab, which jsdom does not do on its own. */
function emitStorageEvent(key: string | null, newValue: string | null) {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key,
      newValue,
      storageArea: window.localStorage,
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("get / set / remove", () => {
  it("exposes the key it is bound to", () => {
    expect(createLocalStorageObserver("user").key).toBe("user");
  });

  it("returns null when the key is absent", () => {
    expect(createLocalStorageObserver<User>("user").get()).toBeNull();
  });

  it("writes JSON and reads it back typed", () => {
    const observer = createLocalStorageObserver<User>("user");
    observer.set({ id: 1, name: "Abbas" });

    expect(window.localStorage.getItem("user")).toBe('{"id":1,"name":"Abbas"}');
    expect(observer.get()).toEqual({ id: 1, name: "Abbas" });
  });

  it("removes the key", () => {
    const observer = createLocalStorageObserver<User>("user");
    observer.set({ id: 1, name: "Abbas" });
    observer.remove();

    expect(window.localStorage.getItem("user")).toBeNull();
    expect(observer.get()).toBeNull();
  });

  it("returns null when the stored value is not valid JSON", () => {
    window.localStorage.setItem("user", "{corrupt");

    expect(createLocalStorageObserver<User>("user").get()).toBeNull();
  });

  it("does not notify when the write fails", () => {
    const observer = createLocalStorageObserver<User>("user");
    const listener = vi.fn();
    observer.subscribe(listener);
    listener.mockClear();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    expect(() => observer.set({ id: 1, name: "Abbas" })).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("subscribe", () => {
  it("emits the current value immediately", () => {
    window.localStorage.setItem("user", '{"id":1,"name":"Abbas"}');
    const listener = vi.fn();

    createLocalStorageObserver<User>("user").subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ id: 1, name: "Abbas" });
  });

  it("emits null immediately when nothing is stored", () => {
    const listener = vi.fn();

    createLocalStorageObserver<User>("user").subscribe(listener);

    expect(listener).toHaveBeenCalledWith(null);
  });

  it("notifies on set and remove in the same tab", () => {
    const observer = createLocalStorageObserver<User>("user");
    const listener = vi.fn();
    observer.subscribe(listener);

    observer.set({ id: 2, name: "Sara" });
    observer.remove();

    expect(listener.mock.calls).toEqual([
      [null],
      [{ id: 2, name: "Sara" }],
      [null],
    ]);
  });

  it("notifies every subscriber", () => {
    const observer = createLocalStorageObserver<User>("user");
    const first = vi.fn();
    const second = vi.fn();
    observer.subscribe(first);
    observer.subscribe(second);

    observer.set({ id: 3, name: "Ali" });

    expect(first).toHaveBeenLastCalledWith({ id: 3, name: "Ali" });
    expect(second).toHaveBeenLastCalledWith({ id: 3, name: "Ali" });
  });

  it("stops notifying after unsubscribe", () => {
    const observer = createLocalStorageObserver<User>("user");
    const listener = vi.fn();
    const unsubscribe = observer.subscribe(listener);
    listener.mockClear();

    unsubscribe();
    observer.set({ id: 1, name: "Abbas" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("ignores repeated unsubscribe calls", () => {
    const observer = createLocalStorageObserver<User>("user");
    const first = vi.fn();
    const unsubscribe = observer.subscribe(first);

    unsubscribe();
    unsubscribe();
    const second = vi.fn();
    observer.subscribe(second);
    second.mockClear();

    observer.set({ id: 1, name: "Abbas" });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("still notifies later listeners when one unsubscribes mid-notify", () => {
    const observer = createLocalStorageObserver<User>("user");
    const second = vi.fn();
    // `let` matters: the immediate emission runs before the assignment lands.
    let unsubscribeFirst: (() => void) | undefined;
    unsubscribeFirst = observer.subscribe(() => unsubscribeFirst?.());
    observer.subscribe(second);
    second.mockClear();

    observer.set({ id: 1, name: "Abbas" });

    expect(second).toHaveBeenCalledWith({ id: 1, name: "Abbas" });
  });
});

describe("cross-tab synchronization", () => {
  it("notifies when the observed key changes in another tab", () => {
    const observer = createLocalStorageObserver<User>("user");
    const listener = vi.fn();
    observer.subscribe(listener);
    listener.mockClear();

    emitStorageEvent("user", '{"id":9,"name":"Remote"}');

    expect(listener).toHaveBeenCalledWith({ id: 9, name: "Remote" });
  });

  it("notifies with null when the key is removed in another tab", () => {
    const observer = createLocalStorageObserver<User>("user");
    const listener = vi.fn();
    observer.subscribe(listener);
    listener.mockClear();

    emitStorageEvent("user", null);

    expect(listener).toHaveBeenCalledWith(null);
  });

  it("notifies with null when another tab clears all storage", () => {
    const observer = createLocalStorageObserver<User>("user");
    const listener = vi.fn();
    observer.subscribe(listener);
    listener.mockClear();

    emitStorageEvent(null, null);

    expect(listener).toHaveBeenCalledWith(null);
  });

  it("ignores changes to other keys", () => {
    const observer = createLocalStorageObserver<User>("user");
    const listener = vi.fn();
    observer.subscribe(listener);
    listener.mockClear();

    emitStorageEvent("theme", '"dark"');

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("listener lifecycle", () => {
  it("attaches no window listener before the first subscribe", () => {
    const add = vi.spyOn(window, "addEventListener");

    createLocalStorageObserver<User>("user");

    expect(add).not.toHaveBeenCalledWith("storage", expect.anything());
  });

  it("attaches once no matter how many subscribers there are", () => {
    const add = vi.spyOn(window, "addEventListener");
    const observer = createLocalStorageObserver<User>("user");

    observer.subscribe(vi.fn());
    observer.subscribe(vi.fn());

    const storageCalls = add.mock.calls.filter(([type]) => type === "storage");
    expect(storageCalls).toHaveLength(1);
  });

  it("detaches when the last subscriber leaves", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const observer = createLocalStorageObserver<User>("user");
    const unsubscribeFirst = observer.subscribe(vi.fn());
    const unsubscribeSecond = observer.subscribe(vi.fn());

    unsubscribeFirst();
    expect(
      remove.mock.calls.filter(([type]) => type === "storage"),
    ).toHaveLength(0);

    unsubscribeSecond();
    expect(
      remove.mock.calls.filter(([type]) => type === "storage"),
    ).toHaveLength(1);
  });

  it("re-attaches when a new subscriber arrives after the last one left", () => {
    const observer = createLocalStorageObserver<User>("user");
    observer.subscribe(vi.fn())();

    const listener = vi.fn();
    observer.subscribe(listener);
    listener.mockClear();

    emitStorageEvent("user", '{"id":4,"name":"Back"}');

    expect(listener).toHaveBeenCalledWith({ id: 4, name: "Back" });
  });
});

describe("destroy", () => {
  it("drops every listener and detaches the window handler", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const observer = createLocalStorageObserver<User>("user");
    const listener = vi.fn();
    observer.subscribe(listener);
    listener.mockClear();

    observer.destroy();

    observer.set({ id: 1, name: "Abbas" });
    emitStorageEvent("user", '{"id":2,"name":"Remote"}');

    expect(listener).not.toHaveBeenCalled();
    expect(
      remove.mock.calls.filter(([type]) => type === "storage"),
    ).toHaveLength(1);
  });

  it("leaves get, set and remove usable", () => {
    const observer = createLocalStorageObserver<User>("user");
    observer.subscribe(vi.fn());

    observer.destroy();
    observer.set({ id: 1, name: "Abbas" });

    expect(observer.get()).toEqual({ id: 1, name: "Abbas" });
  });

  it("is safe to call more than once and without subscribers", () => {
    const observer = createLocalStorageObserver<User>("user");

    expect(() => {
      observer.destroy();
      observer.destroy();
    }).not.toThrow();
  });
});

describe("unavailable storage", () => {
  it("degrades to no-ops when localStorage access throws", () => {
    const spy = vi
      .spyOn(window, "localStorage", "get")
      .mockImplementation(() => {
        throw new DOMException("SecurityError");
      });
    const observer = createLocalStorageObserver<User>("user");
    const listener = vi.fn();

    expect(() => {
      observer.subscribe(listener);
      observer.set({ id: 1, name: "Abbas" });
      observer.remove();
    }).not.toThrow();
    expect(observer.get()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(null);

    spy.mockRestore();
  });
});
