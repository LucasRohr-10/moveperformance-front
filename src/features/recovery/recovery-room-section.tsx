"use client";

import Image from "next/image";
import { useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { Heading } from "@/components/ui/heading";
import { cn } from "@/lib/cn";

interface RecoveryTool {
  name: string;
  description: string;
  photo: { src: string; alt: string };
}

// Only 3 of the 5 tools have their own photo today (shot during the room's build-out).
// Botas de presoterapia and Meditación y respiración fall back to the room's general shot
// until dedicated photography exists — flagged here rather than silently mismatched.
const ROOM_PHOTO = { src: "/img/recovery/recovery-zero-gravity-chair.jpg", alt: "Recovery Room by MOVE" };

const TOOLS: readonly RecoveryTool[] = [
  {
    name: "Botas de presoterapia",
    description:
      "Compresión secuencial que favorece el retorno venoso y linfático y reduce la sensación de piernas cargadas.",
    photo: ROOM_PHOTO,
  },
  {
    name: "Luz roja e infrarroja",
    description: "Fotobiomodulación para acompañar la recuperación muscular y celular.",
    photo: {
      src: "/img/recovery/recovery-luz-roja-panel.jpg",
      alt: "Panel de luz roja e infrarroja del Recovery Room by MOVE",
    },
  },
  {
    name: "Sauna infrarrojo",
    description: "Calor infrarrojo que ayuda a relajar la musculatura y a la termorregulación.",
    photo: {
      src: "/img/recovery/recovery-sauna-infrarrojo.jpg",
      alt: "Sauna infrarrojo del Recovery Room by MOVE",
    },
  },
  {
    name: "Meditación y respiración",
    description: "Prácticas guiadas para bajar revoluciones y regular el sistema nervioso.",
    photo: ROOM_PHOTO,
  },
  {
    name: "Sillón de gravedad cero",
    description: "Posición que descarga la columna y las piernas para un descanso profundo.",
    photo: {
      src: "/img/recovery/recovery-zero-gravity-chair.jpg",
      alt: "Sillón de gravedad cero del Recovery Room by MOVE",
    },
  },
];

const DESCRIPTION =
  "Un concepto nuevo en Uruguay: un espacio diseñado para optimizar la recuperación física y mental, combinando distintas tecnologías y estrategias basadas en evidencia para ayudar al cuerpo a recuperarse mejor. Cada herramienta actúa sobre un mecanismo diferente; juntas crean el entorno ideal para favorecer la recuperación, disminuir la fatiga, regular el sistema nervioso y ayudarte a sentirte y rendir mejor.";

/**
 * The interactive "Recovery Room" feature tour: a list of the room's tools, each one
 * crossfading in its own photo on hover/click. The accent red (`#e3262f`) and the
 * number/name/photo treatment are a one-off "novedad" look, not the site's monochrome
 * brand palette — kept local to this component rather than promoted to a design token.
 */
export function RecoveryRoomSection() {
  const [active, setActive] = useState(0);
  const activeTool = TOOLS[active];

  return (
    <section className="border-t border-line bg-bg text-white">
      <PageContainer>
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-muted">
              <span className="size-2 rounded-full bg-[#e3262f]" />
              04 — Novedad
            </div>
            <Heading as="h2" size="lg" className="text-3xl">
              Recovery Room
            </Heading>
            <p className="text-xs uppercase tracking-[0.3em] text-[#6b6b6b]">by Move</p>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">{DESCRIPTION}</p>
        </div>

        <div className="mt-10 grid items-stretch gap-x-16 gap-y-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]">
          <div className="relative min-h-[520px] overflow-hidden rounded border border-[#1f1f1f] bg-[#0d0d0d]">
            {TOOLS.map((tool, index) => (
              <div
                key={tool.name}
                className={cn(
                  "absolute inset-0 transition-opacity duration-[450ms] ease-in-out",
                  index === active ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <Image
                  src={tool.photo.src}
                  alt={tool.photo.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
            <div className="absolute bottom-5 left-5 flex items-baseline gap-3 bg-black/75 px-3 py-2">
              <span className="font-display text-[13px] text-[#e3262f]">{String(active + 1).padStart(2, "0")}</span>
              <span className="text-xs font-semibold tracking-[0.18em] uppercase">{activeTool.name}</span>
            </div>
          </div>

          <div className="flex flex-col border-t border-[#2a2a2a]">
            {TOOLS.map((tool, index) => {
              const isActive = index === active;
              return (
                <button
                  key={tool.name}
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => setActive(index)}
                  className="grid cursor-pointer grid-cols-[48px_1fr_24px] items-start gap-4 border-b border-[#2a2a2a] py-6 text-left"
                >
                  <span
                    className={cn(
                      "pt-1.5 font-display text-sm transition-colors duration-300",
                      isActive ? "text-[#e3262f]" : "text-[#5a5a5a]",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex flex-col gap-2.5">
                    <span
                      className={cn(
                        "font-display text-[clamp(20px,2.2vw,28px)] leading-[1.05] uppercase transition-colors duration-300",
                        isActive ? "text-white" : "text-[#6b6b6b]",
                      )}
                    >
                      {tool.name}
                    </span>
                    <span
                      className={cn(
                        "grid transition-[grid-template-rows] duration-[400ms] ease-in-out",
                        isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <span className="max-w-[460px] overflow-hidden text-[15px] leading-[1.6] text-[#a8a8a8]">
                        {tool.description}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "pt-1.5 text-xl leading-none transition-all duration-300",
                      isActive ? "rotate-45 text-white" : "text-[#6b6b6b]",
                    )}
                  >
                    +
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
