import type { DayEditorDto, ServiceType } from "@/lib/api/types";

import type { DayDraftState, DraftAction, LocalSummary } from "./day-draft-model";
import type { ChangeGroup, TurnoRow } from "./day-editor-model";

/** The editor has a desktop and a phone layout: the same pieces, sized and arranged differently. */
export type EditorVariant = "desktop" | "mobile";

export type EditorMode = "edit" | "close";

/** What `DayEditorPanel` hands to both layouts. They only draw it: every decision is made upstream. */
export interface DayEditorViewProps {
  editor: DayEditorDto;
  state: DayDraftState;
  summary: LocalSummary;
  dispatch: (action: DraftAction) => void;

  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;

  service: ServiceType;
  onServiceChange: (service: ServiceType) => void;
  rows: TurnoRow[];
  /** Key of the row whose franja is being edited. */
  openKey: string | null;
  onOpenChange: (key: string | null) => void;
  isAdding: boolean;
  onAddingChange: (isAdding: boolean) => void;

  isMultiDay: boolean;
  onMultiDayChange: (isMultiDay: boolean) => void;
  /** Last day to close, "" until one is picked. */
  until: string;
  onUntilChange: (date: string) => void;
  closeTitle: string;
  closeDescription: string;

  groups: ChangeGroup[];
  emptyHint: string;
  canSave: boolean;
  saveLabel: string;
  isSaving: boolean;
  reasonError: string | null;
  onSave: () => void;
  onDiscard: () => void;
}
