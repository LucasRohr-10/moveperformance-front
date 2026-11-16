import { ROUTES } from "@/config/constants/routes.constants";
import type { ServiceType } from "@/lib/api/types";

import type { SessionSegmentsModel, StatusBadgeModel, SubscriptionsModel } from "./present-subscriptions";

// A pack's sessions left, kept in pieces so the banner can give the number its own
// weight instead of burying it in a sentence. The words are the Dashboard's words.
export interface BookingPlanBannerSessions {
  leftValue: string;
  totalText: string;
  caption: string;
  /** Share of the pack still unused, for the progress rule under the count. */
  remainingPercent: number;
}

export interface BookingPlanBannerLine {
  id: string;
  title: string;
  /** A plan's validity line. Empty for a pack, whose `sessions` block says it instead. */
  detail: string;
  sessions: BookingPlanBannerSessions | null;
  badge: StatusBadgeModel;
}

export interface BookingPlanBannerCta {
  text: string;
  href: string;
}

export interface BookingPlanBannerModel {
  lines: BookingPlanBannerLine[];
  emptyCta: BookingPlanBannerCta | null;
}

const NO_PLAN_TEXT = "Sin plan activo.";
const ACTIVE_PACK_BADGE: StatusBadgeModel = { label: "Activo", tone: "success" };

const performancePeriodText = (plan: NonNullable<SubscriptionsModel["performance"]>): string => {
  if (plan.progress) return plan.progress.endText;
  if (plan.periodLine) return `${plan.periodLine.lead}${plan.periodLine.emphasis}`;
  return "";
};

const remainingPercent = (segments: SessionSegmentsModel): number =>
  segments.total > 0 ? Math.round(((segments.total - segments.used) / segments.total) * 100) : 0;

/**
 * Compact "what you have" summary for the booking flow itself (not the full Dashboard
 * card) — reuses SubscriptionsModel so the wording always matches the Dashboard.
 * Null for Rehab (never had a plan concept) and for an anonymous/not-yet-loaded model.
 */
export function presentBookingPlanBanner(
  model: SubscriptionsModel | null,
  service: ServiceType,
): BookingPlanBannerModel | null {
  if (service === "rehab") return null;
  if (!model) return null;

  if (service === "performance") {
    const plan = model.performance;
    if (!plan) return { lines: [], emptyCta: { text: NO_PLAN_TEXT, href: ROUTES.PLANS } };
    return {
      lines: [
        {
          id: "performance",
          title: plan.title,
          detail: performancePeriodText(plan),
          sessions: null,
          badge: plan.badge,
        },
      ],
      emptyCta: null,
    };
  }

  if (model.recoveryPacks.length === 0) {
    return { lines: [], emptyCta: { text: NO_PLAN_TEXT, href: ROUTES.PLANS } };
  }
  return {
    lines: model.recoveryPacks.map((pack) => ({
      id: pack.id,
      title: pack.title,
      detail: "",
      sessions: {
        leftValue: pack.sessionsLeftValue,
        totalText: pack.sessionsTotalText,
        caption: pack.sessionsCaption,
        remainingPercent: remainingPercent(pack.segments),
      },
      badge: pack.badge ?? ACTIVE_PACK_BADGE,
    })),
    emptyCta: null,
  };
}
