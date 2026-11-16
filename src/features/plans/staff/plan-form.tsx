"use client";

import { type FormEvent, type ReactNode, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Field, controlClass, fieldErrorId } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useInvalidFieldsFeedback } from "@/components/ui/form-feedback";
import { useSnackbar } from "@/components/ui/snackbar";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import type { PlanKind, StaffPlanDto } from "@/lib/api/types";

import { PLAN_KIND_FIELDS, PLAN_KINDS } from "./plan-kind-fields";
import {
  EMPTIED_KIND_FIELDS,
  fieldErrorsFrom,
  type PlanFormErrors,
  slugFromName,
  toFormValues,
  toPlanInput,
  toPlanPatch,
  validatePlanForm,
} from "./plan-form-values";
import { createPlan, updatePlan } from "./staff-plans-api";

const UNAVAILABLE_MESSAGE = "No pudimos guardar el plan. Probá de nuevo en unos minutos.";

export interface PlanFormProps {
  /** Without a plan the form creates one; with a plan it edits it. */
  plan?: StaffPlanDto;
  onSaved: (plan: StaffPlanDto) => void;
  onCancel: () => void;
}

/** A labelled group of fields, so the form reads as sections instead of one long list. */
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 border-t border-line pt-8 first:border-t-0 first:pt-0 md:grid-cols-[200px_1fr] md:gap-6">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4 shrink-0 text-muted"
    >
      <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

