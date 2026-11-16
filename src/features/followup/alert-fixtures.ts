import type { AlertCountsDto, AlertDto, ContactDto, InactivityReasonDto } from "@/lib/api/types";

// Test-only builders for the follow-up specs: one alert and the counters that go with a list.
export function alertFixture(overrides: Partial<AlertDto> = {}): AlertDto {
  return {
    id: "alert-1",
    type: "expiring",
    status: "open",
    client: {
      id: "client-1",
      name: "Ana Pérez",
      initials: "AP",
      phone: "+59899123456",
      email: "ana@example.com",
    },
    planName: "Mensual",
    endsOn: "2026-10-18",
    lastAttendanceOn: "2026-10-08",
    frequencyPerWeek: 2.5,
    usualFrequencyPerWeek: 3,
    contactsCount: 0,
    pause: null,
    checkin: null,
    createdAt: "2026-10-12T08:00:00.000Z",
    ...overrides,
  };
}

export function countsFixture(overrides: Partial<AlertCountsDto> = {}): AlertCountsDto {
  return {
    total: 2,
    expiring: 1,
    expired: 1,
    no_attendance: 0,
    prolonged_inactivity: 0,
    frequency_drop: 0,
    recontact: 0,
    checkin_pain: 0,
    checkin_goals: 0,
    ...overrides,
  };
}

export function pauseFixture(overrides: Partial<InactivityReasonDto> = {}): InactivityReasonDto {
  return {
    id: "pause-1",
    reason: "injury",
    note: null,
    recontactOn: null,
    startedAt: "2026-09-24T12:00:00.000Z",
    endedAt: null,
    createdByName: "Lucía Gómez",
    ...overrides,
  };
}

export function contactFixture(overrides: Partial<ContactDto> = {}): ContactDto {
  return {
    id: "contact-1",
    channel: "whatsapp",
    outcome: "reached",
    note: null,
    staffName: "Lucía Gómez",
    alertType: null,
    createdAt: "2026-10-12T13:00:00.000Z",
    ...overrides,
  };
}
