export {
  createLocalStorageObserver,
  // Short alias — identical behaviour, nicer at call sites.
  createLocalStorageObserver as observe,
} from "./createLocalStorageObserver";
export type { LocalStorageObserver, Listener, Unsubscribe } from "./types";
