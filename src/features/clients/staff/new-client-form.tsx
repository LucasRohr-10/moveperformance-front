"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fieldErrorFor, useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { useSnackbar } from "@/components/ui/snackbar";
import { ROUTES } from "@/config/constants/routes.constants";
import { PhoneInput } from "@/features/auth/phone-input";
import { useBusinessToday } from "@/features/auth/use-business-today";
import { BIRTH_DATE_MIN } from "@/lib/birth-date";
import { useIsHydrated } from "@/lib/use-is-hydrated";

import {
  CLIENT_ERROR_CODES,
  clientErrorCode,
  clientErrorMessage,
  clientFieldErrors,
} from "./client-api-errors";
import { ClientPasswordField } from "./client-password-field";
import { createClient, findClientIdByEmail } from "./clients-api";
import { newClientSchema, type NewClientValues } from "./client-schemas";

type FieldName = keyof NewClientValues;
type FieldErrors = Partial<Record<FieldName, string>>;

interface EmailNotice {
  message: string;
  /** Record of the client that already has this email and never confirmed it. */
  recordHref: string | null;
}

const EMPTY_VALUES: NewClientValues = {
  name: "",
  lastName: "",
  birthDate: "",
  email: "",
  phone: "",
  password: "",
};

const FIELD_NAMES = Object.keys(EMPTY_VALUES) as FieldName[];
const CREATED_MESSAGE = "Cliente creado.";
const CREATE_FAILED_MESSAGE = "No pudimos crear el cliente. Probá de nuevo.";
const PASSWORD_HELP = "Se ve en claro para que la copies y se la pases al cliente. No le mandamos ningún mail.";
const RECORD_LINK_LABEL = "Abrir su ficha →";

function pickKnownFieldErrors(errors: Partial<Record<string, string>>): FieldErrors {
  const known: FieldErrors = {};
  for (const field of FIELD_NAMES) {
    if (errors[field]) known[field] = errors[field];
  }
  return known;
}

export function NewClientForm() {
  const router = useRouter();
  const today = useBusinessToday();
  const { showSnackbar } = useSnackbar();
  const reportInvalid = useInvalidFieldsFeedback();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<NewClientValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [emailNotice, setEmailNotice] = useState<EmailNotice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();

  function setField(field: FieldName, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    if (field === "email") setEmailNotice(null);
    // A shown error is re-checked on every edit, so it goes away as soon as the field is fixed.
    if (fieldErrors[field]) {
      const error = fieldErrorFor(newClientSchema, nextValues, field);
      setFieldErrors((current) => ({ ...current, [field]: error }));
    }
  }

  async function showTakenEmail(error: unknown, email: string) {
    const isUnconfirmed = clientErrorCode(error) === CLIENT_ERROR_CODES.EMAIL_UNCONFIRMED;
    // The link is a nicety: without the id the message still says what to do.
    const clientId = isUnconfirmed ? await findClientIdByEmail(email).catch(() => null) : null;
    setEmailNotice({
      message: clientErrorMessage(error, CREATE_FAILED_MESSAGE),
      recordHref: clientId ? `${ROUTES.STAFF_CLIENTS}/${clientId}` : null,
    });
  }

  function showFailure(error: unknown) {
    const apiFieldErrors = pickKnownFieldErrors(clientFieldErrors(error));
    if (Object.keys(apiFieldErrors).length === 0) {
      showSnackbar({ tone: "danger", title: CREATE_FAILED_MESSAGE });
      return;
    }
    setFieldErrors(apiFieldErrors);
    reportInvalid(formRef.current, apiFieldErrors);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const parsed = newClientSchema.safeParse(values);
    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      const nextErrors: FieldErrors = {};
      for (const field of FIELD_NAMES) nextErrors[field] = errors[field]?.[0];
      setFieldErrors(nextErrors);
      reportInvalid(formRef.current, nextErrors);
      return;
    }

    setFieldErrors({});
    setEmailNotice(null);
    setIsSubmitting(true);
    try {
      const client = await createClient(parsed.data);
      showSnackbar({ tone: "success", title: CREATED_MESSAGE });
      // Stays "submitting" while the record opens, so the form cannot be sent twice.
      router.push(`${ROUTES.STAFF_CLIENTS}/${client.id}`);
    } catch (error) {
      const code = clientErrorCode(error);
      if (code === CLIENT_ERROR_CODES.EMAIL_TAKEN || code === CLIENT_ERROR_CODES.EMAIL_UNCONFIRMED) {
        await showTakenEmail(error, parsed.data.email);
      } else {
        showFailure(error);
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <form ref={formRef} noValidate onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Nombre"
            name="name"
            type="text"
            autoComplete="off"
            placeholder="Ana"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            error={fieldErrors.name}
          />
          <Input
            label="Apellido"
            name="lastName"
            type="text"
            autoComplete="off"
            placeholder="Pérez"
            value={values.lastName}
            onChange={(event) => setField("lastName", event.target.value)}
            error={fieldErrors.lastName}
          />
        </div>
        <Input
          label="Fecha de nacimiento"
          name="birthDate"
          type="date"
          autoComplete="off"
          min={BIRTH_DATE_MIN}
          max={today}
          value={values.birthDate}
          onChange={(event) => setField("birthDate", event.target.value)}
          error={fieldErrors.birthDate}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          placeholder="cliente@email.com"
          value={values.email}
          onChange={(event) => setField("email", event.target.value)}
          error={fieldErrors.email}
        />
        <PhoneInput
          value={values.phone}
          onChange={(value) => setField("phone", value)}
          error={fieldErrors.phone}
        />
        <div>
          <ClientPasswordField
            value={values.password}
            onChange={(value) => setField("password", value)}
            error={fieldErrors.password}
          />
          <p className="mt-3 text-xs leading-relaxed text-muted">{PASSWORD_HELP}</p>
        </div>
        {emailNotice ? (
          <Notice tone="warning" role="alert">
            {emailNotice.message}
            {emailNotice.recordHref ? (
              <>
                {" "}
                <Link href={emailNotice.recordHref} className="underline underline-offset-2 hover:no-underline">
                  {RECORD_LINK_LABEL}
                </Link>
              </>
            ) : null}
          </Notice>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" touchTarget disabled={isSubmitting || !isHydrated} className="max-sm:w-full">
            {isSubmitting ? "Creando…" : "Crear cliente"}
          </Button>
          <Link href={ROUTES.STAFF_CLIENTS} className="text-xs underline underline-offset-3 hover:no-underline">
            Cancelar
          </Link>
        </div>
      </form>
    </Card>
  );
}
