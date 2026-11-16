"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useSnackbar } from "@/components/ui/snackbar";
import { PhoneInput } from "@/features/auth/phone-input";
import { useBusinessToday } from "@/features/auth/use-business-today";
import type { ClientDetail } from "@/lib/api/types";
import { BIRTH_DATE_MIN } from "@/lib/birth-date";

import { clientFieldErrors } from "./client-api-errors";
import { clientProfileChanges, type ClientProfileValues } from "./client-schemas";
import { updateClientProfile } from "./clients-api";

type FieldErrors = Partial<Record<keyof ClientProfileValues, string>>;

const SAVED_MESSAGE = "Datos guardados.";
const NOTHING_TO_SAVE_MESSAGE = "No hay cambios para guardar.";
const SAVE_FAILED_MESSAGE = "No pudimos guardar los datos. Probá de nuevo.";
const FIELDS: (keyof ClientProfileValues)[] = ["name", "lastName", "phone", "birthDate"];

function pickKnownFieldErrors(errors: Partial<Record<string, string>>): FieldErrors {
  const known: FieldErrors = {};
  for (const field of FIELDS) {
    if (errors[field]) known[field] = errors[field];
  }
  return known;
}

export interface EditClientDialogProps {
  client: ClientDetail;
  onSaved(client: ClientDetail): void;
  onClose(): void;
}

export function EditClientDialog({ client, onSaved, onClose }: EditClientDialogProps) {
  const today = useBusinessToday();
  const { showSnackbar } = useSnackbar();
  const [values, setValues] = useState<ClientProfileValues>({
    name: client.name,
    lastName: client.lastName ?? "",
    phone: client.phone ?? "",
    birthDate: client.birthDate ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const fullName = `${client.name} ${client.lastName ?? ""}`.trim();

  function setField(field: keyof ClientProfileValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function save() {
    if (isSaving) return;
    const result = clientProfileChanges(client, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (Object.keys(result.changes).length === 0) {
      showSnackbar({ tone: "info", title: NOTHING_TO_SAVE_MESSAGE });
      onClose();
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      const updated = await updateClientProfile(client.id, result.changes);
      showSnackbar({ tone: "success", title: SAVED_MESSAGE });
      onSaved(updated);
    } catch (error) {
      const apiErrors = pickKnownFieldErrors(clientFieldErrors(error));
      if (Object.keys(apiErrors).length > 0) setErrors(apiErrors);
      else showSnackbar({ tone: "danger", title: SAVE_FAILED_MESSAGE });
      setIsSaving(false);
    }
  }

  return (
    <ConfirmDialog
      title={`Editar datos de ${fullName}`}
      confirmLabel="Guardar"
      isBusy={isSaving}
      onConfirm={() => void save()}
      onCancel={onClose}
    >
      <div className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            name="name"
            autoComplete="off"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            error={errors.name}
          />
          <Input
            label="Apellido"
            name="lastName"
            autoComplete="off"
            value={values.lastName}
            onChange={(event) => setField("lastName", event.target.value)}
            error={errors.lastName}
          />
        </div>
        <PhoneInput value={values.phone} onChange={(value) => setField("phone", value)} error={errors.phone} />
        <Input
          label="Fecha de nacimiento"
          name="birthDate"
          type="date"
          autoComplete="off"
          min={BIRTH_DATE_MIN}
          max={today}
          value={values.birthDate}
          onChange={(event) => setField("birthDate", event.target.value)}
          error={errors.birthDate}
        />
        <div>
          <span className="text-xs font-medium text-muted">Email</span>
          <p className="mt-2 rounded border border-dashed border-line px-3.5 py-2.5 text-sm break-all text-muted">
            {client.email}
          </p>
          <p className="mt-1.5 text-xs text-muted">No se puede cambiar.</p>
        </div>
      </div>
    </ConfirmDialog>
  );
}
