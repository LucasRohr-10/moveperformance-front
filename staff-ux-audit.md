# Panel Staff — Diagnóstico UX/UI de las 9 pantallas

> Auditoría del flujo staff de `moveperformance-front` al 2026-10-21.
> Complementa `moveperformance-front-design-system.md` (sistema de diseño extraído del código).

---

## Diagnóstico de fondo

El panel staff no está "feo": está **construido con primitivos de landing page**.

`Heading` llega hasta `text-6xl`, `Button` es 10px en mayúsculas con `tracking-[0.2em]`,
`Card` tiene `p-7` fijo, y la elevación es borde de 1px sin sombras. Ese lenguaje funciona en
Performance / Rehab / Recovery, donde hay pocos elementos y mucho aire. Un panel de gestión
necesita lo contrario: densidad, jerarquía de tabla, estados de carga, acciones diferenciadas.

De ahí sale casi todo lo demás. **No existen los primitivos que un panel necesita**:
`Table`, `Select`, `Dialog`, `EmptyState`, `Skeleton`, `Pagination`, `Toast`. Cada pantalla los
resuelve a mano, y por eso ninguna se parece del todo a la anterior.

### Dos niveles de madurez conviviendo

El área staff tiene dos estándares distintos, y la diferencia se ve a simple vista:

| | **`features/followup`** (maduro) | **El resto** (funcional pero crudo) |
|---|---|---|
| Estados de datos | loading + error + empty + success, todos | parcial o ninguno |
| Labels de formulario | `Field` con `htmlFor` + `aria-describedby` | faltan en los `<select>` |
| Touch targets | `min-h-11 sm:min-h-0` explícito | ninguno (botones de ~26px) |
| Foco | se devuelve al botón al cerrar el form | sin manejo |
| ARIA | `aria-expanded`, `aria-pressed`, `role="status"` | solo `role="alert"` |
| Reintento ante error | botón "Reintentar" | no hay |

**`features/followup` es la referencia a replicar.** No hay que inventar un estándar: ya está
escrito en el repo. El trabajo es subir las otras 8 pantallas a ese nivel.

---

## Pantalla por pantalla

### 1. `/staff` — Dashboard · 🔴 crítico

```
Hola, {nombre}.
┌──────────────────────────────┐
│ El panel de gestión está en  │
│ construcción.                │
└──────────────────────────────┘
```

Es lo primero que ve el staff al entrar y **está vacío**. No hay métricas, ni turnos de hoy,
ni alertas pendientes, ni accesos rápidos. Toda la información para armarlo ya existe en los
endpoints que consumen las otras pantallas: turnos del día (`/staff/time-slots?date=`),
contadores de alertas (ya alimentan los chips de seguimiento), clientes.

**Mayor impacto por esfuerzo de las 9.** Hoy obliga a usar el sidebar como único punto de
partida.

---

### 2. `/staff/clients` — Clientes · 🔴 crítico

- **Dos columnas son texto placeholder.** "Pagos" y "Seguimiento" renderizan literalmente
  `"Próximamente"` en cada fila (`clients-panel.tsx:88-89`). Siete columnas de las cuales dos
  no son datos. La tabla se lee como una maqueta.
- **Sin estado vacío.** Si la búsqueda no trae nada, queda el `<thead>` solo, flotando.
  Sin "no hay resultados", sin sugerencia de limpiar el filtro.
- **Sin estado de carga.** El `useEffect` inicial no setea nada: la tabla aparece vacía y
  después se llena de golpe.
- **Sin paginación, ni en front ni en back.** `listClients()` pide el array completo y
  `ClientsController.list()` lo devuelve entero. Con 300 clientes esto es una tabla de 300
  filas en una sola pantalla.
  *(Nota aparte, no es UI: `ClientsQueryService.list()` hace 2 queries por cliente dentro de
  un `Promise.all` — N+1. Con el crecimiento esto se vuelve el cuello de botella real del
  tiempo de carga. Lo marco, no lo toco.)*
- **La búsqueda exige submit.** Hay que tipear y apretar "Buscar". Sin debounce, sin estado
  pending en el botón, sin limpiar.
- **La tabla desborda en mobile.** Siete columnas sin `overflow-x-auto` dentro de un `Card`
  con `p-7`. A 375px se rompe el layout de la página.
