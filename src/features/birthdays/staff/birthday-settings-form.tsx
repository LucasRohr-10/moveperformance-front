"use client";

import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { describedBy, Field, controlClass } from "@/components/ui/field";
import { useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import { useSnackbar } from "@/components/ui/snackbar";
import { apiErrorMessage, apiFieldErrors } from "@/features/followup/api-error-message";
import type { BirthdaySettingsDto } from "@/lib/api/types";

import { BIRTHDAY_MESSAGE_MAX_LENGTH, BIRTHDAY_SEND_HOURS, formatSendHour } from "../birthday-text";
import { BirthdayPreviews } from "./birthday-previews";
import { type BirthdaySettingsErrors, validateBirthdaySettings } from "./birthday-settings-values";
import { saveBirthdaySettings } from "./staff-birthdays-api";

const SAVE_FAILED_MESSAGE = "No pudimos guardar el saludo. Probá de nuevo.";

export interface BirthdaySettingsFormProps {
  settings: BirthdaySettingsDto;
  // Mails queued today, for the status line.
  todayMailsSent: number;
  onSaved(settings: BirthdaySettingsDto): void;
}

function mailsSentText(count: number): string {
  return count === 1 ? "Hoy salió 1 mail." : `Hoy salieron ${count} mails.`;
}

export function BirthdaySettingsForm({ settings, todayMailsSent, onSaved }: BirthdaySettingsFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  // A ref, not state: two clicks in the same tick both see the same render's state.
  const isSavingRef = useRef(false);
  const [values, setValues] = useState<BirthdaySettingsDto>(settings);
  const [errors, setErrors] = useState<BirthdaySettingsErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const { showSnackbar } = useSnackbar();
  const showInvalidFields = useInvalidFieldsFeedback();

  function change(patch: Partial<BirthdaySettingsDto>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSavingRef.current) return;

    const found = validateBirthdaySettings(values);
    if (found.message) {
      setErrors(found);
      showInvalidFields(formRef.current, found);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setErrors({});
    try {
      const saved = await saveBirthdaySettings({ ...values, message: values.message.trim() });
      showSnackbar({ tone: "success", title: "Saludo de cumpleaños guardado." });
      onSaved(saved);
    } catch (error) {
      const message = apiFieldErrors(error).message;
      if (message) setErrors({ message });
      else showSnackbar({ tone: "danger", title: apiErrorMessage(error, SAVE_FAILED_MESSAGE) });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  const messageId = `${formId}-message`;
  const counterId = `${formId}-counter`;
  const isActive = settings.emailEnabled || settings.whatsappEnabled;
  return (
    <Card padding="sm">
      <form ref={formRef} onSubmit={(event) => void save(event)} noValidate>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Saludo de cumpleaños</p>
        <Field id={messageId} label="Mensaje" error={errors.message} className="mt-4">
          <textarea
            id={messageId}
            rows={4}
            value={values.message}
            onChange={(event) => change({ message: event.target.value })}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={describedBy(messageId, errors.message, counterId)}
            className={controlClass(errors.message, "leading-relaxed")}
          />
          <p id={counterId} className="mt-1.5 text-right text-xs text-muted">
            {values.message.length}/{BIRTHDAY_MESSAGE_MAX_LENGTH}
          </p>
        </Field>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          En el mail va debajo de <span className="text-white">&quot;¡Feliz cumple, {"{nombre}"}!&quot;</span>. En
          WhatsApp se agrega el saludo con el nombre adelante.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold">Se manda por</legend>
            <div className="flex flex-wrap gap-2.5">
              <ChannelOption
                id={`${formId}-email`}
                label="Mail"
                hint="automático"
                checked={values.emailEnabled}
                onChange={(emailEnabled) => change({ emailEnabled })}
              />
              <ChannelOption
                id={`${formId}-whatsapp`}
                label="WhatsApp"
                hint="con botón"
                checked={values.whatsappEnabled}
                onChange={(whatsappEnabled) => change({ whatsappEnabled })}
              />
            </div>
          </fieldset>
          <div className="w-36">
            <Select
              label="Hora"
              value={String(values.sendHour)}
              onChange={(event) => change({ sendHour: Number(event.target.value) })}
            >
              {BIRTHDAY_SEND_HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatSendHour(hour)}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" touchTarget disabled={isSaving} className="ml-auto">
            Guardar
          </Button>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span
            aria-hidden="true"
            className={isActive ? "size-[7px] rounded-full bg-success" : "size-[7px] rounded-full bg-line-strong"}
          />
          <span>{isActive ? "Activo." : "Apagado."}</span>
          {settings.emailEnabled && todayMailsSent > 0 ? <span>{mailsSentText(todayMailsSent)}</span> : null}
          {settings.whatsappEnabled ? <span>El WhatsApp no sale solo: lo mandás desde la lista de abajo.</span> : null}
        </p>
        <BirthdayPreviews message={values.message} />
      </form>
    </Card>
  );
}

function ChannelOption({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange(checked: boolean): void;
}) {
  return (
    <label
      htmlFor={id}
      className={
        checked
          ? "flex cursor-pointer items-center gap-2 rounded border border-line-strong bg-raised px-3 py-2.5 text-sm"
          : "flex cursor-pointer items-center gap-2 rounded border border-line px-3 py-2.5 text-sm"
      }
    >
      <Checkbox id={id} checked={checked} onChange={onChange} />
      {label} <small className="text-[11px] text-muted">· {hint}</small>
    </label>
  );
}
