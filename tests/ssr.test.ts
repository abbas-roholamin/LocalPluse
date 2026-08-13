// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createLocalStorageObserver } from "../src/createLocalStorageObserver";

describe("server-side rendering", () => {
  it("has no window to touch", () => {
    expect(typeof window).toBe("undefined");
  });

  it("reads null and swallows writes without throwing", () => {
    const observer = createLocalStorageObserver<{ id: number }>("user");

    expect(observer.get()).toBeNull();
    expect(() => observer.set({ id: 1 })).not.toThrow();
    expect(() => observer.remove()).not.toThrow();
    expect(observer.get()).toBeNull();
  });

  it("still emits null immediately on subscribe", () => {
    const observer = createLocalStorageObserver<{ id: number }>("user");
    const listener = vi.fn();

    const unsubscribe = observer.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(null);
    expect(() => unsubscribe()).not.toThrow();
    expect(() => observer.destroy()).not.toThrow();
  });
});
