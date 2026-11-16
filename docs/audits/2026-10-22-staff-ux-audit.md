# Auditoría de UX, usabilidad y claridad de flujos — `/staff`

**Fecha:** 2026-10-22
**Alcance:** todas las rutas protegidas bajo `/staff` (Dashboard, Clientes, Turnos y asistencia, Pagos, Planes, Seguimiento, Configuración) y su infraestructura compartida (shell, navegación, manejo de errores, control de roles).
**Metodología:** lectura directa del código fuente (páginas, componentes de feature, APIs de cliente, tests) de cada subruta, más verificación cruzada de los enlaces/datos que conectan unas pantallas con otras. No se realizaron cambios de código ni commits; este documento es solo de análisis.
**Nota sobre seguridad:** no se proponen simplificaciones que reduzcan controles de permisos/roles existentes (`RoleGatedShell`, `requireRole()`). Las reglas de negocio (capacidad, validez de plan, confirmación de pago) son responsabilidad de NestJS; este informe no las cuestiona, solo evalúa cómo el frontend comunica ese estado.

---

## Resumen ejecutivo

De los 30 hallazgos relevados, dos son **críticos** porque una pantalla promete una acción que no ejecuta (seguimiento) o no ofrece ninguna acción donde el propio copy dice que debería haberla (pagos). El patrón que más se repite — en Clientes, Pagos, Planes y Turnos — es la **falta de enlaces cruzados entre pantallas que hablan del mismo cliente o el mismo recurso**: la ficha de cliente no enlaza a sus pagos, planes ni turnos concretos, y Pagos/Planes no se pueden filtrar por cliente. Esto obliga a re-buscar manualmente la misma entidad una y otra vez en distintas pantallas, que es exactamente el tipo de fricción que la consigna pidió detectar.

Un segundo patrón recurrente es el de **estado "todo o nada" en listas con acciones por fila** (asistencia, plantillas, profesionales, planes): una sola bandera de "pendiente" bloquea toda la lista en vez de solo la fila en acción, lo que vuelve secuencial una tarea que debería poder hacerse en paralelo.

---

## Hallazgos por prioridad

### 🔴 Crítica

#### 1. El formulario de contacto de Seguimiento compone un mensaje que nunca se envía
- **Problema:** Desde `/staff/follow-up`, el botón "Contactar" de una alerta abre `ContactForm` sin `clientPhone`/`clientEmail`. Sin esos datos, el componente no puede generar el enlace de WhatsApp/email/llamada y el botón de acción se degrada siempre a "Registrar envío", que solo hace `POST {channel, alertId}` — el texto del mensaje que el staff escribió en el textarea nunca se envía a ningún lado ni se copia al portapapeles.
- **Ruta/Componentes/Archivos:** `src/app/staff/follow-up/page.tsx`, `src/features/followup/alert-card.tsx:124-131`, `src/features/followup/contact-form.tsx:116-320`.
- **Escenario concreto:** Staff filtra "Por vencer", abre "Contactar" en un cliente, elige WhatsApp + plantilla "Recordatorio de turno", edita el texto y hace clic en "Registrar envío" esperando que abra WhatsApp (como sí ocurre en la ficha de cliente). El diálogo se cierra con "Contacto registrado" pero el cliente no recibió nada.
- **Impacto:** La pantalla cuyo propósito es la retención de clientes no puede ejecutar el contacto que compone; solo dice que "debería haber pasado". Es engañoso porque usa los mismos textos/flujo que la versión que sí funciona en la ficha de cliente.
- **Solución propuesta:** Incluir `client.phone`/`client.email` en el DTO de alertas (el backend ya los conoce) y pasarlos a `ContactForm` desde `AlertCard`, igual que ya hace `ClientFollowupSection`. Si no es viable traer esos datos junto con la alerta, no ofrecer selección de canal/plantilla acá: colapsar a una acción de solo registro ("¿Ya la contactaste? Registrar") para no prometer un envío que no ocurre.
- **Confirmado/Hipótesis:** Confirmado por lectura directa del código en ambos extremos (origen y consumo de `clientPhone`/`clientEmail`).

#### 2. No existe ninguna acción para resolver un pago marcado "requiere revisión"
- **Problema:** `/staff/payments` es de solo lectura: lista, filtra y pagina pagos, pero no expone ninguna mutación. `staff-payments-api.ts` solo tiene `listStaffPayments` (GET); no existe en todo el frontend un `approvePayment`, `resolvePayment` ni equivalente.
- **Ruta/Componentes/Archivos:** `src/app/staff/payments/page.tsx`, `src/features/payments/staff/staff-payments-panel.tsx`, `src/features/payments/staff/staff-payments-api.ts`.
- **Escenario concreto:** Staff activa el filtro "Solo con atención requerida", ve 5 pagos marcados, pero no hay botón, checkbox ni acción para resolverlos. El propio copy de la pantalla dice que "necesitan revisión manual antes de darlos por resueltos", pero ese "darlos por resueltos" no tiene dónde ocurrir.
- **Impacto:** Si la resolución debe vivir en MOVE, es una funcionalidad crítica faltante; si vive en otro sistema (backoffice del gateway de pago), el staff pierde contexto y trazabilidad al tener que saltar fuera de la app sin que la UI lo indique.
- **Solución propuesta:** Confirmar con negocio dónde debe resolverse un pago. Si es acá, agregar una acción explícita (aprobar/rechazar/marcar revisado) con confirmación y feedback, acotada a los pagos `needsAttention`. Si es en otro sistema, ajustar el copy para dejar claro que la resolución ocurre fuera de MOVE.
- **Confirmado/Hipótesis:** Confirmado que la acción no existe en el frontend. Si es un gap de producto real o un flujo delegado a otro sistema es una pregunta abierta para negocio.

