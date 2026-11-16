import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ROUTES } from "@/config/constants/routes.constants";
import { birthdayWhatsappText } from "@/features/birthdays";
import { formatSlotTime } from "@/features/bookings";
import { whatsappLink } from "@/features/followup";
import { SERVICE_LABELS } from "@/features/payments/staff";
import type { BirthdaysTodayDto } from "@/lib/api/types";

import { BirthdayWhatsappLink } from "./birthday-whatsapp-link";
import { getBirthdaysToday } from "./get-birthdays-today";
import { HoySectionError } from "./hoy-section-error";
import { InfoToggle } from "./info-toggle";

const INFO = "Clientes que cumplen años hoy y tienen una reserva hoy. Es al menos esa cantidad: quien no cargó su fecha de nacimiento no aparece.";

async function loadBirthdays(): Promise<BirthdaysTodayDto | null> {
  try {
    return await getBirthdaysToday();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

type Item = BirthdaysTodayDto["items"][number];

const fullName = ({ name, lastName }: Item): string => (lastName ? `${name} ${lastName}` : name);

/** The thin, full-width card that keeps a birthday from going unnoticed. It does not exist on a day with none. */
export async function BirthdayTodayCard() {
  const data = await loadBirthdays();
  if (!data) return <HoySectionError title="No pudimos cargar los cumpleaños de hoy" />;
  if (data.items.length === 0) return null;

  return (
    <section
      aria-label="Cumpleaños hoy"
      className="flex items-start gap-4 rounded border border-l-2 border-line border-l-warning bg-card px-[18px] py-3"
    >
      <span aria-hidden="true" className="text-[22px] leading-none">
        🎂
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          <h2 className="m-0 text-[length:inherit] font-[inherit] tracking-[inherit]">Cumpleaños hoy</h2>
          <InfoToggle label="Cumpleaños hoy" text={INFO} />
        </div>
        <ul>
          {data.items.map((item) => (
            <li key={item.clientId} className="relative flex flex-wrap items-center gap-x-4 gap-y-2 py-1.5 pr-6 has-focus-visible:ring-2 has-focus-visible:ring-white/40">
              <p className="min-w-0 flex-1 basis-56 font-display text-[19px] leading-tight font-extrabold">
                {/* The name links to the client over the whole line; the WhatsApp link is a sibling above it. */}
                <Link
                  href={`${ROUTES.STAFF_CLIENTS}/${item.clientId}`}
                  className="outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {fullName(item)}
                </Link>{" "}
                <span className="font-sans text-[13px] font-normal text-muted">
                  · cumple {item.age} · {SERVICE_LABELS[item.booking.service]} {formatSlotTime(item.booking.startsAt)}
                </span>
              </p>
              {data.whatsappEnabled && item.phone ? (
                <BirthdayWhatsappLink
                  clientId={item.clientId}
                  href={whatsappLink(item.phone, birthdayWhatsappText(item.name, data.message))}
                  openedAt={item.whatsappOpenedAt}
                />
              ) : null}
              <span aria-hidden="true" className="absolute top-1/2 right-0 -translate-y-1/2 text-base text-muted">
                →
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
