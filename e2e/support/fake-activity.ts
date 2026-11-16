import type { MyAttendancePageDto } from "@/lib/api/types";

import { E2E_ACTIVITY_SUMMARY, E2E_ATTENDANCE, EMPTY_ACTIVITY_SUMMARY } from "./activity-fixtures";
import { failure, type FakeResponse, UNAUTHENTICATED_RESPONSE } from "./fake-checkout";
import { type ActivityScenario } from "./scenarios";

const SUMMARY_PATH = "/api/v1/me/activity-summary";
const ATTENDANCE_PATH = "/api/v1/me/attendance-history";
const PAGE_SIZE = 20;

export const ACTIVITY_SCENARIOS: readonly string[] = ["activity", "activity-empty"] satisfies ActivityScenario[];

const VALIDATION_FAILED = failure(400, "VALIDATION_FAILED", "Los datos enviados no son válidos.");

const monthOf = (startsAt: string): string => startsAt.slice(0, 7);

// `activity` answers the fixtures; any other signed-in scenario answers a client who never attended,
// so the profile and the history page load without an error card.
export function createActivityStore() {
  return {
    async handle(method: string, url: URL, scenario: string | null): Promise<FakeResponse | null> {
      if (method !== "GET") return null;
      if (url.pathname !== SUMMARY_PATH && url.pathname !== ATTENDANCE_PATH) return null;
      if (!scenario) return UNAUTHENTICATED_RESPONSE;

      const hasActivity = scenario === "activity";
      if (url.pathname === SUMMARY_PATH) {
        return { status: 200, body: hasActivity ? E2E_ACTIVITY_SUMMARY : EMPTY_ACTIVITY_SUMMARY };
      }

      const page = Number(url.searchParams.get("page") ?? 1);
      if (!Number.isInteger(page) || page < 1) return VALIDATION_FAILED;

      const all = hasActivity ? E2E_ATTENDANCE : [];
      const items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      const monthsShown = [...new Set(items.map((item) => monthOf(item.startsAt)))];
      const body: MyAttendancePageDto = {
        items,
        total: all.length,
        page,
        pageSize: PAGE_SIZE,
        months: monthsShown.map((month) => ({
          month,
          attended: all.filter((item) => monthOf(item.startsAt) === month && item.state === "present").length,
        })),
      };
      return { status: 200, body };
    },
  };
}