---

### 🟠 Alta

#### 3. La ficha de cliente es de solo lectura: no hay forma de editar sus datos
- **Problema:** No existe ningún `updateClient`/`PATCH` en `src/features/clients/staff/**`; `ClientDetailPanel` no renderiza ningún formulario ni botón de edición de datos del cliente.
- **Ruta/Archivos:** `src/features/clients/staff/clients-api.ts`, `src/features/clients/staff/client-detail-panel.tsx`.
- **Escenario concreto:** Un cliente informa en recepción que cambió de teléfono; no hay ningún punto en Staff para corregir ese dato — la ficha solo lo muestra, nunca lo edita.
- **Impacto:** Una tarea básica de mantenimiento de datos no tiene camino soportado, pese a que "clientes" es la primera responsabilidad del rol Staff según el alcance del producto.
- **Solución propuesta:** Agregar una acción "Editar datos" con un formulario mínimo (teléfono/email) contra un endpoint de actualización, si el negocio lo requiere.
- **Confirmado/Hipótesis:** Confirmado — ausencia verificada de cualquier mutación en el feature.

#### 4. El historial de reservas de la ficha de cliente no enlaza al turno original
- **Problema:** Cada fila de "Historial de reservas" en la ficha de cliente muestra fecha/servicio/estado/asistencia como texto plano; ninguna celda enlaza a `/staff/schedule/[slotId]`.
- **Ruta/Archivos:** `src/features/clients/staff/client-detail-panel.tsx:215-243`.
- **Escenario concreto:** Staff ve en la ficha una reserva confirmada sin asistencia marcada; para corregirla debe ir a `/staff/schedule`, ubicar la fecha y el turno manualmente, y recién ahí encontrar a ese mismo cliente en la nómina.
- **Impacto:** Cruce de flujos típico: la misma reserva se ve en dos pantallas sin enlace entre sí, duplicando la búsqueda.
- **Solución propuesta:** Convertir la fila en un link a `/staff/schedule/${slotId}`, si el backend expone ese id en `ClientBooking`.
- **Confirmado/Hipótesis:** Confirmado el código actual; la factibilidad exacta depende de si el backend ya expone `slotId` (hipótesis).

#### 5. Pagos y Planes no se pueden filtrar por cliente — la ficha de cliente no enlaza a ninguno de los dos
- **Problema:** Ni `StaffPaymentsFilter` ni `staff-plans-api.ts` aceptan `clientId`/búsqueda por cliente. Coherentemente, `client-detail-panel.tsx` no ofrece ningún link hacia Pagos o Planes para ese cliente.
- **Ruta/Archivos:** `src/features/clients/staff/client-detail-panel.tsx`, `src/features/payments/staff/staff-payments-api.ts`, `src/features/plans/staff/staff-plans-api.ts`.
- **Escenario concreto:** Desde la ficha de un cliente, el staff quiere ver si tiene pagos pendientes o qué plan tiene activo. No hay enlace a Pagos/Planes filtrado por esa persona; debe ir a cada pantalla y buscarla manualmente fila por fila.
- **Impacto:** La ficha de cliente, que debería ser el punto central de información de esa persona, queda desconectada de dos áreas centrales del rol Staff.
- **Solución propuesta:** Agregar soporte de filtro por `clientId` en ambos endpoints/paneles y enlaces "Ver pagos"/"Ver plan" desde la ficha.
- **Confirmado/Hipótesis:** Confirmado por lectura directa de ambos archivos de API.

#### 6. La ficha de cliente no muestra su plan activo ni su estado de pago
- **Problema:** El propio código documenta el hueco con un comentario explícito: `TODO(backend): "Cliente desde" and payment status aren't in ClientDetailResponse yet`.
- **Ruta/Archivos:** `src/features/clients/staff/client-detail-panel.tsx:172-204`.
- **Escenario concreto:** Un staff atendiendo a un cliente en el mostrador no puede saber desde su ficha si está al día con el pago o qué plan tiene; debe inferirlo de otra pantalla o preguntarle directamente.
- **Impacto:** Información de negocio central ausente en la pantalla que debería concentrarla.
- **Solución propuesta:** Extender `ClientDetailResponse` en el backend para incluir plan activo y estado de pago; el espacio visual ya está preparado para recibirlos.
- **Confirmado/Hipótesis:** Confirmado — comentario explícito en el código señalando el gap y su causa.

