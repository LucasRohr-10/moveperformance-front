import { describe, expect, it } from "vitest";

import type { AnnouncementDto } from "@/lib/api/types";

import { groupExpiredByMonth } from "./group-expired-by-month";

function announcement(id: string, visibleUntil: string): AnnouncementDto {
  return {
    id,
    body: id,
    visibleUntil,
    createdAt: "2026-09-01T15:00:00.000Z",
    createdByName: "Leo",
    updatedAt: "2026-09-01T15:00:00.000Z",
    updatedByName: null,
  };
}

describe("groupExpiredByMonth", () => {
  it("groups by visibleUntil month newest first", () => {
    const groups = groupExpiredByMonth([
      announcement("sep-30", "2026-09-30"),
      announcement("oct-19", "2026-10-19"),
      announcement("sep-15", "2026-09-15"),
      announcement("ago-1", "2026-08-01"),
    ]);

    expect(groups.map((group) => group.heading)).toEqual(["OCTUBRE 2026", "SEPTIEMBRE 2026", "AGOSTO 2026"]);
    expect(groups[1].items.map((item) => item.id)).toEqual(["sep-30", "sep-15"]);
  });

  it("returns nothing when there are no expired announcements", () => {
    expect(groupExpiredByMonth([])).toEqual([]);
  });

  it("keeps the months of different years apart", () => {
    const groups = groupExpiredByMonth([announcement("a", "2025-12-31"), announcement("b", "2026-12-01")]);

    expect(groups.map((group) => group.heading)).toEqual(["DICIEMBRE 2026", "DICIEMBRE 2025"]);
  });
});
