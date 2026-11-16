"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ClientDetail } from "@/lib/api/types";

import { ChangePasswordDialog } from "./change-password-dialog";
import { DeactivateClientDialog } from "./deactivate-client-dialog";
import { EditClientDialog } from "./edit-client-dialog";
import { ReactivateClientDialog } from "./reactivate-client-dialog";

type OpenDialog = "edit" | "password" | "deactivate" | "reactivate" | null;

export interface ClientAccountActionsProps {
  client: ClientDetail;
  onClientChange(client: ClientDetail): void;
  /** Reloads the record from the API; used by the actions that can find it already changed (deactivation). */
  onReload(): void;
}

// The account buttons of the client record, for the header's action slot. Only the
// dialog that is open is mounted, so every opening starts from a clean form.
export function ClientAccountActions({ client, onClientChange, onReload }: ClientAccountActionsProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
  const close = () => setOpenDialog(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" touchTarget onClick={() => setOpenDialog("edit")}>
          Editar datos
        </Button>
        <Button type="button" variant="secondary" size="sm" touchTarget onClick={() => setOpenDialog("password")}>
          Cambiar clave
        </Button>
        {client.deactivation ? (
          <Button type="button" size="sm" touchTarget onClick={() => setOpenDialog("reactivate")}>
            Reactivar
          </Button>
        ) : (
          <Button type="button" variant="destructive" size="sm" touchTarget onClick={() => setOpenDialog("deactivate")}>
            Dar de baja
          </Button>
        )}
      </div>
      {openDialog === "edit" ? (
        <EditClientDialog
          client={client}
          onSaved={(updated) => {
            onClientChange(updated);
            close();
          }}
          onClose={close}
        />
      ) : null}
      {openDialog === "password" ? <ChangePasswordDialog client={client} onClose={close} /> : null}
      {openDialog === "deactivate" ? (
        <DeactivateClientDialog
          client={client}
          onDeactivated={(updated) => {
            onClientChange(updated);
            close();
          }}
          onStale={onReload}
          onClose={close}
        />
      ) : null}
      {openDialog === "reactivate" ? (
        <ReactivateClientDialog
          client={client}
          onReactivated={(updated) => {
            onClientChange(updated);
            close();
          }}
          onStale={onReload}
          onClose={close}
        />
      ) : null}
    </>
  );
}
