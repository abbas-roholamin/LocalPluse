export type Listener<T> = (value: T | null) => void;

export interface LocalStorageObserver<T> {
  get(): T | null;
  set(value: T): void;
  remove(): void;
  subscribe(listener: Listener<T>): () => void;
}
