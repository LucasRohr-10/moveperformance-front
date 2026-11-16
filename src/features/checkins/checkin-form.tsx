"use client";

import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { controlClass } from "@/components/ui/field";
import { useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { ApiError } from "@/lib/api/errors";
import type { CheckinAnswersDto, PendingCheckinDto } from "@/lib/api/types";

import {
  type CheckinErrors,
  type CheckinFormValues,
  EMPTY_CHECKIN_FORM,
  validateCheckin,
} from "./checkin-answers";
import { answerCheckin } from "./checkins-api";
import { ChoiceGroup, type ChoiceOption } from "./choice-group";
import { NoPendingCheckin } from "./no-pending-checkin";

type Status = "idle" | "sending" | "sent" | "answered";

const ALREADY_ANSWERED_CODE = "CHECKIN_ALREADY_ANSWERED";
const SEND_FAILED_MESSAGE = "No pudimos enviar tu respuesta. Probá de nuevo.";
// The code the API client gives an error whose body was not JSON (a proxy page, a timeout).
const NON_JSON_ERROR_CODE = "UNKNOWN";

const FEELING_OPTIONS: ChoiceOption<CheckinAnswersDto["feeling"]>[] = [
  { value: "struggling", label: "Me cuesta" },
  { value: "good", label: "Bien" },
  { value: "very_good", label: "Muy bien" },
];
const PAIN_OPTIONS: ChoiceOption<CheckinAnswersDto["pain"]>[] = [
  { value: "none", label: "No" },
  { value: "mild", label: "Sí, leve" },
];
const GOALS_OPTIONS: ChoiceOption<CheckinAnswersDto["goals"]>[] = [
  { value: "same", label: "Siguen igual" },
  { value: "adjust", label: "Quiero ajustarlos" },
];

function DetailField({
  label,
  placeholder,
  value,
  error,
  disabled,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  error: string | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="mt-4">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={controlClass(error)}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const SENT_TITLE = "Respuesta enviada";

/** The monthly check-in of the mockup: three questions, sent once. */
export function CheckinForm({ checkin }: { checkin: NonNullable<PendingCheckinDto["checkin"]> }) {
  const [values, setValues] = useState<CheckinFormValues>(EMPTY_CHECKIN_FORM);
  const [errors, setErrors] = useState<CheckinErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  // A ref, not state: two clicks in the same tick both see the same render's state.
  const isSendingRef = useRef(false);

  const { showSnackbar } = useSnackbar();
  const reportInvalid = useInvalidFieldsFeedback();

  // An answered question loses its error right away; the others keep theirs.
  function set<K extends keyof CheckinFormValues>(field: K, value: CheckinFormValues[K]): void {
    const next = { ...values, [field]: value };
    setValues(next);
    if (!errors[field as keyof CheckinErrors]) return;
    const checked = validateCheckin(next);
    const stillWrong = checked.ok ? undefined : checked.errors[field as keyof CheckinErrors];
    setErrors((current) => ({ ...current, [field]: stillWrong }));
  }

  async function send(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSendingRef.current || status === "sent") return;
    const checked = validateCheckin(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      reportInvalid(event.currentTarget, checked.errors);
      return;
    }

    isSendingRef.current = true;
    setStatus("sending");
    setErrors({});
    try {
      await answerCheckin(checkin.id, checked.answers);
      setStatus("sent");
      showSnackbar({ tone: "success", title: SENT_TITLE });
    } catch (error) {
      if (error instanceof ApiError && error.body.code === ALREADY_ANSWERED_CODE) {
        setFormError(error.body.message);
        setStatus("answered");
      } else {
        showSnackbar({
          tone: "danger",
          title: error instanceof ApiError && error.body.code !== NON_JSON_ERROR_CODE ? error.body.message : SEND_FAILED_MESSAGE,
        });
        setStatus("idle");
      }
    } finally {
      isSendingRef.current = false;
    }
  }

  if (status === "answered") {
    return (
      <NoPendingCheckin>
        <p role="alert" className="mb-2 text-sm text-danger">
          {formError}
        </p>
      </NoPendingCheckin>
    );
  }

  const isLocked = status === "sending" || status === "sent";
  return (
    <Card className="mt-9 max-w-xl">
      <form onSubmit={(event) => void send(event)} noValidate className="space-y-8">
        <ChoiceGroup
          legend="¿Cómo te sentís con el entrenamiento?"
          options={FEELING_OPTIONS}
          value={values.feeling}
          onChange={(value) => set("feeling", value)}
          error={errors.feeling}
          disabled={isLocked}
        />
        <div>
          <ChoiceGroup
            legend="¿Sentiste alguna molestia o dolor?"
            options={PAIN_OPTIONS}
            value={values.pain}
            onChange={(value) => set("pain", value)}
            error={errors.pain}
            disabled={isLocked}
          />
          {values.pain === "mild" ? (
            <DetailField
              label="¿Dónde?"
              placeholder="Contanos dónde (ej.: rodilla derecha)…"
              value={values.painDetail}
              error={errors.painDetail}
              disabled={isLocked}
              onChange={(value) => set("painDetail", value)}
            />
          ) : null}
        </div>
        <div>
          <ChoiceGroup
            legend="¿Cambiaron tus objetivos?"
            options={GOALS_OPTIONS}
            value={values.goals}
            onChange={(value) => set("goals", value)}
            error={errors.goals}
            disabled={isLocked}
          />
          {values.goals === "adjust" ? (
            <DetailField
              label="¿Qué te gustaría cambiar? (opcional)"
              value={values.goalsDetail}
              error={errors.goalsDetail}
              disabled={isLocked}
              onChange={(value) => set("goalsDetail", value)}
            />
          ) : null}
        </div>
        {status === "sent" ? (
          <p role="status" className="text-sm text-success">
            ¡Gracias! El equipo de MOVE revisa tus respuestas.
          </p>
        ) : null}
        <Button type="submit" fullWidth disabled={isLocked} touchTarget>
          {status === "sending" ? "Enviando…" : "Enviar respuesta"}
        </Button>
      </form>
    </Card>
  );
}