#### 7. Marcar asistencia bloquea toda la nómina del turno y hace una doble ida y vuelta de red
- **Problema:** `AttendanceRosterPanel.handleMark` usa un único `pendingBookingId` que deshabilita los botones de **todas** las filas, no solo la que se está guardando; y, pese a que `markAttendance` ya devuelve el `RosterItem` actualizado, el componente descarta esa respuesta y vuelve a pedir toda la nómina con un segundo `getRoster` antes de desbloquear.
- **Ruta/Archivos:** `src/app/staff/schedule/[slotId]/page.tsx` → `src/features/attendance/staff/attendance-roster-panel.tsx:102-114,207`; `attendance-api.ts:16-25`.
- **Escenario concreto:** Un turno tiene 15 reservas confirmadas. Al marcar "Presente" al cliente 1, los botones de los otros 14 quedan deshabilitados hasta que terminen el guardado y el refetch completo, impidiendo avanzar con el cliente 2 mientras tanto.
- **Impacto:** La acción más frecuente del rol (asistencia, por cliente, por turno, todos los días) es también la más lenta: lo que debería ser ~1 clic por cliente se vuelve una cola estrictamente secuencial con latencia doble.
- **Solución propuesta:** Trackear el estado pendiente por `bookingId` (no un flag global) y usar el `RosterItem` que ya devuelve `markAttendance` para parchear esa única fila, sin refetch completo.
- **Confirmado/Hipótesis:** Confirmado por lectura directa de `attendance-roster-panel.tsx`.

#### 8. El día seleccionado en Turnos no vive en la URL — se pierde al volver de un turno
- **Problema:** `DailySlotsPanel` guarda la fecha seleccionada solo en `useState(todayBusinessDate())`; nunca se refleja en la URL.
- **Ruta/Archivos:** `src/features/attendance/staff/daily-slots-panel.tsx:74,87-89`.
- **Escenario concreto:** Staff mueve el selector a un día futuro para preparar la asistencia de esa fecha, entra a un turno, marca asistencia, y al volver por el breadcrumb "Turnos y asistencia" la lista se remonta y vuelve a **hoy** — el día en el que estaba trabajando se pierde y hay que reseleccionarlo desde cero.
- **Impacto:** Rompe el recorrido más común de esta pantalla (lista → turno → volver a la lista) para cualquier día que no sea hoy; también impide recargar o compartir la vista sin perder el lugar. Además contradice la convención propia del proyecto ("Prefer URL state for shareable filters/navigation").
- **Solución propuesta:** Reflejar `date` en la URL (`?date=2026-10-29`) y leer el valor inicial desde `searchParams`.
- **Confirmado/Hipótesis:** Confirmado.

#### 9. No hay búsqueda por cliente en la lista de Pagos
- **Problema:** Los únicos filtros de `/staff/payments` son Estado, Tipo, Origen y "atención requerida" — no hay campo de búsqueda por nombre/email de cliente ni por referencia externa (que sí existe en el DTO pero no se usa como filtro).
- **Ruta/Archivos:** `src/app/staff/payments/page.tsx`, `src/features/payments/staff/staff-payments-panel.tsx`.
- **Escenario concreto:** Un cliente llama diciendo "pagué y no me aparece". Staff no puede buscarlo directamente en Pagos; debe combinar filtros de estado/tipo/origen y recorrer páginas de 20 ítems.
- **Impacto:** Tarea frecuente (reconciliación puntual por reclamo de cliente) se vuelve lenta e indirecta.
- **Solución propuesta:** Agregar un input de búsqueda por nombre/email/referencia externa, reusando el patrón `pushQuery` ya usado para los otros filtros.
- **Confirmado/Hipótesis:** Confirmado — no existe ese filtro en el código.

#### 10. El error boundary de todo `/staff` siempre culpa a "la sesión", sea cual sea el error real
- **Problema:** `src/app/staff/error.tsx` reexporta directamente `SessionErrorFallback` para **cualquier** error no controlado en cualquier subruta, con el texto hardcodeado "No pudimos verificar tu sesión. Puede ser un problema temporario del servidor.", sin inspeccionar el tipo de error.
- **Ruta/Archivos:** `src/app/staff/error.tsx`, `src/components/layout/session-error-fallback.tsx`.
- **Escenario concreto:** Un error de render no relacionado con sesión (p. ej. un `TypeError` al pintar una tabla) hace caer el boundary en `/staff/plans/[id]`; el staff ve "no pudimos verificar tu sesión" y un botón "Reintentar" que repite el mismo render roto.
- **Impacto:** Mensaje incorrecto que induce a pensar que es un problema de login cuando es un bug de la app; puede generar tickets de soporte mal diagnosticados; "Reintentar" no soluciona nada si la causa no es transitoria.
- **Solución propuesta:** Diferenciar en el boundary entre un error real de sesión y cualquier otro error (mensaje genérico neutro, sin detalle técnico, con link de vuelta a `/staff`).
- **Confirmado/Hipótesis:** Confirmado — el código no inspecciona el tipo de error antes de mostrar el mensaje de sesión.

#### 11. El Dashboard no muestra la agenda del día (bloqueado por backend, ya documentado)
- **Problema:** Un comentario en el código indica que la sección "Agenda de hoy" (turnos de hoy, quién está reservado, si ya se marcó asistencia) está pendiente porque el backend aún no expone esos campos. Hoy el Dashboard solo muestra alertas de seguimiento y contactos pendientes.
- **Ruta/Archivos:** `src/features/dashboard/staff/dashboard-panel.tsx:244-249`.
- **Escenario concreto:** Al iniciar el turno, el staff quiere ver quién está reservado en la próxima hora; el Dashboard no ofrece nada de esto, debe entrar a `/staff/schedule` y orientarse ahí sin ningún resumen previo.
- **Impacto:** La tarea diaria más frecuente (asistencia de hoy) no tiene ningún acceso directo ni resumen desde la pantalla de entrada.
- **Solución propuesta:** Ya reconocido por el propio equipo como bloqueado por backend — no requiere una solución nueva, solo priorizar esa dependencia.
- **Confirmado/Hipótesis:** Confirmado — gap documentado explícitamente en el código, no es un descuido.

