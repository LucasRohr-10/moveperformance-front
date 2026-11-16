export type SnackbarTone = "success" | "danger" | "warning" | "info";

export type SnackbarAction = { label: string; href: string } | { label: string; onClick: () => void };

/** A bulleted list followed by the text that explains it, e.g. the slots that failed for one reason. */
export interface SnackbarGroup {
  items: string[];
  note?: string;
}

export interface SnackbarInput {
  tone: SnackbarTone;
  title: string;
  message?: string;
  /** A bulleted list under the title, e.g. the slots that could not be booked. */
  items?: string[];
  /** Several lists, each with its own explanation underneath. */
  groups?: SnackbarGroup[];
  /** Stays until the person closes it, even without a list: for text too long to read in 4 seconds. */
  persistent?: boolean;
  action?: SnackbarAction;
  /** Several actions, shown together at the end. */
  actions?: SnackbarAction[];
}

export interface SnackbarEntry extends SnackbarInput {
  id: string;
}

export const MAX_SNACKBARS = 3;

// Newest first. Showing the same message twice (a double click on "Guardar")
// replaces the visible one instead of stacking a copy; a different detail
// (e.g. another client's failed mark) stacks.
export function pushSnackbar(stack: SnackbarEntry[], entry: SnackbarEntry): SnackbarEntry[] {
  const others = stack.filter(
    (visible) =>
      visible.tone !== entry.tone ||
      visible.title !== entry.title ||
      visible.message !== entry.message ||
      JSON.stringify(visible.groups) !== JSON.stringify(entry.groups),
  );
  return [entry, ...others].slice(0, MAX_SNACKBARS);
}

export function removeSnackbar(stack: SnackbarEntry[], id: string): SnackbarEntry[] {
  return stack.filter((entry) => entry.id !== id);
}

// A list needs more than four seconds to be read. An action still expires:
// hovering or focusing the snackbar pauses the countdown.
export function autoDismisses(input: SnackbarInput): boolean {
  return !input.persistent && (input.items?.length ?? 0) === 0 && (input.groups?.length ?? 0) === 0;
}
