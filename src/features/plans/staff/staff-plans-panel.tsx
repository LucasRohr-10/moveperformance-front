"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StaffPageHeader } from "@/components/layout/staff-page";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSnackbar } from "@/components/ui/snackbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/config/constants/routes.constants";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/money";
import type { StaffPlanDto } from "@/lib/api/types";

import { PLAN_KIND_FIELDS } from "./plan-kind-fields";
import { deletePlan, listStaffPlans, updatePlan } from "./staff-plans-api";

type LoadStatus = "loading" | "ready" | "error";

const NEW_PLAN_HREF = `${ROUTES.STAFF_PLANS}/new`;
const NEW_PLAN_CLASS = buttonVariants({ variant: "primary", touchTarget: true });

const ACTION_FAILED_MESSAGE = "No pudimos completar la acción. Probá de nuevo.";

function NewPlanLink() {
  return (
    <Link href={NEW_PLAN_HREF} className={NEW_PLAN_CLASS}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" className="size-4">
        <path d="M8 3v10M3 8h10" />
      </svg>
      Nuevo plan
    </Link>
  );
}

/** A colored dot + text, matching the approved design's status treatment (no bordered chip). */
function PlanStatus({ active }: { active: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", active ? "text-success" : "text-muted")}>
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", active ? "bg-success" : "border border-current bg-transparent")}
      />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}

/** A row of pulsing cells, so the load has the shape of the table it replaces. */
function LoadingRows() {
  return (
    <TableBody>
      {[0, 1, 2].map((row) => (
        <TableRow key={row}>
          <TableCell>
            <Skeleton className="h-4 w-32 bg-line" />
            <Skeleton className="mt-1.5 h-3 w-20 bg-line" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24 bg-line" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16 bg-line" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16 bg-line" />
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
    </TableBody>
  );
}

export function StaffPlansPanel() {
  const [plans, setPlans] = useState<StaffPlanDto[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const { showSnackbar } = useSnackbar();
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<StaffPlanDto | null>(null);

  const fetchPlans = () =>
    listStaffPlans()
      .then((loaded) => {
        setPlans(loaded);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));

  /** A retry or a reload after writing: show the skeleton again. */
  const reload = () => {
    setStatus("loading");
    return fetchPlans();
  };

  useEffect(() => {
    void fetchPlans();
  }, []);

  async function runAction(
    planId: string,
    action: () => Promise<unknown>,
    onSuccess?: (result: unknown) => void,
  ) {
    if (pendingPlanId) return;
    setPendingPlanId(planId);
    try {
      const result = await action();
      onSuccess?.(result);
    } catch {
      showSnackbar({ tone: "danger", title: ACTION_FAILED_MESSAGE });
      await reload();
    }
    setPendingPlanId(null);
  }

  const toggleActive = (plan: StaffPlanDto) =>
    runAction(
      plan.id,
      () => updatePlan(plan.id, { isActive: !plan.isActive }),
      (result) => {
        const updatedPlan = result as StaffPlanDto;
        setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
        showSnackbar({ tone: "success", title: updatedPlan.isActive ? "Plan activado" : "Plan desactivado" });
      },
    );

  async function confirmDelete() {
    const plan = planToDelete;
    if (!plan) return;
    setPlanToDelete(null);
    if (pendingPlanId) return;
    setPendingPlanId(plan.id);
    try {
      await deletePlan(plan.id);
      await reload();
      showSnackbar({ tone: "success", title: "Plan eliminado" });
    } catch {
      showSnackbar({ tone: "danger", title: ACTION_FAILED_MESSAGE });
    }
    setPendingPlanId(null);
  }

  const description =
    status === "ready" && plans.length > 0
      ? `${plans.length} ${plans.length === 1 ? "plan" : "planes"} · ${
          plans.filter((plan) => plan.isActive).length
        } activos. Tocá un plan para editarlo.`
      : undefined;

  return (
    <div className="space-y-6">
      <StaffPageHeader title="Planes" description={description} action={<NewPlanLink />} />

      <Card padding="none">
        {status === "error" ? (
          <EmptyState
            title="No pudimos cargar los planes"
            description="Puede ser un problema temporario del servidor."
            role="alert"
            action={
              <Button variant="secondary" touchTarget onClick={reload}>
                Reintentar
              </Button>
            }
          />
        ) : status === "ready" && plans.length === 0 ? (
          <EmptyState
            title="Todavía no hay planes"
            description="Creá el primero para que se ofrezca en la web."
            action={<NewPlanLink />}
          />
        ) : (
          <>
          {status === "loading" ? (
            <p role="status" className="sr-only">
              Cargando planes…
            </p>
          ) : null}
          <Table caption="Planes">
            <TableHeader>
              <TableHeaderCell>Plan</TableHeaderCell>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell align="right">Precio</TableHeaderCell>
              <TableHeaderCell>Estado</TableHeaderCell>
              <TableHeaderCell align="right">
                <span className="sr-only">Acciones</span>
              </TableHeaderCell>
            </TableHeader>
            {status === "loading" ? (
              <LoadingRows />
            ) : (
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <Link
                        href={`${ROUTES.STAFF_PLANS}/${plan.id}`}
                        className="block font-medium underline underline-offset-2 hover:no-underline"
                      >
                        {plan.name}
                      </Link>
                      <span className="block text-xs text-muted">{plan.slug}</span>
                    </TableCell>
                    <TableCell className="text-muted">
                      {PLAN_KIND_FIELDS[plan.kind].label}
                    </TableCell>
                    <TableCell align="right" className="whitespace-nowrap">
                      {formatPrice(plan.price)}
                    </TableCell>
                    <TableCell>
                      {/* An inactive plan is a neutral state, not an error: it
                          stops being offered on the web, nothing failed. */}
                      <PlanStatus active={plan.isActive} />
                    </TableCell>
                    <TableCell align="right" className="whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          touchTarget
                          className="w-28"
                          disabled={pendingPlanId === plan.id}
                          onClick={() => toggleActive(plan)}
                        >
                          {plan.isActive ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          touchTarget
                          className="text-danger hover:bg-danger/10 hover:text-danger"
                          disabled={pendingPlanId === plan.id}
                          onClick={() => setPlanToDelete(plan)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
          </>
        )}
      </Card>

      {planToDelete ? (
        <ConfirmDialog
          title={`¿Eliminar el plan «${planToDelete.name}»?`}
          description="Deja de verse en la web y en este listado. Los clientes que ya lo compraron mantienen su plan."
          confirmLabel="Eliminar plan"
          tone="destructive"
          isBusy={pendingPlanId === planToDelete.id}
          onConfirm={confirmDelete}
          onCancel={() => setPlanToDelete(null)}
        />
      ) : null}
    </div>
  );
}