- **Celdas sin padding horizontal** (estilo A): el nombre queda pegado al borde interno de la
  tarjeta.

---

### 3. `/staff/clients/[id]` — Ficha de cliente · 🟠 alto

- **Pantalla en blanco mientras carga.** `if (!client) return null` (`client-detail-panel.tsx:37`).
  No es un vacío de un instante: es un fetch de cliente que puede tardar, y durante todo ese
  tiempo la pantalla muestra el título y nada más debajo.
- **Doble H1.** La página ya renderiza `<Heading as="h1">Ficha de cliente</Heading>` y el panel
  renderiza *otro* `<h1 className="text-xl font-semibold">` con el nombre. Dos `h1` en el
  documento, y el nombre del cliente —el dato más importante— sale en el más chico de los dos.
- **"Pagos: Próximamente"** otra vez como contenido.
- **El historial de reservas no tiene estado vacío.** Cliente nuevo → tabla con encabezados y
  nada.
- **Sin navegación de vuelta.** No hay breadcrumb ni "← Clientes"; solo el botón del browser.

---

### 4. `/staff/schedule` — Turnos y asistencia · 🔴 crítico

Tres paneles distintos apilados (`Profesionales`, `Templates de turnos`, `Asistencia`) en una
sola ruta. Es la pantalla más cargada y la que peor está.

- **5 `<select>` sin label** en el formulario de templates (`templates-panel.tsx:106-137`).
  Una fila de dropdowns donde servicio, día, hora, duración y profesional no se identifican.
  El único control con label es "Cupo" (usa el primitivo `Input`), y justamente por eso
  **desalinea la grilla**: `Input` dibuja una fila de label arriba y los `<select>` no, así
  que en el `grid-cols-2 md:grid-cols-4` los controles no comparten línea de base.
- **Los `<select>` tienen una copia derivada del estilo de input**: `px-3 py-2` contra el
  `px-3.5 py-2.5` del primitivo, sin estilo de foco ni de placeholder. Tercera copia del mismo
  string de clases en el repo.
- **48 opciones de hora en un `<select>` nativo.** `TIME_OPTIONS` genera las 24h cada 30min.
  Scrollear 48 ítems para elegir "19:00".
- **Sin confirmación al eliminar un template.** `handleRemove` borra directo, sin preguntar y
  sin deshacer. Un template genera turnos recurrentes: es la acción más destructiva de la
  pantalla y es la que menos fricción tiene.
- **`professionals-panel` no maneja errores en absoluto.** Ni `refresh()` en el `useEffect`,
  ni `handleCreate`, ni `toggleActive` tienen `catch`. Si la API falla, la promesa queda sin
  manejar y la UI no dice nada: el usuario aprieta "Agregar" y no pasa nada visible.
- **El listado de templates tampoco tiene catch, ni empty, ni loading.**
- **Los tres `<h2>` de sección** son `text-sm uppercase text-muted` — más chicos y más tenues
  que el contenido que encabezan. La jerarquía está invertida.
- **Navegación por día sin calendario.** "← Día anterior / Día siguiente →" con la fecha
  cruda en formato ISO (`2026-10-21`) en el medio. Para ir a la semana que viene son 7 clicks.

---

### 5. `/staff/schedule/[slotId]` — Asistencia del turno · 🟠 alto

Esta es **la pantalla que más se usa en el día a día** (se marca asistencia en cada turno) y
es la que menos feedback da.

- **Marcar asistencia no tiene estado pendiente.** `handleMark` hace `await markAttendance()`
  y después `await refresh()` — dos round-trips sin ningún indicador. Los botones siguen
  habilitados, no hay spinner, no hay confirmación. En un turno de 15 personas no se distingue
  a quién ya marcaste.
- **El estado actual no se refleja en los controles.** "Presente" y "Ausente" son ambos
  `variant="secondary"`, idénticos, estén o no seleccionados. El estado solo se lee en la
  columna de texto de al lado.
- **Tres botones de ~26px por fila**, uno al lado del otro, sin `min-h-11`. En mobile —donde
  realmente se marca asistencia, con el teléfono en la mano— son objetivos de toque muy chicos
  y muy juntos. Riesgo real de marcar "No-show" queriendo marcar "Ausente".
