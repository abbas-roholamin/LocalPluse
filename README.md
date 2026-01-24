# localpulse

A tiny, type-safe localStorage observer with cross-tab synchronization.

```ts
const observer = createLocalStorageObserver<User>("user");

const unsubscribe = observer.subscribe((value) => {
  console.log("User changed:", value);
});

observer.set({ id: 1, name: "Abbas" });
observer.remove();
```
