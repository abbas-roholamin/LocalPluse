import { describe, expect, it } from "vitest";

import {
  createLocalStorageObserver,
  observe,
  type Listener,
  type LocalStorageObserver,
  type Unsubscribe,
} from "../src/index";

describe("public entry point", () => {
  it("exports observe as an alias of createLocalStorageObserver", () => {
    expect(observe).toBe(createLocalStorageObserver);
  });

  it("builds a working observer through the alias", () => {
    window.localStorage.clear();
    const theme = observe<string>("theme");

    theme.set("dark");

    expect(theme.get()).toBe("dark");
    expect(theme.key).toBe("theme");
  });

  it("exports the public types", () => {
    const observer: LocalStorageObserver<number> = observe<number>("count");
    const listener: Listener<number> = () => {};
    const unsubscribe: Unsubscribe = observer.subscribe(listener);

    unsubscribe();
    observer.destroy();
    expect(observer.key).toBe("count");
  });
});
