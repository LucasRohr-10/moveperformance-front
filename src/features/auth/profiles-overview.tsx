import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/cn";

const PROFILES = [
  {
    name: "Visitante",
    description:
      "Consulta servicios, inicia reservas y puede registrarse durante el proceso.",
    highlighted: false,
  },
  {
    name: "Cliente / Alumno",
    description:
      "Gestiona sus planes, pagos, reservas, historial y comunicaciones.",
    highlighted: true,
  },
  {
    name: "Staff MOVE",
    description:
      "Administra clientes, servicios, turnos, asistencias, pagos y seguimientos.",
    highlighted: false,
  },
] as const;

export function ProfilesOverview() {
  return (
    <section className="mx-auto mt-8 max-w-4xl">
      <SectionLabel className="text-center">Perfiles de la plataforma</SectionLabel>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {PROFILES.map((profile) => (
          <div
            key={profile.name}
            className="rounded border border-line bg-card p-6"
          >
            <span
              className={cn(
                "inline-flex rounded border border-line bg-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                profile.highlighted ? "text-white" : "text-muted",
              )}
            >
              {profile.name}
            </span>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {profile.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
