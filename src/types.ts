export type Listener<T> = (value: T | null) => void;

export type Unsubscribe = () => void;

export interface LocalStorageObserver<T> {
  /** The localStorage key this observer is bound to. */
  readonly key: string;
  /** Read the current value. Returns `null` when missing, unparsable, or on the server. */
  get(): T | null;
  /** Write a value and notify listeners in this tab. */
  set(value: T): void;
  /** Delete the key and notify listeners with `null`. */
  remove(): void;
  /** Subscribe to changes. The listener is called immediately with the current value. */
  subscribe(listener: Listener<T>): Unsubscribe;
  /** Drop every listener and detach the `storage` event handler. */
  destroy(): void;
}