- **Sin estado vacío ni de carga.** Turno sin reservas → tabla vacía con encabezados.
- **El título no dice de qué turno se trata.** Dice "Asistencia del turno", sin hora, sin
  servicio, sin profesional. Hay que acordarse desde dónde se entró.
- **Acción destructiva sin diferenciar:** "No-show" es `ghost`, igual que cualquier acción
  terciaria.

---

### 6. `/staff/plans` — Planes · 🟡 medio

Irónicamente **la tabla mejor resuelta** (padding real, `overflow-x-auto`, los tres estados de
carga) y a la vez la que más rompe el sistema:

- **`StatusBadge` duplicado** (`staff-plans-panel.tsx:25`): mismo nombre que el primitivo,
  pero con `emerald-500` / `red-500` crudos en vez de los tokens `success` / `danger`, y otro
  padding y otro tracking. Son **las dos únicas violaciones de paleta cruda de toda el área
  staff**, contra lo que dice explícitamente `globals.css`.
- **Semántica de color equivocada:** "Inactivo" se pinta de rojo (`danger`). Un plan inactivo
  no es un error, es un estado neutro — y el primitivo ya tiene el tono `neutral` para eso.
- **`window.confirm()` para eliminar.** Diálogo nativo blanco sobre una app dark-only.
  Es el único punto de la app que rompe el tema por completo.
- **Esta tabla no se parece a las otras cinco.** Encabezados `text-[10px] tracking-[0.2em]`
  contra `text-xs tracking-wide`, celdas `px-5 py-4` contra `py-2`, `border-b` contra
  `border-t`. Pasar de Clientes a Planes se siente como cambiar de producto.
- **Tres acciones `ghost` idénticas por fila** — "Editar", "Desactivar", "Eliminar" con el
  mismo peso visual.
- **El ritmo vertical se rompe:** el `mt-9` que las otras páginas ponen en el contenedor acá
  vive adentro del panel (`staff-plans-panel.tsx:88`).

**El formulario de plan** (`plan-form.tsx`, 238 líneas, el archivo más grande del área staff)
suma sus propios problemas:

- **Tercera implementación de `Field`** (`plan-form.tsx:29`) y **cuarta copia del string de
  clases del control** (`FIELD_CLASS`, línea 26). Y este `Field` **perdió el cableado de
  accesibilidad**: el `<p>` del error no tiene `id`, y el control no recibe `aria-describedby`
  ni `aria-invalid`. Los errores de validación de este formulario **no se anuncian** — a
  diferencia del de `followup`, que sí lo hace.
- **Dos checkboxes nativos sin ningún estilo.** "Destacado" y "Permite débito automático" son
  `<input type="checkbox">` crudos: el checkbox azul por defecto del navegador dentro de una UI
  monocromática negra. Es el elemento más visualmente fuera de lugar de todo el panel.
- **Hack de alineación:** el checkbox "Destacado" lleva `pb-2.5` para emparejarse con el
  `Input` de al lado, porque `Input` dibuja una fila de label y un checkbox pelado no.
- **Dos `<textarea>` sin primitivo**, con la copia de `FIELD_CLASS` encima.
- **El `<select>` de "Tipo de plan" se deshabilita al editar sin explicar por qué.** Queda gris
  y no responde; no hay texto que diga que el tipo no se puede cambiar una vez creado el plan.
- **`font-bold` sobre `font-display`** (línea 118): Archivo carga 400/600/800/900, **no 700**.
  El navegador lo sintetiza.
- **El formulario se abre inline, empujando la tabla hacia abajo**, sin scroll-into-view ni
  manejo de foco. `followup` sí devuelve el foco al cerrar sus formularios; este no.

---

### 7. `/staff/payments` — Pagos · ⚪️ no implementado

`ComingSoonSection`. Es un stub honesto y bien resuelto — no hay nada que arreglar de UI acá,
hay que construir la pantalla. Lo relevante para el resto: mientras no exista, las columnas
"Pagos" de Clientes y Ficha de cliente **no deberían mostrar `"Próximamente"` como si fuera un
dato**. O se ocultan las columnas, o van a un estado vacío explícito.

---

### 8. `/staff/follow-up` — Seguimiento · 🟢 bueno

