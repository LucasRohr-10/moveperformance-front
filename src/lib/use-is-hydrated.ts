import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False in the server HTML and while React is attaching to it, true from then on.
// Forms that carry a password or personal data use it to keep their send button off
// until their `onSubmit` is attached: sent earlier, the browser submits the form
// itself as a GET and writes every named field into the URL.
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
