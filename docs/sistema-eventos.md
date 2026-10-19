# Sistema de eventos

Cómo funcionan los eventos de programaConNosotros: quién los gestiona, cómo se inscribe la gente,
la lista de espera, los avisos y el recuerdo que queda cuando el evento termina. Los casos de prueba
manuales están en [`test-cases-eventos.md`](./test-cases-eventos.md).

## Índice

1. [Modelo de datos](#modelo-de-datos)
2. [Permisos](#permisos)
3. [Rutas](#rutas)
4. [Inscripción y lista de espera](#inscripción-y-lista-de-espera)
5. [Crear y editar eventos](#crear-y-editar-eventos)
6. [Avisos: notificaciones y emails](#avisos-notificaciones-y-emails)
7. [Charlas y call for speakers](#charlas-y-call-for-speakers)
8. [Eventos pasados: el recuerdo](#eventos-pasados-el-recuerdo)
9. [Caché y tiempo real](#caché-y-tiempo-real)
10. [Mapa de archivos](#mapa-de-archivos)

---

## Modelo de datos

Todo está en `prisma/schema.prisma`; acá va lo que importa para entender el comportamiento.

### `Event`

| Campo                                        | Para qué                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `date`, `endDate`                            | Inicio y fin opcional. Sin `endDate`, el evento dura hasta el final de su día (`hasEventEnded`).           |
| `city`, `address`, `placeName`               | Opcionales en la base; obligatorios en el form salvo que el evento sea online.                             |
| `isOnline`, `streamingUrl`                   | Evento online y link al stream.                                                                            |
| `googleMapsUrl`                              | Link de Google Maps del lugar; de ahí sale el mapa embebido y el link "cómo llegar".                       |
| `flyerImages`                                | Lista de URLs de flyers (carrusel). Se suben a S3 en `events/flyers/`.                                     |
| `capacity`                                   | Cupo. `null` = sin límite.                                                                                 |
| `markedAsFull`                               | Lleno a mano: nadie más se inscribe (va a la lista de espera) y no se promueve a nadie.                    |
| `externalRegistrationUrl`                    | Inscripción en otro sitio (Luma, etc.): el botón lleva ahí y el sitio no gestiona inscripciones ni espera. |
| `callForSpeakersEnabled`                     | Abre `/eventos/[id]/proponer-charla` para que la comunidad proponga charlas.                               |
| `shortcut`                                   | Slug para URLs cortas en flyers (`/cowork`). Se reutiliza: lleva al **próximo** evento con ese slug.       |
| `coverPhotoId`, `coverFocusX/Y`, `coverZoom` | Portada del recuerdo de un evento pasado y su encuadre (punto focal en %, zoom en %).                      |
| `createdById`                                | Quién lo creó (null en eventos viejos). Define quién puede eliminarlo.                                     |
| `deletedAt`                                  | Eliminación lógica.                                                                                        |

Relaciones: `organizers` (`EventOrganizer`), `registrations`, `waitlistEntries`, `sponsors`,
`sponsorClicks`, `flyerDesigners`, `broadcasts`, `announcements`, `talkProposals`, `talks` y
`galleryItems` (fotos y videos de la galería asociados al evento).

### `EventRegistration`

Una inscripción de un **usuario con cuenta**: ya no hay inscripción anónima ni formulario con
nombre, email o tipo estudiante/profesional. Esos datos salen del perfil del usuario (`jobTitle`,
`enterprise`, `career`, `studyPlace`).

- `@@unique([eventId, userId])`: una fila por persona y evento.
- `cancelledAt`: la baja es lógica. Volver a anotarse reactiva la misma fila.

### `EventWaitlistEntry`

La lista de espera. Una fila por persona y evento; está **activa** mientras `cancelledAt` y
`promotedAt` sean null (`activeWaitlistWhere`). El orden es `createdAt` (y `id` para desempatar);
quien sale y vuelve a anotarse entra al final de la fila.

### `EventOrganizer`

Usuarios que organizan el evento (ambassadors o no). Quien crea el evento queda como organizador.

### `EventFlyerDesigner`

Quién diseñó el flyer del evento entero (no por imagen): un usuario (`userId`) o solo un nombre; el
nombre se guarda siempre. Si el evento se queda sin flyers, se borran los diseñadores.

### `Sponsor` y `SponsorClick`

Sponsors del evento con `name`, `website` y `logo` (una ruta de `/public`, como los partners del
sitio, o una URL https). Al editar el evento se borran y se recrean, por eso `SponsorClick` cuenta
los clics por nombre y evento, no por fila de `Sponsor`.

### `EventBroadcast`

Historial de los mails que quien gestiona el evento mandó a su gente: `audience` (`confirmados`,
`lista-de-espera` o `todos`), asunto, mensaje, cuántos destinatarios y cuántos fallaron.

---

## Permisos

Las reglas están en `src/lib/event-permissions.ts` (funciones puras) y `src/lib/event-access.ts`
(las que consultan la base).

| Quién                           | Crear | Editar y gestionar | Eliminar / elegir organizadores |
| ------------------------------- | :---: | :----------------: | :-----------------------------: |
| Admin del sitio (`role: ADMIN`) |  sí   |       todos        |              todos              |
| Ambassador                      |  sí   |    los que creó    |          los que creó           |
| Organizador del evento          |  no   |     ese evento     |               no                |
| Cualquier usuario con cuenta    |  no   |         no         |               no                |

"Gestionar" (`canEditEvent`, `canManageEventById`) incluye editar el evento, ver inscripciones y
lista de espera, borrar inscripciones, mandar mails, gestionar charlas y propuestas, publicar
anuncios del evento y elegir la portada del recuerdo. Un evento eliminado solo lo edita un admin.

Solo para admins: el agente que completa el form desde los flyers y crear charlas desde una foto de
la galería.

Helpers:

- `canManageEventById(user, eventId)`: el chequeo de las server actions.
- `getEventManager(eventId)` / `requireEventManager(eventId)`: el usuario de la sesión si gestiona
  el evento; la segunda lanza `No autorizado`.
- `canManageSomeEvent(user)`: admin, ambassador u organizador de algún evento (filtro barato antes
  de buscar el evento concreto).

---

## Rutas

### Públicas

| Ruta                            | Qué hace                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/eventos`                      | El "museo" de eventos: próximos y pasados agrupados por año, con conteo de inscriptos, fotos y charlas.          |
| `/eventos/[id]`                 | Detalle. Si el evento ya terminó, muestra el recuerdo (`PastEventMemory`) en vez de la página de inscripción.    |
| `/eventos/[id]/inscripcion`     | Ya no tiene formulario: redirige a la URL externa o a `/eventos/[id]` (manteniendo `?autoRegister=true`).        |
| `/eventos/[id]/proponer-charla` | Formulario de propuesta de charla (requiere sesión y `callForSpeakersEnabled`).                                  |
| `/eventos/[id]/calendario.ics`  | Archivo iCalendar para Apple Calendar, Outlook, etc. (`src/lib/ics.ts`). El link a Google Calendar va aparte.    |
| `/eventos/[id]/og-image`        | Imagen Open Graph generada para eventos sin flyer ni fotos.                                                      |
| `/[shortcut]`                   | URL corta de flyer: redirige al próximo evento con ese `shortcut`, o a `/eventos` si no hay. Registra la visita. |

### Para quien gestiona el evento

| Ruta                                  | Qué hace                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/eventos/nuevo`                      | Crear evento (admins y ambassadors).                                                      |
| `/eventos/[id]/editar`                | Editar o eliminar el evento.                                                              |
| `/eventos/[id]/inscripciones`         | Resumen (activas, estudiantes, profesionales, en espera), lista de espera, mails y tabla. |
| `/eventos/[id]/organizadores`         | Sumar y quitar organizadores (admins y quien creó el evento).                             |
| `/eventos/[id]/charlas`               | Cargar y editar las charlas que se dieron.                                                |
| `/eventos/[id]/propuestas-de-charlas` | Revisar propuestas: aceptar, rechazar, borrar o convertirlas en charla.                   |

---

## Inscripción y lista de espera

### Reglas

1. **Hace falta cuenta.** Sin sesión, el botón lleva a
   `/iniciar-sesion?redirect=/eventos/[id]&autoRegister=true`; al volver, `EventDetailClient` ve
   `autoRegister=true` e inscribe solo. Si la sesión venció con la página abierta, la action lanza
   `AuthRequiredError` y la UI vuelve a mandar al login.
2. **Inscripción externa:** con `externalRegistrationUrl`, el botón abre ese link y
   `registerEvent` rechaza la inscripción.
3. **Evento terminado:** no acepta inscripciones (no deben contar como asistencia).
4. **Con lugar:** se crea la inscripción, o se reactiva la cancelada.
5. **Sin lugar** (`markedAsFull` o activas ≥ `capacity`): la persona entra a la lista de espera y
   ve su posición.
6. Las inscripciones canceladas no cuentan para el cupo.
7. Rate limit `eventRegistration`: 20 inscripciones o bajas cada 10 minutos.

### Concurrencia

Toda inscripción, baja, borrado o promoción corre en una transacción que primero toma
`lockEvent(tx, eventId)`: un `SELECT … FOR UPDATE` sobre la fila del evento. Así dos personas no se
quedan con el último lugar y una baja no promueve dos veces. Si igual chocan dos pedidos del mismo
usuario, el unique `(eventId, userId)` corta con `P2002` y se responde "Ya estás inscripto…".

### Promoción desde la lista de espera

`promoteFromWaitlist` (`src/lib/event-waitlist.ts`) llena los lugares libres en orden de llegada.
Corre:

- al cancelar una inscripción (`cancelRegistration`);
- al borrar una inscripción activa (`deleteRegistration`);
- al editar el evento (`fillFromWaitlist`, por si subió el cupo o se desmarcó "lleno");
- al inscribirse alguien, antes de evaluar su pedido: un lugar que quedó libre es primero de quien
  ya esperaba.

No promueve si el evento está `markedAsFull`, tiene inscripción externa o ya terminó. A cada persona
promovida le llega un email (`WaitlistPromotionEmail`) y los admins reciben una notificación. Los
avisos van fuera de la transacción: si falla el email, la promoción queda igual.

### Baja

`cancelRegistration` sirve para las dos cosas: si el usuario tiene una inscripción activa, la marca
cancelada (y promueve); si no, lo saca de la lista de espera. Solo el propio usuario se da de baja.

`deleteRegistration` borra la fila de verdad; es para quien gestiona el evento.

### Gestión de inscriptos

En `/eventos/[id]/inscripciones`:

- `getEventRegistrations` y `getEventWaitlist`: tabla de inscriptos con datos del perfil y la lista
  de espera en orden de promoción.
- `sendEventBroadcast`: mail a `confirmados`, `lista-de-espera` o `todos` (sin repetir emails), de a
  lotes de 10. Asunto de 3 a 120 caracteres, mensaje de 10 a 5000, rate limit `eventBroadcast`
  (5 por hora). Queda registrado en `EventBroadcast`. `getBroadcastAudienceCounts` da el alcance de
  cada audiencia para el form.

---

## Crear y editar eventos

El form (`EventForm`, usado por `NewEventForm` y `EditEventForm`) valida con `eventSchema`
(`src/schemas/event-schema.ts`), en el cliente y de nuevo en el servidor:

- Nombre 3–200, descripción 10–2000.
- `endDate` posterior a `date` (se valida en el form, porque en producción el mensaje de un error del
  servidor no llega al navegador).
- Presencial: ciudad (≥ 2), lugar (≥ 2) y dirección (≥ 5) obligatorios. Online: no.
- `googleMapsUrl` solo acepta links de Google Maps.
- Flyers: rutas del sitio o URLs. Diseñadores del flyer: hasta 40.
- Sponsors con nombre, web opcional y logo (ruta del sitio o https).
- `shortcut`: minúsculas, números y guiones.
- `capacity`: entero mayor a 0 o vacío.

`createEvent` (rate limit `createContent`) guarda el evento con quien lo crea como organizador.
`updateEvent` (rate limit `editContent`) reemplaza sponsors y diseñadores en una transacción y
después llama a `fillFromWaitlist`. `deleteEvent` marca `deletedAt`.

### Completar desde los flyers (admins)

`FillFromFlyersButton` llama a `fillEventFromFlyers`, que le pasa los flyers subidos a
`eventFlyerAgent` (`src/lib/event-flyer-agent.ts`, AI SDK `ToolLoopAgent`). El agente lee fecha,
lugar, links, cupo y sponsors, y usa tools para copiar la dirección de un lugar ya usado
(`findVenues`), los datos de un partner (`listPartners`) y el estilo de eventos anteriores
(`recentEvents`). No guarda nada: devuelve valores para el form, filtrados por las mismas reglas
del schema, y el admin revisa antes de guardar. Solo lee flyers de `events/flyers/`; necesita
`AI_GATEWAY_API_KEY` y tiene rate limit `aiAgent`.

---

## Avisos: notificaciones y emails

| Cuándo                                                      | A quién                                | Cómo                                        |
| ----------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| Se crea un evento futuro                                    | Todos (menos quien lo crea)            | Notificación con push + email a verificados |
| Cambia la fecha o el lugar de un evento futuro              | Inscriptos activos (menos quien edita) | Notificación con push + email               |
| Alguien consigue lugar desde la lista de espera             | Esa persona                            | Email                                       |
| Inscripción, baja, entrada o salida de la espera, promoción | Admins                                 | Notificación (`notifyAdmins`)               |
| Quien gestiona manda un mail                                | La audiencia elegida                   | Email (`EventBroadcastEmail`)               |

Un evento que se carga ya pasado (para el archivo) no avisa a nadie. Los emails de alta y cambios
usan `EventNoticeEmail` con `formatEventWhen` / `formatEventWhere` (`src/lib/event-notices.ts`).

---

## Charlas y call for speakers

- Con `callForSpeakersEnabled`, cualquiera con sesión propone una charla
  (`createTalkProposal`, `talkProposalSchema`) con uno o más oradores.
- Quien gestiona el evento la acepta o rechaza (`updateTalkProposalStatus`), la borra o la convierte
  en `Talk` (`createTalkFromProposal`, que avisa a los oradores).
- Las charlas que se dieron se cargan en `/eventos/[id]/charlas` (`createTalk`, `updateTalk`,
  `deleteTalk`) con slides, video y retrato. Un admin también puede crear una charla desde una foto
  de la galería (`createTalkFromPhoto`).

---

## Eventos pasados: el recuerdo

Cuando `hasEventEnded` es true, `/eventos/[id]` muestra `PastEventMemory`
(`src/components/events/memory/`): portada, número de catálogo en el museo (Nº 001 es el primer
evento), cuánta gente se anotó, mosaico de fotos, charlas, flyer con créditos, sponsors y
conversaciones de WhatsApp de ese día.

La portada la elige quien gestiona el evento entre sus fotos (`setEventCoverPhoto`; con `null`
vuelve a alternar fotos horizontales al azar) y la encuadra con `setEventCoverFraming` (zoom hasta
250 %). Elegir otra foto resetea el encuadre.

---

## Caché y tiempo real

- Las lecturas públicas pasan por `cached()`: `fetchEvents` (lista con conteos), `fetchEvent`
  (detalle), `listEventIndex` (nombre y fechas de todos, para la sidebar y búsquedas por id) y
  `getEventCounts` (inscriptos, en espera y número de catálogo). Cualquier escritura de Prisma en sus
  tablas las invalida sola (ver `docs/cache-de-datos.md`).
- Qué eventos son "próximos" depende de la hora, así que `fetchUpcomingEvents` y `fetchHomeEvents`
  filtran en cada request sobre la lista cacheada, no dentro de la caché.
- Las escrituras de `EventRegistration`, `EventWaitlistEntry` y las ediciones de `Event` publican
  el tópico `event:<id>` (`src/lib/realtime-signals.ts`). La página de un evento con inscripción
  interna escucha ese tópico con `RealtimeRefresh` y se refresca cuando cambia el cupo.
- Las server actions todavía llaman `revalidatePath` para las páginas del evento.

---

## Mapa de archivos

| Qué                        | Dónde                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| Server actions de eventos  | `src/actions/events/`                                                          |
| Charlas y propuestas       | `src/actions/talks/`, `src/actions/talk-proposals/`                            |
| Permisos                   | `src/lib/event-permissions.ts`, `src/lib/event-access.ts`                      |
| Lista de espera y locks    | `src/lib/event-waitlist.ts`                                                    |
| Fin del evento             | `src/lib/event-status.ts`                                                      |
| Índice y conteos cacheados | `src/lib/event-index.ts`                                                       |
| URLs cortas                | `src/lib/event-shortcuts.ts`, `src/app/[shortcut]/page.tsx`                    |
| Calendarios                | `src/lib/ics.ts`, `src/lib/google-calendar.ts`                                 |
| Agente de flyers           | `src/lib/event-flyer-agent.ts`, `src/actions/events/fill-event-from-flyers.ts` |
| Schemas                    | `src/schemas/event-schema.ts`, `talk-proposal-schema.ts`, `talk-schema.ts`     |
| Componentes                | `src/components/events/` (recuerdo en `memory/`)                               |
| Páginas                    | `src/app/(platform)/eventos/`                                                  |
| Tests de integración       | `src/actions/events/events.db.test.ts`, `registration.db.test.ts`              |