**La pantalla de referencia.** Chips de filtro con contadores y `aria-pressed`, filtro
persistido en la URL (`?tipo=`), los cuatro estados de datos, reintento ante error,
touch targets de 44px, foco devuelto al cerrar un formulario, avatar con iniciales,
acción primaria diferenciada de las secundarias.

Lo poco que queda:

- **Los chips son `<button>` crudos** con sus clases inline en vez de una variante de `Button`
  — es el único `<button>` sin primitivo en toda el área staff. Funciona, pero es el patrón
  "toggle" que falta en el sistema.
- **El notice de resultado aparece arriba de la lista** y puede quedar fuera de viewport
  cuando se gestiona una alerta del final. Es el caso de uso natural de un `Toast`.
- **`AlertCard` usa `p-5`** en vez del `p-7` de `Card`, saltándose el primitivo. Correcto
  para la densidad que necesita — pero revela que a `Card` le falta una variante de padding.

---

### 9. `/staff/settings` — Configuración · 🟡 medio

- **Formulario sin agrupación visual.** Todos los `fieldset` usan `space-y-6`, el mismo
  espaciado entre campos de una sección y entre secciones distintas. Los `<legend>` son
  `text-sm` — del mismo tamaño que las descripciones de campo. No se percibe dónde empieza y
  termina cada grupo.
- **Sin aviso de cambios sin guardar.** Se puede editar y navegar afuera perdiendo todo, sin
  advertencia y sin indicador de "hay cambios pendientes".
- **El mensaje de resultado es `text-muted` para todo**, éxito y error por igual
  (`settings-form.tsx:120`). "Cambios guardados." se ve exactamente igual que un fallo.
  `followup` ya resolvió esto bien con `NoticeLine` (verde/rojo según `ok`).
- **El feedback de Google Calendar aparece suelto** entre el formulario y el panel de
  conexión, en gris, sin relación visual con el panel al que se refiere.
- **Un solo botón al fondo de un formulario largo**, sin barra sticky: hay que scrollear hasta
  abajo para guardar.

**El panel de Google Calendar** (`calendar-connection-panel.tsx`, 259 líneas) está, en cambio,
bastante bien resuelto: `isBusy` en todas las acciones, estados `disconnected` /
`needs_reconnect` / `connected` / selección de calendario bien diferenciados, y textos de
confirmación que explican consecuencias reales. Lo que le queda:

- **Dos `window.confirm` más** (líneas 119 y 143) — con los del panel de planes, son **3 en
  total**. El de desconectar pasa un **párrafo de 217 caracteres dentro de un diálogo nativo**,
  que es donde peor se lee. Y "Liberar bloqueos" —la acción que puede **provocar una doble
  reserva**, según su propio texto— está protegida solo por ese confirm nativo.
- **La última sincronización se muestra como timestamp ISO crudo** (`lastPushAt ?? lastPullAt`).
  En todo el resto de la app las fechas pasan por `toLocaleDateString("es-UY")`.
- **El selector de calendario es una lista de botones**: no hay forma de ver cuál está elegido.
  Es un grupo de radios o un `Select`, no botones.
- **El feedback de éxito es `text-muted`**, igual que cualquier texto secundario, mientras que
  `followup` ya distingue éxito en verde y error en rojo con `NoticeLine`.

---

## Problemas transversales a las 9

1. **El encabezado de página está duplicado 9 veces.**
   `<div className="mx-auto max-w-[1160px] px-6 py-16">` + `<SectionLabel>` +
   `<Heading as="h1" size="lg" className="mt-3">` copiado en cada `page.tsx`. Y el ritmo
   debajo del título **ya divergió**: `clients` y `schedule` usan `<div className="mt-9">`,
   `plans` lo mete adentro del panel, `settings` lo pone en el `Card`, `follow-up` en el
   panel. Un `StaffPageHeader` elimina las 9 copias y fija el ritmo.

2. **El `SectionLabel` repite el ítem activo del sidebar.** En Clientes se lee "Clientes"
   (nav) + "CLIENTES" (eyebrow) + "Clientes" (H1): la misma palabra tres veces, y el eyebrow
   no aporta nada. Debería ser un breadcrumb real (útil en `clients/[id]` y
   `schedule/[slotId]`, que hoy no tienen forma de volver) o no estar.

