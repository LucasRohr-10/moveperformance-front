"use client";

import { useRouter } from "next/navigation";

import { ROUTES } from "@/config/constants/routes.constants";

import { PlanForm } from "./plan-form";

export function NewPlanPanel() {
  const router = useRouter();

  return (
    <PlanForm
      onSaved={() => router.push(ROUTES.STAFF_PLANS)}
      onCancel={() => router.push(ROUTES.STAFF_PLANS)}
    />
  );
}
