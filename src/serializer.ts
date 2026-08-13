export function serialize<T>(value: T): string {
  return JSON.stringify(value);
}

export function deserialize<T>(value: string | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