3. **El fallback de `Suspense` es siempre el mismo card "Cargando…".**
   `ComingSoonSkeleton` —nombre confuso: no dice "próximamente", solo "Cargando…"— no se
   parece al contenido que reemplaza. El salto de un card chico a una tabla de 7 columnas
   desplaza todo el layout. Faltan skeletons con la forma del contenido.

4. **Sin `destructive` en `Button`.** Existe `--color-danger` pero no hay variante. Eliminar
   un plan, borrar un template y marcar no-show se ven igual que editar.

5. **Botones por debajo del mínimo táctil.** `sm` ≈26px, `md` ≈35px, contra 44px. `followup`
   lo parchea con `TOUCH_TARGET = "min-h-11 sm:min-h-0"` repetido por llamada. Eso tiene que
   ser una variante del primitivo, no un string copiado.

6. **Cinco de seis tablas desbordan en mobile** (sin `overflow-x-auto`) y no tienen padding
   horizontal de celda.

7. **Estados de datos incompletos**, contra lo que exige el `CLAUDE.md` del proyecto
   ("Represent loading, empty, error and success states for data-driven screens"):

   | Panel | loading | empty | error |
   |---|:--:|:--:|:--:|
   | `followup-panel` | ✅ | ✅ | ✅ + reintento |
   | `staff-plans-panel` | ✅ | ✅ | ✅ |
   | `daily-slots-panel` | ❌ | ✅ | ✅ |
   | `clients-panel` | ❌ | ❌ | ✅ |
   | `attendance-roster-panel` | ❌ | ❌ | ✅ |
   | `client-detail-panel` | ❌ (en blanco) | ❌ | ✅ |
   | `templates-panel` | ❌ | ❌ | solo al crear |
   | `professionals-panel` | ❌ | ❌ | ❌ **ninguno** |

8. **Contraste del placeholder por debajo de AA.** `placeholder:text-muted/60` da ≈3.2:1
   sobre `bg-soft` (mínimo 4.5:1). Afecta a todos los inputs de las 9 pantallas.

9. **`font-bold` (700) sobre Inter, que solo carga 300/400/500/600.** El navegador sintetiza
   el peso. 15 usos en `src/`. Lo mismo con `font-display` en `plan-form.tsx:118`: Archivo
   carga 400/600/800/900, tampoco 700.

10. **El ítem activo del menú no coincide entre desktop y mobile.** El sidebar usa
    `pathname.startsWith(href)` (`staff-sidebar.tsx:26`), así que en
    `/staff/clients/abc` resalta "Clientes". El menú mobile usa `pathname === link.href`
    (`mobile-nav-menu.tsx:27`), así que en esa misma ruta **no resalta nada**. En las dos
    pantallas de detalle (`clients/[id]` y `schedule/[slotId]`) el usuario mobile pierde la
    referencia de dónde está — justo donde más falta hace, porque tampoco hay breadcrumb.

11. **Tres tratamientos distintos para el mismo link de navegación:** sidebar `text-xs` plano,
    menú mobile `text-xs font-bold tracking-[3px] uppercase`, nav público `text-[11px]
    tracking-[0.2em] uppercase`.

> Para ser justos: la cabecera mobile del staff (`features/profile/`) está **muy bien
> resuelta** — devuelve el foco al trigger, cierra con Escape y con click afuera, cierra al
> cambiar de ruta, y respeta `env(safe-area-inset-bottom)`. Junto con `followup`, es la otra
> parte del código que ya está al nivel que buscamos.

---

## Plan sugerido, por orden de impacto

**Fase 1 — El sistema que falta** *(desbloquea todo lo demás, y es donde más se nota)*
1. `Table` (estilo de Planes como base: padding real, `overflow-x-auto`, encabezado único)
2. `Select` + promover `Field` / `FieldError` de `followup` a `components/ui/`
3. Variante `destructive` y tamaños con `min-h-11` en `Button`; variante `padding` en `Card`
4. `EmptyState` y `Skeleton`
5. `StaffPageHeader` — borra las 9 copias del encabezado y fija el ritmo vertical