export function PlanForm({ plan, onSaved, onCancel }: PlanFormProps) {
  const id = useId();
  const [values, setValues] = useState(() => toFormValues(plan));
  const [isSlugEdited, setIsSlugEdited] = useState(Boolean(plan));
  const [errors, setErrors] = useState<PlanFormErrors>({});
  const { showSnackbar } = useSnackbar();
  const reportInvalid = useInvalidFieldsFeedback();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const kind = values.kind as PlanKind;

  // A field in error loses it as soon as the new value passes the same format checks as the submit.
  function setValue(key: string, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: validatePlanForm(next)[key] }));
  }

  function changeName(name: string) {
    setValues((current) => ({
      ...current,
      name,
      ...(isSlugEdited ? {} : { slug: slugFromName(name) }),
    }));
  }

  function changeSlug(slug: string) {
    setIsSlugEdited(true);
    setValue("slug", slug);
  }

  function changeKind(nextKind: string) {
    setValues((current) => ({ ...current, ...EMPTIED_KIND_FIELDS, kind: nextKind }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(EMPTIED_KIND_FIELDS)) delete next[key];
      return next;
    });
  }

  async function save(): Promise<StaffPlanDto | null> {
    if (!plan) return createPlan(toPlanInput(values));

    const patch = toPlanPatch(values, plan);
    if (Object.keys(patch).length === 0) {
      showSnackbar({ tone: "info", title: "No hay cambios para guardar." });
      return null;
    }
    return updatePlan(plan.id, patch);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formatErrors = validatePlanForm(values);
    setErrors(formatErrors);
    if (Object.keys(formatErrors).length > 0) {
      reportInvalid(event.currentTarget, formatErrors);
      return;
    }

    // Read before the await: React clears currentTarget once the handler returns.
    const form = event.currentTarget;
    setIsSubmitting(true);
    try {
      const saved = await save();
      if (saved) {
        showSnackbar({ tone: "success", title: plan ? "Cambios guardados." : "Plan creado" });
        onSaved(saved);
      }
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error);
      setErrors(fieldErrors);
      reportInvalid(form, fieldErrors);
      if (Object.keys(fieldErrors).length === 0) {
        showSnackbar({ tone: "danger", title: error instanceof ApiError ? error.message : UNAVAILABLE_MESSAGE });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <FormSection
          title="Tipo de plan"
          description="Define el servicio y los datos que pide el resto del formulario."
        >
          {plan ? (
            <div>
              <span className="text-xs font-medium text-muted">Tipo de plan</span>
              <div
                className="mt-2 flex items-center justify-between gap-3 rounded border border-dashed border-line px-3.5 py-2.5 text-sm"
                aria-describedby={`${id}-kind-locked`}
              >
                <span>{PLAN_KIND_FIELDS[kind].label}</span>
                <LockIcon />
              </div>
              <p id={`${id}-kind-locked`} className="mt-1.5 text-xs text-muted">
                No se puede cambiar una vez creado el plan.
              </p>
            </div>
          ) : (
            <div>
              <Select
                id={`${id}-kind`}
                label="Tipo de plan"
                error={errors.kind}
                value={kind}
                onChange={(event) => changeKind(event.target.value)}
              >
                {PLAN_KINDS.map((planKind) => (
                  <option key={planKind} value={planKind}>
                    {PLAN_KIND_FIELDS[planKind].label}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-xs text-muted">{PLAN_KIND_FIELDS[kind].description}</p>
            </div>
          )}
        </FormSection>

        <FormSection title="Datos básicos" description="Cómo se llama el plan en la web y en el panel.">
          <div className="grid gap-6 md:grid-cols-2">
            <Input label="Nombre" value={values.name} onChange={(event) => changeName(event.target.value)} error={errors.name} />
            <Input label="Identificador" value={values.slug} onChange={(event) => changeSlug(event.target.value)} error={errors.slug} />
          </div>
        </FormSection>

        <FormSection title="Precio y duración" description="Cuánto cuesta el plan y cuánto tiempo de acceso da.">
          <div className="grid gap-6 md:grid-cols-2">
            <Field id={`${id}-price`} label="Precio (pesos)" error={errors.price}>
              <div className="mt-2 flex">
                <span
                  aria-hidden="true"
                  className="flex items-center rounded-l border border-r-0 border-line bg-soft px-3 text-sm text-muted"
                >
                  $
                </span>
                <input
                  id={`${id}-price`}
                  inputMode="numeric"
                  value={values.price}
                  onChange={(event) => setValue("price", event.target.value)}
                  aria-invalid={Boolean(errors.price)}
                  aria-describedby={errors.price ? fieldErrorId(`${id}-price`) : undefined}
                  className={cn(controlClass(errors.price), "mt-0 rounded-none border-x-0 text-right")}
                />
                <span
                  aria-hidden="true"
                  className="flex items-center rounded-r border border-l-0 border-line bg-soft px-3 text-sm text-muted"
                >
                  UYU
                </span>
              </div>
            </Field>
            {PLAN_KIND_FIELDS[kind].fields.map(({ name, label, isOptional }) => (
              <Input
                key={name}
                label={label}
                inputMode="numeric"
                placeholder={isOptional ? "Opcional" : undefined}
                value={values[name]}
                onChange={(event) => setValue(name, event.target.value)}
                error={errors[name]}
              />
            ))}
          </div>
        </FormSection>

        <FormSection title="Contenido" description="Texto que ve el cliente al elegir el plan.">
          <Field id={`${id}-description`} label="Descripción" error={errors.description}>
            <textarea
              id={`${id}-description`}
              rows={2}
              value={values.description}
              onChange={(event) => setValue("description", event.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? fieldErrorId(`${id}-description`) : undefined}
              className={controlClass(errors.description)}
            />
          </Field>
          <Field id={`${id}-features`} label="Características (una por línea)" error={errors.features}>
            <textarea
              id={`${id}-features`}
              rows={4}
              value={values.features}
              onChange={(event) => setValue("features", event.target.value)}
              aria-invalid={Boolean(errors.features)}
              aria-describedby={errors.features ? fieldErrorId(`${id}-features`) : undefined}
              className={controlClass(errors.features)}
            />
          </Field>
        </FormSection>

        <FormSection title="Visibilidad y cobro" description="Dónde aparece el plan y cómo se puede pagar.">
          <div className="flex flex-wrap items-end gap-6">
            <Input
              label="Orden"
              inputMode="numeric"
              className="w-28"
              value={values.sortOrder}
              onChange={(event) => setValue("sortOrder", event.target.value)}
              error={errors.sortOrder}
            />
            <label htmlFor={`${id}-featured`} className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm">
              <Checkbox
                id={`${id}-featured`}
                checked={values.featured === "true"}
                onChange={(checked) => setValue("featured", String(checked))}
              />
              Destacado
            </label>
          </div>

          {PLAN_KIND_FIELDS[kind].allowsAutoDebit ? (
            <div className="flex items-start justify-between gap-4 border-t border-line pt-6">
              <div>
                <label htmlFor={`${id}-auto-debit`} className="text-sm font-medium">
                  Permite débito automático
                </label>
                <p id={`${id}-auto-debit-help`} className="mt-1.5 text-xs text-muted">
                  El cliente puede pagarlo con un cobro automático de Mercado Pago.
                </p>
                {errors.autoDebitEnabled ? (
                  <p id={`${id}-auto-debit-error`} className="mt-1.5 text-xs text-danger">
                    {errors.autoDebitEnabled}
                  </p>
                ) : null}
              </div>
              <Switch
                id={`${id}-auto-debit`}
                label="Permite débito automático"
                checked={values.autoDebitEnabled === "true"}
                onChange={(checked) => setValue("autoDebitEnabled", String(checked))}
                describedBy={cn(`${id}-auto-debit-help`, errors.autoDebitEnabled && `${id}-auto-debit-error`)}
                hasError={Boolean(errors.autoDebitEnabled)}
              />
            </div>
          ) : null}
        </FormSection>
        <div className="-mx-7 -mb-7 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-soft px-7 py-4">
          <p className="text-xs text-muted">
            {plan ? "Los cambios se aplican a nuevas compras." : "El plan se crea activo."}
          </p>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar plan"}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
