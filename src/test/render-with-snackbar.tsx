import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { SnackbarProvider } from "@/components/ui/snackbar";

export function renderWithSnackbar(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: SnackbarProvider });
}
