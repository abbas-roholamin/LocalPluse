import { describe, expect, it } from "vitest";

import { deserialize, serialize } from "../src/serializer";

describe("serialize", () => {
  it("produces JSON", () => {
    expect(serialize({ id: 1 })).toBe('{"id":1}');
    expect(serialize("hello")).toBe('"hello"');
    expect(serialize(null)).toBe("null");
  });
});

describe("deserialize", () => {
  it("returns null for a missing value", () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize(undefined)).toBeNull();
  });

  it("returns null for unparsable input instead of throwing", () => {
    expect(deserialize("{not json")).toBeNull();
    expect(deserialize("")).toBeNull();
  });

  it("round-trips falsy values without collapsing them to null", () => {
    expect(deserialize<string>(serialize(""))).toBe("");
    expect(deserialize<number>(serialize(0))).toBe(0);
    expect(deserialize<boolean>(serialize(false))).toBe(false);
  });

  it("round-trips objects and arrays", () => {
    expect(deserialize(serialize({ id: 1, tags: ["a"] }))).toEqual({
      id: 1,
      tags: ["a"],
    });
  });
});
