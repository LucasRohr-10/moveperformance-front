import type {
  DayBandDto,
  DayBandValuesDto,
  DayEditorDto,
  DayEditorSlotDto,
  DayIndividualSlotDto,
} from "@/lib/api/types";

export const DAY = "2026-11-12";

// Montevideo is UTC-3 all year, so 08:00 there is 11:00Z.
export function at(time: string, date = DAY): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${date}T${String(hours + 3).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00.000Z`;
}

const JUAN = { professionalId: "p-juan", professionalName: "Juan Gómez" };

export function slot(
  id: string,
  start: string,
  end: string,
  booked: number,
  overrides: Partial<DayEditorSlotDto> = {},
): DayEditorSlotDto {
  return {
    id,
    startsAt: at(start),
    endsAt: at(end),
    capacity: 4,
    booked,
    state: "active",
    cancelReason: null,
    professionalId: null,
    professionalName: null,
    ...overrides,
  };
}

function values(startTime: string, endTime: string, capacity: number, professional?: [string, string]): DayBandValuesDto {
  return {
    startTime,
    endTime,
    capacity,
    professionalId: professional?.[0] ?? null,
    professionalName: professional?.[1] ?? null,
  };
}

export function morningBand(overrides: Partial<DayBandDto> = {}): DayBandDto {
  const base = values("08:00", "10:45", 4);
  return {
    templateId: "t-morning",
    label: "08:00 – 10:45",
    durationMinutes: 45,
    gapMinutes: 15,
    template: base,
    effective: base,
    isOpen: true,
    slots: [slot("s08", "08:00", "08:45", 2), slot("s09", "09:00", "09:45", 0), slot("s10", "10:00", "10:45", 3)],
    activeSlots: 3,
    bookedCount: 5,
    ...overrides,
  };
}

export function afternoonBand(overrides: Partial<DayBandDto> = {}): DayBandDto {
  const base = values("16:00", "18:45", 4);
  return {
    templateId: "t-afternoon",
    label: "16:00 – 18:45",
    durationMinutes: 45,
    gapMinutes: 15,
    template: base,
    effective: base,
    isOpen: true,
    slots: [slot("s16", "16:00", "16:45", 0), slot("s17", "17:00", "17:45", 1), slot("s18", "18:00", "18:45", 1)],
    activeSlots: 3,
    bookedCount: 2,
    ...overrides,
  };
}

export function rehabBand(overrides: Partial<DayBandDto> = {}): DayBandDto {
  const base = values("09:00", "12:00", 1, ["p-juan", "Juan Gómez"]);
  return {
    templateId: "t-rehab",
    label: "09:00 – 12:00",
    durationMinutes: 60,
    gapMinutes: 0,
    template: base,
    effective: base,
    isOpen: true,
    slots: [
      slot("r09", "09:00", "10:00", 1, { capacity: 1, ...JUAN }),
      slot("r10", "10:00", "11:00", 0, { capacity: 1, ...JUAN }),
      slot("r11", "11:00", "12:00", 1, { capacity: 1, ...JUAN }),
    ],
    activeSlots: 3,
    bookedCount: 2,
    ...overrides,
  };
}

export function individualSlot(overrides: Partial<DayIndividualSlotDto> = {}): DayIndividualSlotDto {
  return {
    ...slot("i1", "12:30", "13:30", 0, { capacity: 2 }),
    service: "recovery",
    professionalId: null,
    professionalName: null,
    ...overrides,
  };
}

export function dayEditor(overrides: Partial<DayEditorDto> = {}): DayEditorDto {
  return {
    from: DAY,
    to: DAY,
    isRange: false,
    editableFrom: "2026-11-10",
    editableTo: "2026-12-10",
    services: [
      { service: "recovery", bands: [morningBand(), afternoonBand()] },
      { service: "rehab", bands: [rehabBand()] },
      { service: "performance", bands: [] },
    ],
    individualSlots: [individualSlot()],
    professionals: [
      { id: "p-ana", name: "Ana Pérez" },
      { id: "p-juan", name: "Juan Gómez" },
    ],
    busyProfessionals: [{ professionalId: "p-juan", startsAt: at("09:00"), endsAt: at("12:00"), slotId: "r09" }],
    ...overrides,
  };
}
