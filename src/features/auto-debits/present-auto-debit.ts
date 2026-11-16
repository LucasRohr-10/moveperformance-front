import { AUTO_DEBIT_STATUSES, type AutoDebitDto, type AutoDebitStatus } from "@/lib/api/types";

export interface AutoDebitLineModel {
  text: string;
  canCancel: boolean;
  debitId: string;
}

// nextChargeOn is a YYYY-MM-DD business date: split the string, as formatBusinessDate does.
function dayAndMonth(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

// A cancelled debit has no line: one entry per status that can be shown.
const LINE_TEXTS: Record<AutoDebitStatus, ((debit: AutoDebitDto) => string) | null> = {
  [AUTO_DEBIT_STATUSES.PENDING]: () => "Débito automático pendiente de autorización",
  [AUTO_DEBIT_STATUSES.AUTHORIZED]: ({ nextChargeOn }) =>
    nextChargeOn === null
      ? "Débito automático activo"
      : `Débito automático activo · próximo cobro ${dayAndMonth(nextChargeOn)}`,
  [AUTO_DEBIT_STATUSES.CANCELLED]: null,
};

const isNewer = (candidate: AutoDebitDto, current: AutoDebitDto): boolean => candidate.createdAt > current.createdAt;

export function presentAutoDebitLine(debits: AutoDebitDto[], service: AutoDebitDto["service"]): AutoDebitLineModel | null {
  const active = debits
    .filter((debit) => debit.service === service && LINE_TEXTS[debit.status] !== null)
    .reduce<AutoDebitDto | null>((newest, debit) => (newest === null || isNewer(debit, newest) ? debit : newest), null);
  if (active === null) return null;

  const text = LINE_TEXTS[active.status];
  return text === null ? null : { text: text(active), canCancel: true, debitId: active.id };
}
