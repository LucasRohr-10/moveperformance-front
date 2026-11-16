import { apiFetchClient, parseJsonOrThrow } from "@/lib/api/client";
import type { CheckinAnswersDto, CheckinFlag } from "@/lib/api/types";

export function answerCheckin(id: string, answers: CheckinAnswersDto): Promise<{ flag: CheckinFlag }> {
  return apiFetchClient(`/api/v1/me/checkins/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answers),
  }).then(parseJsonOrThrow<{ flag: CheckinFlag }>);
}
