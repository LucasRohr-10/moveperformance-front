import { birthdayWhatsappText } from "../birthday-text";

// Not a real person: the previews show where the client's name goes.
const PLACEHOLDER_NAME = "Nombre";
const HERO_IMAGE = "/email/birthday-confetti.png";
const SIGNATURE = "— El equipo de MOVE";

// Live previews of what the client receives, side by side (stacked on mobile).
export function BirthdayPreviews({ message }: { message: string }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
      <div className="rounded border border-line bg-soft p-3.5">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Así llega el mail</p>
        <div className="overflow-hidden rounded border border-line bg-card">
          <div
            className="flex h-16 flex-col items-center justify-center border-b border-line bg-black bg-cover bg-center text-center"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          >
            <span className="mb-1 text-[7px] font-semibold uppercase tracking-[0.3em] text-muted">¡Hoy es tu día!</span>
            <b className="font-display text-[15px] leading-none font-black uppercase">
              ¡Feliz cumple, {PLACEHOLDER_NAME}!
            </b>
          </div>
          <div className="px-3 py-2.5 text-[11.5px] leading-normal">
            <p data-testid="mail-preview-message" className="whitespace-pre-line">
              {message}
            </p>
            <p className="mt-2 text-muted">{SIGNATURE}</p>
          </div>
        </div>
      </div>
      <div className="rounded border border-line bg-soft p-3.5">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Así llega el WhatsApp</p>
        <div className="min-h-28 rounded-md bg-[#0b141a] p-3">
          <p
            data-testid="whatsapp-preview"
            className="ml-auto max-w-[88%] rounded-[7px] rounded-tr-none bg-[#005c4b] px-2.5 py-2 text-xs leading-snug whitespace-pre-line text-[#e9edef]"
          >
            {birthdayWhatsappText(PLACEHOLDER_NAME, message)}
          </p>
        </div>
      </div>
    </div>
  );
}
