import { useId } from "react";

const CALENDAR_RULES = [
  'Un evento marcado como "Ocupado" bloquea los turnos que se pisan con él. Si lo borrás o lo pasás a "Libre", el turno se libera solo.',
  "Un evento de todo el día bloquea todos los turnos de ese día, desde las 00:00 hasta las 23:59. Si algo dura unas horas, cargalo con hora de inicio y fin.",
  'Los recordatorios de todo el día (cumpleaños, trámites) dejalos en "Libre".',
  "Los eventos que rechazaste no bloquean.",
  "Las reservas que MOVE agrega a tu calendario no bloquean nada.",
  "Si ya había una reserva en ese horario, no se cancela: le llega un mail al dueño del calendario para revisarla.",
  "Si Google falla, los turnos bloqueados siguen bloqueados.",
];

// What Staff needs to know to use Google Calendar with MOVE. Fixed text: the rules live in the
// backend, this only explains them.
export function CalendarRules() {
  const titleId = useId();
  return (
    <div className="space-y-2 border-t border-line pt-4">
      <h3 id={titleId} className="text-sm font-medium">
        Cómo funciona
      </h3>
      <ul aria-labelledby={titleId} className="list-disc space-y-1 pl-5 text-sm text-muted">
        {CALENDAR_RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}
