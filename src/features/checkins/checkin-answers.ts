import type { CheckinAnswersDto } from "@/lib/api/types";

export interface CheckinFormValues {
  feeling: CheckinAnswersDto["feeling"] | "";
  pain: CheckinAnswersDto["pain"] | "";
  painDetail: string;
  goals: CheckinAnswersDto["goals"] | "";
  goalsDetail: string;
}

// A form whose three questions already have an answer.
export type CompleteCheckinForm = CheckinFormValues & {
  feeling: CheckinAnswersDto["feeling"];
  pain: CheckinAnswersDto["pain"];
  goals: CheckinAnswersDto["goals"];
};

export type CheckinField = "feeling" | "pain" | "painDetail" | "goals" | "goalsDetail";
export type CheckinErrors = Partial<Record<CheckinField, string>>;
export type CheckinValidation = { ok: true; answers: CheckinAnswersDto } | { ok: false; errors: CheckinErrors };

export const EMPTY_CHECKIN_FORM: CheckinFormValues = { feeling: "", pain: "", painDetail: "", goals: "", goalsDetail: "" };

const DETAIL_MAX_LENGTH = 500;
const TOO_LONG = `Usá hasta ${DETAIL_MAX_LENGTH} caracteres.`;

// Only what the answers say is sent: a detail typed before changing the answer is left out.
export function toCheckinAnswers(values: CompleteCheckinForm): CheckinAnswersDto {
  const painDetail = values.painDetail.trim();
  const goalsDetail = values.goalsDetail.trim();
  return {
    feeling: values.feeling,
    pain: values.pain,
    ...(values.pain === "mild" && { painDetail }),
    goals: values.goals,
    ...(values.goals === "adjust" && goalsDetail !== "" && { goalsDetail }),
  };
}

// The front only checks the shape to warn before sending; the API validates the same.
export function validateCheckin(values: CheckinFormValues): CheckinValidation {
  const errors: CheckinErrors = {};
  if (values.feeling === "") errors.feeling = "Elegí cómo te sentís.";
  if (values.pain === "") errors.pain = "Contanos si sentiste alguna molestia.";
  if (values.goals === "") errors.goals = "Contanos si cambiaron tus objetivos.";

  if (values.pain === "mild") {
    const detail = values.painDetail.trim();
    if (detail === "") errors.painDetail = "Contanos dónde sentís la molestia.";
    else if (detail.length > DETAIL_MAX_LENGTH) errors.painDetail = TOO_LONG;
  }
  if (values.goals === "adjust" && values.goalsDetail.trim().length > DETAIL_MAX_LENGTH) {
    errors.goalsDetail = TOO_LONG;
  }

  if (Object.keys(errors).length > 0 || values.feeling === "" || values.pain === "" || values.goals === "") {
    return { ok: false, errors };
  }
  return { ok: true, answers: toCheckinAnswers({ ...values, feeling: values.feeling, pain: values.pain, goals: values.goals }) };
}