**Fase 2 — Las correcciones visibles y baratas**
6. Borrar el `StatusBadge` duplicado de planes; usar el primitivo con tono `neutral` para "Inactivo"
7. Reemplazar `window.confirm` por un `Dialog`
8. Labels en los 5 `<select>` de templates y alinear la grilla
9. Manejo de errores en `professionals-panel` y en la carga de `templates-panel`
10. Estados loading/empty que faltan en las 4 tablas
11. Subir el contraste del placeholder a AA

**Fase 3 — El flujo propiamente dicho**
12. Dashboard real en `/staff` con los datos que ya devuelve la API
13. Estado pendiente + reflejo del estado seleccionado al marcar asistencia; título del turno con hora y servicio
14. Paginación y búsqueda con debounce en Clientes; sacar las columnas placeholder
15. Selector de fecha con calendario en Turnos; agrupar Configuración; `Toast` en lugar de notices sueltos

**Fase 4 — Pendiente de producto**
16. Pantalla de Pagos

Fase 1 y 2 son casi todo el salto de calidad percibida y no tocan lógica de negocio.
Fase 3 sí cambia comportamiento: conviene acordar cada punto antes.

---

## El estándar ya está escrito (y es ejecutable)

Lo más útil que encontré no está en el código de las pantallas: está en `e2e/`.

`e2e/followup-usability.spec.ts` **codifica como aserciones de Playwright exactamente los
criterios de este informe**:

| Constante / helper | Qué exige |
|---|---|
| `MIN_TOUCH_TARGET_PX = 44` | toda acción principal mide ≥44px de alto en viewport de 390px |
| `expectNoSidewaysScroll()` | ninguna pantalla scrollea horizontalmente a 390px |
| `tabUntilFocused()` | los controles se alcanzan por teclado y responden a Enter |
| `aria-pressed` | los toggles declaran su estado |
| focus return | abrir un form mueve el foco al primer campo; cerrarlo lo devuelve al botón |

**No hay que acordar un estándar de UX: el equipo ya lo escribió y lo verifica en CI.**
El problema es que ese spec cubre únicamente seguimiento y check-in. De los 19 specs e2e, los
de staff son solo los de follow-up — **no hay e2e de clientes, turnos, asistencia, planes ni
configuración.**

Y eso significa que varias de las fallas de este informe **son incumplimientos medibles del
propio estándar del equipo**, no opiniones mías:

- La tabla de Clientes (7 columnas, sin `overflow-x-auto`) **reprobaría `expectNoSidewaysScroll`
  a 390px** hoy mismo.
- Los tres botones de la nómina de asistencia (~26px) **reprobarían `expectTouchTarget`**.
- Los 5 `<select>` sin label de templates no son alcanzables por nombre accesible.

### La consecuencia para el plan

El orden correcto para las Fases 2 y 3 es **escribir primero los `staff-*-usability.spec.ts`
de las 8 pantallas restantes, verlos fallar, y recién ahí rediseñar.** Es TDD sobre el harness
que el equipo ya tiene, no una métrica nueva.

El harness lo soporta casi todo ya:
- `e2e/support/scenarios.ts` ya define el usuario staff (`staff@move.test`) y los escenarios
  **`staff`, `staff-empty` y `staff-error`** — es decir, los estados vacío y de error ya
  estaban previstos en el harness, solo que ninguna pantalla fuera de seguimiento los ejercita.
- `e2e/support/fake-followup.ts` ya mockea `/staff/clients/:id`.
- Falta agregar rutas al fake API para el listado de clientes, turnos del día, nómina,
  templates, profesionales, planes y settings.

---

## Dos cosas a resolver antes de tocar código

1. **Los tests van a romper, pero menos de lo que parece.** Hay 146 archivos de test; el área
   staff aporta ~1.300 líneas. Los tests de página mockean el panel y asertan
   `getByRole("heading", { level: 1, name: "…" })`, así que un `StaffPageHeader` que conserve
   el `h1` con el mismo nombre **los mantiene verdes**. Los de panel son de comportamiento
   accesible (queries por rol y por nombre), así que un refactor que preserve la semántica
   sobrevive. Igual: correrlos en cada paso, no al final.

2. **Las maquetas de referencia.** El vault apunta a 10 pantallas de referencia en Drive
   (`move-mockups/`). Si cubren el área staff, son el contraste contra el cual medir todo esto
   y cambian las prioridades. Hay que conseguirlas antes de rediseñar.
