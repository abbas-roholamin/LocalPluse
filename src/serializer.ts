export function serialize<T>(value: T): string {
  return JSON.stringify(value);
}

export function deserialize<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
