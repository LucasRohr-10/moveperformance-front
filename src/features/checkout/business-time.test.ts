import { afterEach, describe, expect, it, vi } from "vitest";

const originalTz = process.env.TZ;

// The formatters are built when the module loads, so the zone must be set before the import.
async function loadUnderZone(zone: string) {
  process.env.TZ = zone;
  vi.resetModules();
  return import("./business-time");
}

afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
  vi.resetModules();
});

const ZONES = ["UTC", "Pacific/Kiritimati", "America/Montevideo"];

describe.each(ZONES)("under TZ=%s", (zone) => {
  it("shows 10:00 in Montevideo", async () => {
    const { formatSlotDateTime } = await loadUnderZone(zone);

    expect(formatSlotDateTime("2026-10-21T13:00:00.000Z")).toBe("miércoles 21/10 · 10:00 hs");
  });

  it("gives the Montevideo day of an instant that is already tomorrow in UTC", async () => {
    const { businessDateOf } = await loadUnderZone(zone);

    expect(businessDateOf("2026-10-22T02:30:00.000Z")).toBe("2026-10-21");
  });
});