---

### 🟡 Media

#### 12. No hay forma de pasar al turno siguiente/anterior desde la nómina de asistencia
- **Problema:** `/staff/schedule/[slotId]` solo ofrece un breadcrumb de vuelta a la lista completa; no hay control "turno siguiente"/"turno anterior".
- **Ruta/Archivos:** `src/app/staff/schedule/[slotId]/page.tsx`.
- **Escenario concreto:** Un día tiene 6 turnos a revisar; para cada uno, el staff debe volver a la lista, reubicar la fila correcta (agravado por el hallazgo #8) y volver a entrar.
- **Impacto:** Convierte el recorrido de asistencia de un día en N idas y vueltas completas lista↔detalle en vez de un recorrido guiado.
- **Solución propuesta:** Agregar enlaces de turno siguiente/anterior (mismo día) en la pantalla de nómina, ordenados por `startsAt`.
- **Confirmado/Hipótesis:** Confirmado.

#### 13. Tres funciones administrativas no relacionadas apiladas en una sola pantalla sin sub-navegación
- **Problema:** `/staff/schedule` renderiza `DailySlotsPanel`, `TemplatesPanel` y `ProfessionalsPanel` apilados verticalmente, sin pestañas ni anclas entre ellos.
- **Ruta/Archivos:** `src/app/staff/schedule/page.tsx:20-33`.
- **Escenario concreto:** Para desactivar un profesional (tarea infrecuente), el staff debe scrollear más allá de la tabla diaria de asistencia y la de plantillas semanales, cada una con sus propios formularios/skeletons, cada vez que quiere llegar a "Profesionales".
- **Impacto:** Mezcla una tarea operativa de alta frecuencia (asistencia diaria) con dos tareas de configuración de baja frecuencia bajo una sola ruta y un solo scroll, sin salto rápido entre ellas.
- **Solución propuesta:** Dividir en subpestañas o subrutas (`schedule` para asistencia diaria, `schedule/templates`, `schedule/professionals`), consistente con cómo Clientes/Pagos/Planes ya tienen rutas propias de primer nivel.
- **Confirmado/Hipótesis:** Confirmado.

#### 14. El mismo patrón de "bloquear toda la lista por una fila pendiente" se repite en Plantillas y Profesionales
- **Problema:** Igual que en asistencia, un único flag (`pendingId`/`isSubmitting`) deshabilita el botón de acción de **todas** las filas, no solo la que está en curso, tanto en `TemplatesPanel` ("Eliminar") como en `ProfessionalsPanel` ("Activar/Desactivar").
- **Ruta/Archivos:** `src/features/scheduling/staff/templates-panel.tsx:342`, `src/features/scheduling/staff/professionals-panel.tsx:209`.
- **Escenario concreto:** Staff quiere desactivar dos profesionales seguidos o borrar dos plantillas obsoletas una tras otra; la segunda acción queda bloqueada hasta que la primera resuelva.
- **Impacto:** Menor frecuencia y listas más chicas que en asistencia, pero es el mismo patrón repetido en todo el feature de scheduling, y conviene resolverlo de una vez.
- **Solución propuesta:** Mismo arreglo que el hallazgo #7 — trackear el id pendiente por fila, no como flag global del feature.
- **Confirmado/Hipótesis:** Confirmado.

#### 15. La alerta "Recontactar" no ofrece "Marcar gestionado", rompiendo el patrón del resto de las alertas
- **Problema:** Todos los demás tipos de alerta ofrecen `["contact", "handle", "reason", "history"]` o `["contact", "handle", "history"]`; `RECONTACT` solo ofrece `["contact", "history"]` — sin "Marcar gestionado" ni "Registrar motivo".
- **Ruta/Archivos:** `src/features/followup/present-alert.ts:118-123`.
- **Escenario concreto:** La fecha de recontacto pactada con un cliente llega y aparece la alerta, pero si el contacto ya ocurrió por otro canal fuera de la app, no hay forma de resolver/descartar la alerta directamente — solo "Contactar" o "Ver historial".
- **Impacto:** Modelo mental inconsistente: el staff aprende con 6 de 8 tipos que "toda alerta se puede marcar gestionada" y luego encuentra una que no, sin explicación visible.
- **Solución propuesta:** Agregar "handle" también a `RECONTACT`, o si es intencional, agregar una nota breve en la tarjeta que lo explique.
- **Confirmado/Hipótesis:** Confirmado.

#### 16. "Marcar gestionado" no pide confirmación, mientras una acción similar sí la pide
- **Problema:** `markHandled()` en `AlertCard` se dispara inmediatamente al hacer clic, sin confirmación, eliminando la alerta de la lista en forma permanente. En contraste, "Finalizar pausa" en `ClientFollowupSection` — una acción de peso comparable — sí requiere confirmación inline.
- **Ruta/Archivos:** `src/features/followup/alert-card.tsx:68-77` vs `src/features/followup/client-followup-section.tsx:45-66`.
- **Escenario concreto:** Staff recorriendo una lista larga en "Todas" hace clic por error en "Marcar gestionado" de la tarjeta equivocada (tarjetas visualmente densas, botones en posición fija) y la alerta desaparece sin "¿estás seguro?" ni opción de deshacer.
- **Impacto:** Patrón de interacción inconsistente para acciones de peso similar dentro del mismo feature; riesgo de pérdida accidental de seguimiento de un cliente.
- **Solución propuesta:** Alinear ambas acciones — confirmación inline en ambas, o un toast "Deshacer" tras marcar gestionado.
- **Confirmado/Hipótesis:** Confirmado.

#### 17. Un pago no enlaza al plan o turno concreto que lo originó
- **Problema:** Cada fila de pago enlaza al cliente, pero `StaffPaymentDto` no incluye `planId`/`bookingId`/`slotId` — solo `itemName` como texto plano. No hay forma de ir de un pago de tipo "Plan" a `/staff/plans/[id]`, ni de uno de tipo "Reserva" al turno en `/staff/schedule`.
- **Ruta/Archivos:** `src/lib/api/types.ts` (`StaffPaymentDto`), `src/features/payments/staff/staff-payments-panel.tsx`.
- **Escenario concreto:** Staff ve un pago "Reserva — Rehab" aprobado y quiere confirmar que el turno correspondiente está bien cargado en la agenda; no tiene link directo, debe buscar manualmente por cliente/fecha en Turnos.
- **Impacto:** Fricción y riesgo de error al cruzar manualmente pagos con turnos/planes en vez de navegar directo.
- **Solución propuesta:** Si el backend ya guarda esa relación, exponer `planId`/`bookingId` en el DTO y enlazar la fila al recurso concreto.
- **Confirmado/Hipótesis:** Confirmado que el DTO actual no trae esos IDs; si el backend ya los tiene disponibles es hipótesis.

#### 18. Activar/desactivar un plan recarga toda la tabla como esqueleto en vez de actualizar la fila
- **Problema:** `StaffPlansPanel.runAction` llama siempre a `reload()` tras cualquier acción (toggle activo/inactivo, borrado), lo que vuelve a poner `status` en `"loading"` y repinta toda la tabla como filas esqueleto, en vez de parchear solo la fila afectada.
- **Ruta/Archivos:** `src/features/plans/staff/staff-plans-panel.tsx:94-123`.
- **Escenario concreto:** Staff desactiva 3 planes seguidos (p. ej. de temporada); después de cada clic toda la tabla se vacía en esqueletos y vuelve a cargar, en vez de que solo cambie la etiqueta de estado de esa fila.
- **Impacto:** Parpadeo/jank innecesario en una acción frecuente y de bajo riesgo; el staff pierde la referencia visual de en qué fila estaba.
- **Solución propuesta:** Actualizar en forma optimista solo la fila afectada (o parchear con la respuesta de la acción) en vez de resetear todo el listado a `"loading"`.
- **Confirmado/Hipótesis:** Confirmado.

#### 19. El formato de precio en Planes está duplicado en vez de reusar el formateador compartido
- **Problema:** `staff-plans-panel.tsx` define su propio `priceFormat`/`formatPrice` en vez de importar el `formatPrice` ya existente en `@/lib/money` (que aplica `Math.ceil` y `useGrouping: "always"`), usado por las tarjetas de planes públicas.
- **Ruta/Archivos:** `src/features/plans/staff/staff-plans-panel.tsx:32-33` vs `src/lib/money.ts`.
- **Escenario concreto:** Si `lib/money.ts` cambia a futuro (redondeo, decimales, moneda), el panel de Staff silenciosamente conserva el formato viejo — un staff podría ver un precio distinto al que ve el sitio público para el mismo plan.
- **Impacto:** Riesgo de inconsistencia de precio mostrado entre Staff y el sitio público, justo el tipo de detalle que erosiona confianza al revisar precios.
- **Solución propuesta:** Importar y reusar `formatPrice` de `@/lib/money` en vez de redeclararlo.
- **Confirmado/Hipótesis:** Confirmado — implementaciones duplicadas conviven en el código.

#### 20. Cambios sin guardar en Configuración se pierden en silencio al navegar
- **Problema:** `SettingsForm` calcula `isDirty` y muestra "Tenés cambios sin guardar", pero no hay ningún guard de navegación (no `beforeunload`, no bloqueo de ruta) en todo el código.
- **Ruta/Archivos:** `src/features/settings/settings-form.tsx`; navegación vía `src/components/layout/staff-sidebar.tsx`.
- **Escenario concreto:** Staff edita "Límite para cancelar" y "Días sin asistir", ve el indicador de cambios sin guardar, pero por hábito hace clic en "Clientes" en el sidebar antes de guardar. Next.js navega sin aviso y los cambios se pierden.
- **Impacto:** Pérdida de datos silenciosa en un formulario de reglas de negocio (ventanas de cancelación, alertas de seguimiento); el staff recién nota la pérdida cuando ve que la regla no se aplicó.
- **Solución propuesta:** Agregar un guard de navegación cuando `isDirty` es true, reusando el patrón de `ConfirmDialog` ya existente (usado en `CalendarConnectionPanel`).
- **Confirmado/Hipótesis:** Confirmado.

#### 21. Los accesos rápidos del Dashboard omiten dos de las seis secciones operativas
- **Problema:** `QUICK_LINKS` en el Dashboard tiene 4 entradas (Clientes, Turnos y asistencia, Seguimiento, Planes), mientras que el sidebar (`STAFF_LINKS`) tiene 6 entradas no-Dashboard, incluyendo Pagos y Configuración.
- **Ruta/Archivos:** `src/features/dashboard/staff/dashboard-panel.tsx:25-30`, `src/components/layout/staff-sidebar.tsx:13-21`.
- **Escenario concreto:** Un staff aterriza en `/staff` buscando la forma más rápida de registrar/revisar un pago; "Pagos" no está ofrecido como acceso rápido, a diferencia de cada otra tarea central.
- **Impacto:** Inconsistencia menor de navegación; debilita el propósito del Dashboard como lanzador de tareas al excluir arbitrariamente 2 de 6 secciones.
- **Solución propuesta:** Generar `QUICK_LINKS` a partir de `STAFF_LINKS` (excluyendo Dashboard/Configuración por ser de menor frecuencia) o justificar explícitamente por qué se excluye Pagos.
- **Confirmado/Hipótesis:** Confirmado por comparación directa de ambas listas.

---

### 🟢 Baja

#### 22. "Contactos pendientes" del Dashboard no tiene enlace a su listado completo
- **Problema:** `AlertsSummary` sí tiene un enlace "Ir a Seguimiento →" para ver la lista completa; `PendingContactsSummary` no tiene un enlace equivalente, solo enlaces por fila a la ficha de cliente.
- **Ruta/Archivos:** `src/features/dashboard/staff/dashboard-panel.tsx:164-215`.
- **Escenario concreto:** Staff ve 3 contactos pendientes en el panel pero no sabe si es la lista completa o un recorte, y no tiene forma de ver "todos los contactos pendientes" como sí puede hacerlo con alertas.
- **Impacto:** Patrón inconsistente entre dos secciones de la misma pantalla; ambigüedad sobre si la lista está completa.
- **Solución propuesta:** Agregar una acción de encabezado consistente con el patrón de `AlertsSummary`.
- **Confirmado/Hipótesis:** Confirmado el patrón visual; si `listPendingContacts()` trunca en el backend es hipótesis.

#### 23. `getPlan` para editar un plan recarga y escanea todo el catálogo (bloqueado por backend)
- **Problema:** No existe un `GET /staff/plans/:id`; abrir `/staff/plans/[id]` trae la lista completa de planes y busca la fila correspondiente en el cliente.
- **Ruta/Archivos:** `src/features/plans/staff/staff-plans-api.ts:40-48`.
- **Escenario concreto:** Al editar un solo plan, el costo de la petición es el mismo que cargar todo el catálogo.
- **Impacto:** Bajo hoy con un catálogo chico; limitación ya reconocida en el código como dependencia de backend.
- **Solución propuesta:** No aplica una solución de frontend; coordinar con backend.
- **Confirmado/Hipótesis:** Confirmado, pero explícitamente una limitación de backend ya documentada.

#### 24. Cambiar el "Tipo de plan" descarta valores ya cargados sin aviso
- **Problema:** `changeKind` vacía todos los campos específicos del tipo anterior sin confirmación al cambiar el tipo de plan en el formulario de creación.
- **Ruta/Archivos:** `src/features/plans/staff/plan-form.tsx:185-192`, `plan-form-values.ts:148-153`.
- **Escenario concreto:** Staff carga "Duración (meses)" para un plan por período, cambia de idea y elige "paquete de sesiones" — los valores anteriores desaparecen sin aviso (aunque eran específicos del tipo anterior, por lo que en general es correcto).
- **Impacto:** Menor, ya que los valores no aplicarían al nuevo tipo de todos modos; solo molesta si el staff alterna entre tipos esperando que se conserven.
- **Solución propuesta:** No requiere acción salvo que surjan quejas reales; podría preservarse por tipo en estado local si se vuelve un problema.
- **Confirmado/Hipótesis:** Hipótesis — fricción menor plausible, no una queja confirmada.

#### 25. Posibles alertas duplicadas para el mismo cliente entre distintos tipos (dependiente del backend)
- **Problema:** `AlertDto` parece ser una fila por *alerta*, no por *cliente*; un cliente que esté tanto "por vencer" como "sin asistir" podría aparecer como dos tarjetas separadas en "Todas", cada una con su propio estado de gestión.
- **Ruta/Archivos:** `src/features/followup/followup-panel.tsx`, `present-alert.ts`.
- **Escenario concreto:** Si no está resuelto: staff gestiona la alerta de "sin asistencia" de un cliente, la ve desaparecer, y luego encuentra al mismo cliente reaparecer bajo "por vencer", pensando que es un error.
- **Impacto:** Confusión potencial y riesgo de contacto duplicado si no hay deduplicación.
- **Solución propuesta:** Confirmar del lado del backend si las alertas se dedupilican por cliente; si no, agrupar por cliente en la vista "Todas".
- **Confirmado/Hipótesis:** Hipótesis — la forma de los datos es consistente con este riesgo, pero puede ya estar resuelto en el backend.

#### 26. Nueve chips de filtro sin agrupar por severidad en Seguimiento
- **Problema:** `AlertFilters` renderiza 9 chips ("Todas" + 8 tipos) sin agrupación visual por urgencia, aunque `ALERT_TONE` ya clasifica cada tipo como `warning`/`danger`/`neutral` — esa señal no se usa en la barra de filtros, solo en el badge de cada tarjeta.
- **Ruta/Archivos:** `src/features/followup/alert-filters.tsx`, `followup-labels.ts:40-49`.
- **Escenario concreto:** En pantallas chicas, 9 botones de igual peso ocupan 3+ filas antes de ver la lista; nada indica cuál filtro es más urgente.
- **Impacto:** Menor — ralentiza la priorización a primera vista, más marcado en mobile.
- **Solución propuesta:** Ordenar/agrupar los chips por tono (urgentes primero) o colorear el borde según `ALERT_TONE`.
- **Confirmado/Hipótesis:** Confirmado.

#### 27. El botón "Contactar" del encabezado de la ficha de cliente no contacta, solo hace scroll
- **Problema:** El botón principal de la ficha es un ancla (`href="#contacto"`) que solo desplaza la vista hacia la sección de seguimiento más abajo; no abre WhatsApp, email ni ningún formulario directamente.
- **Ruta/Archivos:** `src/features/clients/staff/client-detail-panel.tsx:141-149,247-254`.
- **Escenario concreto:** Staff espera que "Contactar" inicie un contacto inmediato (como sí ocurre en el flujo de alertas) y solo ve la página saltar a una sección que, a su vez, requiere otra acción.
- **Impacto:** Menor: el botón cumple su propósito (llevar a la sección), pero el verbo "Contactar" sugiere una acción inmediata que no ocurre.
- **Solución propuesta:** Renombrar a algo como "Ir a contacto", o evaluar si conviene abrir directamente el formulario de contacto.
- **Confirmado/Hipótesis:** Confirmado el mecanismo; el grado real de confusión en el staff es hipótesis.

#### 28. Paginación de Clientes solo anterior/siguiente, sin salto de página
- **Problema:** `ClientsPanel` solo ofrece "← Anterior"/"Siguiente →", sin número de página ni tamaño configurable; `PAGE_SIZE` fijo en 20.
- **Ruta/Archivos:** `src/features/clients/staff/clients-panel.tsx:280-313`.
- **Escenario concreto:** Con una base grande de clientes y una búsqueda parcial que da muchos resultados, no hay forma de saltar directo a una página intermedia.
- **Impacto:** Bajo, ya que la búsqueda por nombre/email cubre la mayoría de los casos; solo aparece cuando la búsqueda no acota lo suficiente.
- **Solución propuesta:** No urgente; considerar salto de página o tamaño configurable si la base de clientes crece mucho.
- **Confirmado/Hipótesis:** Confirmado el mecanismo; el impacto real depende del volumen en producción.

#### 29. Navegación lateral: 7 secciones planas sin agrupar
- **Problema:** `STAFF_LINKS` expone 7 ítems al mismo nivel (Dashboard, Clientes, Turnos y asistencia, Pagos, Planes, Seguimiento, Configuración) sin separación visual entre tareas operativas diarias y de gestión/configuración.
- **Ruta/Archivos:** `src/components/layout/staff-sidebar.tsx`.
- **Escenario concreto:** No es disruptivo con 7 ítems, pero todas tienen el mismo peso visual sin distinguir frecuencia de uso.
- **Impacto:** Bajo hoy; podría degradar si se agregan más secciones.
- **Solución propuesta:** Si se agregan secciones nuevas, agrupar visualmente (separador entre operación diaria y configuración) en vez de seguir una lista plana.
- **Confirmado/Hipótesis:** Hipótesis de mejora, no un problema confirmado por uso real.

#### 30. Dos máquinas de estado de carga/error duplicadas en el Dashboard
- **Problema:** `AlertsSummary` y `PendingContactsSummary` implementan cada una su propio estado `LoadStatus`, efecto de fetch-on-mount y botón de reintento — lógica totalmente duplicada para el mismo patrón (skeleton → datos/vacío/error).
- **Ruta/Archivos:** `src/features/dashboard/staff/dashboard-panel.tsx:56-215`.
- **Escenario concreto:** No afecta al usuario hoy (ambas secciones se comportan igual), pero aumenta el riesgo de que una futura corrección de comportamiento de reintento se aplique a una sección y no a la otra.
- **Impacto:** Riesgo de mantenimiento/consistencia futura más que daño de UX actual.
- **Solución propuesta:** Extraer un hook compartido (p. ej. `useLoadable`).
- **Confirmado/Hipótesis:** Confirmado como duplicación de código; es una observación de consistencia de estados más que un defecto de UX hoy.

---

## Propuesta integral de simplificación de `/staff`

El patrón dominante en esta auditoría no es "una pantalla rota", sino **pantallas correctas aisladas que no se hablan entre sí**. Cliente, Pagos, Planes y Turnos modelan la misma realidad de negocio (una persona, su plan, sus pagos, sus reservas) pero cada feature vive como si fuera la única. La propuesta se ordena en tres ejes, del de mayor impacto al de menor esfuerzo:

### 1. Convertir la ficha de cliente en el verdadero hub de esa persona
Hoy la ficha de cliente (`/staff/clients/[id]`) es el único lugar donde un staff ve "todo sobre esta persona", pero en la práctica no enlaza a nada: ni a sus pagos (#5), ni a su plan activo (#6), ni al turno concreto de una reserva pasada (#4), y no se puede editar (#3). Esto obliga a repetir la búsqueda del mismo cliente en cada pantalla a la que se quiera ir después. Agregar `clientId` como filtro soportado en Pagos y Planes, exponer `planId`/`bookingId`/`slotId` en los DTOs relevantes, y sumar los enlaces correspondientes en la ficha eliminaría de un saque la mayoría de las "re-búsquedas manuales" detectadas en esta auditoría (#4, #5, #6, #17). Es el cambio de mayor apalancamiento porque corrige el eje central ("¿quién es este cliente y qué le pasa?") del que dependen las demás tareas de Staff.

### 2. Unificar el patrón de "acción por fila" en listas con operaciones frecuentes
Asistencia (#7), Plantillas (#14) y Profesionales (#14) repiten el mismo anti-patrón: un flag único bloquea la lista entera por una sola fila en vuelo, y en el caso de asistencia además se descarta una respuesta ya útil para forzar un refetch completo. Resolver esto una sola vez (trackear el id pendiente por fila, aplicar la respuesta de la mutación en vez de refetchear) destraba en simultáneo la tarea más frecuente del rol (marcar asistencia) y dos de mantenimiento, con un único cambio de patrón reutilizable.

### 3. Hacer que el estado de navegación sobreviva la ida y vuelta entre pantallas
La fecha seleccionada en Turnos (#8) y la ausencia de navegación turno-a-turno (#12) hacen que revisar la asistencia de un día completo implique perder el lugar constantemente. Sumado a la falta de confirmación al salir de Configuración con cambios sin guardar (#20), el tema de fondo es que el estado de "dónde estaba el staff" no se preserva al moverse. Reflejar la fecha en la URL y agregar navegación directa entre turnos del mismo día resuelve el caso de uso más repetitivo detectado (recorrer todos los turnos de una jornada).

### Lo que no se propone tocar
No se recomienda reducir ni fusionar las 7 secciones del sidebar (Dashboard, Clientes, Turnos y asistencia, Pagos, Planes, Seguimiento, Configuración): cada una corresponde a una responsabilidad del rol Staff explícitamente delimitada en el alcance del producto, y la auditoría no encontró evidencia de que su cantidad actual (7) sea en sí misma un problema de navegación. Tampoco se propone alterar el control de acceso por rol (`RoleGatedShell`/`requireRole()`), que funciona como se espera y no mostró fallas.

### Dos preguntas abiertas para negocio (no resueltas por este informe)
- **Pagos (#2):** ¿dónde debe resolverse un pago marcado "requiere revisión" — en MOVE o en otro sistema? La respuesta determina si el hallazgo crítico #2 requiere una función nueva o solo un ajuste de copy.
- **Seguimiento (#1):** si no es viable traer `clientPhone`/`clientEmail` junto con la alerta, ¿tiene sentido seguir ofreciendo composición de mensaje por canal/plantilla desde esa pantalla, o conviene colapsarla a un registro simple ("ya la contacté")?

---

## Tabla resumen

| # | Hallazgo | Ruta principal | Prioridad |
|---|----------|-----------------|-----------|
| 1 | Formulario de contacto de Seguimiento no envía nada | `/staff/follow-up` | Crítica |
| 2 | Sin acción para resolver pagos "requiere revisión" | `/staff/payments` | Crítica |
| 3 | Ficha de cliente de solo lectura | `/staff/clients/[id]` | Alta |
| 4 | Historial de reservas no enlaza al turno | `/staff/clients/[id]` | Alta |
| 5 | Pagos/Planes sin filtro por cliente | `/staff/payments`, `/staff/plans` | Alta |
| 6 | Ficha de cliente sin plan/estado de pago | `/staff/clients/[id]` | Alta |
| 7 | Marcar asistencia bloquea toda la nómina | `/staff/schedule/[slotId]` | Alta |
| 8 | Fecha de Turnos no persiste en la URL | `/staff/schedule` | Alta |
| 9 | Sin búsqueda por cliente en Pagos | `/staff/payments` | Alta |
| 10 | Error boundary siempre culpa a la sesión | Todo `/staff/**` | Alta |
| 11 | Dashboard sin agenda del día (bloqueado por backend) | `/staff` | Alta |
| 12 | Sin navegación turno siguiente/anterior | `/staff/schedule/[slotId]` | Media |
| 13 | Tres funciones apiladas sin sub-navegación | `/staff/schedule` | Media |
| 14 | Bloqueo de lista completa en Plantillas/Profesionales | `/staff/schedule` | Media |
| 15 | Alerta "Recontactar" sin acción de gestión | `/staff/follow-up` | Media |
| 16 | "Marcar gestionado" sin confirmación | `/staff/follow-up` | Media |
| 17 | Pago no enlaza a plan/turno origen | `/staff/payments` | Media |
| 18 | Reload completo al togglear un plan | `/staff/plans` | Media |
| 19 | Formato de precio duplicado | `/staff/plans` | Media |
| 20 | Cambios sin guardar se pierden en Configuración | `/staff/settings` | Media |
| 21 | Accesos rápidos del Dashboard incompletos | `/staff` | Media |
| 22 | Sin link a listado completo de contactos pendientes | `/staff` | Baja |
| 23 | `getPlan` recarga todo el catálogo | `/staff/plans/[id]` | Baja |
| 24 | Cambio de tipo de plan descarta valores sin aviso | `/staff/plans/new` | Baja |
| 25 | Posibles alertas duplicadas por cliente | `/staff/follow-up` | Baja |
| 26 | Filtros de Seguimiento sin agrupar por severidad | `/staff/follow-up` | Baja |
| 27 | Botón "Contactar" de la ficha solo hace scroll | `/staff/clients/[id]` | Baja |
| 28 | Paginación de Clientes sin salto de página | `/staff/clients` | Baja |
| 29 | Sidebar con 7 ítems planos sin agrupar | Todo `/staff/**` | Baja |
| 30 | Estados de carga/error duplicados en Dashboard | `/staff` | Baja |
