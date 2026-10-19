# Casos de prueba: eventos

Casos manuales para la regresión del sistema de eventos. Cómo funciona cada parte está en
[`sistema-eventos.md`](./sistema-eventos.md). Los casos más importantes también figuran en
`/desarrollo/calidad` (`src/app/(platform)/desarrollo/calidad/manual-cases/auth-events.ts`); si
cambiás uno, cambiá el otro.

Antes de empezar:

- Usuarios de prueba: un **admin**, un **ambassador**, un **usuario común** y un segundo usuario
  común para hacer de **organizador** (sumado desde `/eventos/[id]/organizadores`).
- MailHog corriendo (`docker-compose up -d`) para ver los emails.
- En producción los mensajes de error de las server actions no llegan al navegador: los textos de
  error de abajo se ven en dev. En producción sale el mensaje genérico de la UI.

## Índice

1. [Crear, editar y eliminar](#crear-editar-y-eliminar)
2. [Permisos](#permisos)
3. [Inscripción](#inscripción)
4. [Lista de espera](#lista-de-espera)
5. [Gestión de inscriptos](#gestión-de-inscriptos)
6. [Avisos](#avisos)
7. [Charlas y call for speakers](#charlas-y-call-for-speakers)
8. [Eventos pasados](#eventos-pasados)
9. [Links, calendario y URLs cortas](#links-calendario-y-urls-cortas)
10. [Concurrencia y casos borde](#concurrencia-y-casos-borde)

---

## Crear, editar y eliminar

### TC-EV-001: Crear un evento presencial

**Pre:** admin o ambassador logueado.

1. En `/eventos` tocar `crearEvento();`.
2. Completar nombre, descripción, inicio, ciudad, lugar, dirección y cupo.
3. Guardar.

**Esperado:** muestra "guardando...", redirige a `/eventos/[id]`, el evento sale en `/eventos` y
quien lo creó figura en "organizadores".

### TC-EV-002: Crear un evento online

1. Marcar el evento como online y cargar el link del stream.
2. Dejar ciudad, lugar y dirección vacíos y guardar.

**Esperado:** se guarda sin pedir ubicación. La sección "info" muestra el stream y no hay mapa.

### TC-EV-003: Validaciones del formulario

1. Nombre de 2 caracteres y descripción de 9.
2. Fin anterior al inicio.
3. Evento presencial sin dirección.
4. Cupo `0`.
5. URL corta `Mi Evento`.
6. Link de Google Maps que no es de Google Maps (`https://example.com`).
7. Sponsor con web inválida.

**Esperado:** no se envía nada. Se ven, entre otros, "La fecha de finalización debe ser posterior a
la fecha de inicio", "La dirección debe tener al menos 5 caracteres", "El cupo debe ser un número
mayor a 0", "Solo minúsculas, números y guiones (sin espacios)", "Pegá un link de Google Maps
(google.com/maps o maps.app.goo.gl)" y "Debe ser una URL válida".

### TC-EV-004: Flyers, diseñadores y sponsors

1. Subir dos flyers y cargar como diseñadores a un usuario con cuenta y a alguien solo por nombre.
2. Agregar un sponsor que sea partner del sitio (con su logo) y otro que no.
3. Guardar y abrir el evento.

**Esperado:** carrusel con los dos flyers y créditos con los dos diseñadores (el que tiene cuenta
enlaza a su perfil). Los sponsors muestran logo o nombre y web.

### TC-EV-005: Completar desde los flyers (admin)

**Pre:** admin, `AI_GATEWAY_API_KEY` configurada.

1. En `/eventos/nuevo` subir el flyer de un evento real.
2. Tocar `completarConFlyers();`.

**Esperado:** el botón dice "leyendo flyers…" y después un toast "Completé N campos con los flyers"
con las notas del agente. Si el lugar ya se usó, trae la dirección y el link de Maps cargados antes;
un sponsor partner trae su logo. No se guarda nada hasta tocar guardar. Un ambassador no ve el
botón.

### TC-EV-006: Editar un evento

1. Como organizador, abrir `/eventos/[id]/editar`, cambiar la descripción y un sponsor, y guardar.

**Esperado:** redirige al evento con los cambios; el sponsor viejo ya no aparece.

### TC-EV-007: Eliminar un evento

**Pre:** admin, o el ambassador que lo creó.

1. En `/eventos/[id]/editar` eliminar y confirmar.

**Esperado:** diálogo "¿Estás seguro de eliminar este evento?", toasts "Eliminando evento..." y
"Evento eliminado correctamente", redirige a `/eventos` y el evento ya no aparece. Su URL muestra
"No encontramos este evento".

---

## Permisos

### TC-PERM-001: Solo admins y ambassadors crean eventos

**Pre:** usuario común logueado.

1. Abrir `/eventos`.
2. Ir directo a `/eventos/nuevo`.

**Esperado:** no ve `crearEvento();` sino el link de WhatsApp "quiero organizar algo";
`/eventos/nuevo` redirige a `/eventos`.

### TC-PERM-002: Rutas de gestión protegidas

**Pre:** usuario común logueado.

1. Abrir `/eventos/[id]/editar`, `/inscripciones`, `/charlas`, `/propuestas-de-charlas` y
   `/organizadores`.

**Esperado:** ninguna muestra datos; redirigen al evento. En la página del evento no aparecen
"editar", "inscripciones" ni "charlas del evento".

### TC-PERM-003: Un organizador edita pero no elimina

**Pre:** usuario sumado como organizador de un evento que no creó.

1. Abrir `/eventos/[id]/editar`.

**Esperado:** puede guardar cambios, pero no ve el botón de eliminar. En
`/eventos/[id]/organizadores` ve la lista pero no puede sumar ni quitar a nadie. Llamar la acción igual devuelve "Solo puedes eliminar los eventos que creaste".

### TC-PERM-004: Un ambassador solo gestiona lo suyo

**Pre:** ambassador; un evento creado por él y otro creado por otra persona.

1. Abrir `/eventos/[id]/editar` de cada uno.

**Esperado:** edita y elimina el suyo; del otro no ve "editar" y la ruta lo saca.

### TC-PERM-005: Sumar y quitar organizadores

**Pre:** admin, o el ambassador que creó el evento.

1. Ir a `/eventos/[id]/organizadores`, buscar a una persona y sumarla.
2. Quitarla con "Quitar a {nombre}".

**Esperado:** toasts "{nombre} ahora organiza el evento" y "{nombre} ya no organiza el evento". Al
sumarla, esa persona puede entrar a `/eventos/[id]/editar`.

---

## Inscripción

### TC-INS-001: Inscribirse a un evento con cupo

**Pre:** usuario logueado; evento futuro con cupo libre e inscripción interna.

1. Abrir `/eventos/[id]` y tocar `inscribirme();`.
2. Cerrar el diálogo con `entendido();`.

**Esperado:** diálogo "¡Te has inscrito exitosamente! 🎉"; la página pasa a "Ya estás registrado"
con `cancelarInscripcion();` y "Quedan {N} lugares disponibles." baja en uno.

### TC-INS-002: Inscripción automática después del login

**Pre:** sesión cerrada; evento futuro con cupo.

1. Tocar `inscribirme();`.
2. Iniciar sesión.

**Esperado:** redirige a `/iniciar-sesion?redirect=/eventos/{id}&autoRegister=true`; al volver ya
queda inscripto y aparece el diálogo de éxito.

### TC-INS-003: Sesión vencida con la página abierta

1. Abrir el evento logueado, cerrar sesión en otra pestaña.
2. Volver a la primera y tocar `inscribirme();`.

**Esperado:** toast "Tu sesión se cerró. Iniciá sesión para inscribirte." y lleva al login con
`autoRegister=true`.

### TC-INS-004: Cancelar y volver a inscribirse

1. Inscripto, tocar `cancelarInscripcion();`.
2. Tocar `inscribirme();` de nuevo.

**Esperado:** toast "Inscripción cancelada exitosamente" y el cupo sube en uno. Al volver a
inscribirse se reactiva la misma inscripción (en `/inscripciones` hay una sola fila, activa).

### TC-INS-005: Cupo ilimitado

**Pre:** evento sin cupo.

**Esperado:** no se muestra "Quedan N lugares" y nunca se pasa a lista de espera.

### TC-INS-006: Inscripción externa

**Pre:** evento con URL de inscripción externa.

1. Tocar el botón de inscripción.
2. Abrir `/eventos/[id]/inscripcion`.

**Esperado:** el botón abre la URL externa en otra pestaña y la ruta redirige a ella. No se crea
inscripción interna, no hay lista de espera y no se ve "inscripciones" para quien gestiona.

### TC-INS-007: `/eventos/[id]/inscripcion` sin inscripción externa

1. Abrir `/eventos/[id]/inscripcion` y `/eventos/[id]/inscripcion?autoRegister=true`.

**Esperado:** redirigen a `/eventos/[id]` (la segunda conserva `autoRegister=true` e inscribe si hay
sesión).

---

## Lista de espera

### TC-WAIT-001: Evento lleno: sumarse a la lista de espera

**Pre:** evento con el cupo completo; usuario logueado no inscripto.

1. Abrir el evento y tocar `unirmeAListaDeEspera();`.

**Esperado:** se ve "Cupo completo". Toast "Te sumaste a la lista de espera (#N)" y la página
muestra "Estás en la lista de espera · lugar #N" con `salirDeLaListaDeEspera();`.

### TC-WAIT-002: Marcado como lleno a mano

**Pre:** evento con cupo libre y "marcado como lleno" activado.

**Esperado:** se comporta como lleno: el botón anota en la lista de espera y nadie se promueve
aunque haya lugar.

### TC-WAIT-003: Salir de la lista de espera

1. En espera, tocar `salirDeLaListaDeEspera();`.

**Esperado:** toast "Saliste de la lista de espera"; quienes estaban detrás suben un lugar. Si
vuelve a anotarse, entra al final.

### TC-WAIT-004: Una baja promueve al primero

**Pre:** evento lleno con al menos 2 personas esperando; MailHog.

1. Con un inscripto, tocar `cancelarInscripcion();`.
2. Abrir el evento con el #1 de la lista.

**Esperado:** el #1 queda inscripto (orden de llegada), recibe el email "Conseguiste un lugar en
{evento} - programaConNosotros" y el resto avanza un lugar. Los admins reciben "Promoción automática
desde lista de espera".

### TC-WAIT-005: Subir el cupo o desmarcar "lleno" promueve

**Pre:** evento lleno con 3 personas esperando; organizador.

1. Editar el evento, subir el cupo en 2 y guardar.
2. Repetir con un evento "marcado como lleno", desmarcándolo.

**Esperado:** las dos primeras quedan inscriptas y reciben el email; la tercera sigue como #1. En el
segundo caso se llenan los lugares libres.

### TC-WAIT-006: Borrar una inscripción promueve

1. Como organizador, borrar una inscripción activa desde `/eventos/[id]/inscripciones`.

**Esperado:** el primero de la lista queda inscripto. Borrar una inscripción ya cancelada no
promueve a nadie.

### TC-WAIT-007: Sin promoción en eventos terminados

**Pre:** evento que ya terminó, con gente en espera.

1. Como organizador, editar el evento y subirle el cupo.

**Esperado:** nadie se promueve ni recibe email.

---

## Gestión de inscriptos

### TC-GES-001: Página de inscripciones

**Pre:** organizador de un evento con inscriptos (algunos cancelados) y lista de espera.

1. Abrir `/eventos/[id]/inscripciones`.

**Esperado:** estadísticas activas (con cuántas canceladas), estudiantes, profesionales y en espera
(con el cupo). Tabla "lista de espera" en orden de promoción y tabla de inscriptos con datos del
perfil (cargo, empresa, carrera, lugar de estudio) y estado.

### TC-GES-002: Eliminar una inscripción

1. Eliminar una inscripción y confirmar.

**Esperado:** diálogo "¿Eliminar inscripción?", toast "Inscripción eliminada exitosamente" y la
fila desaparece.

### TC-GES-003: Mandar un mail a los inscriptos

**Pre:** MailHog; evento con inscriptos y gente en espera, con una persona en las dos listas.

1. Elegir cada audiencia (confirmados, lista de espera, todos) y revisar cuánta gente alcanza.
2. Mandar uno a "todos".

**Esperado:** toast "Listo: N mails enviados"; cada persona recibe uno solo, con asunto
"{evento}: {asunto}". Asunto de menos de 3 caracteres o mensaje de menos de 10 no se envía. Después
de 5 envíos en una hora, el sexto se frena por rate limit.

### TC-GES-004: La página se actualiza sola

1. Abrir el evento en dos navegadores; inscribirse en uno.

**Esperado:** en el otro el contador de lugares se actualiza sin recargar.

---

## Avisos

### TC-AVI-001: Evento nuevo

**Pre:** MailHog; otro usuario con email verificado.

1. Crear un evento futuro.

**Esperado:** el otro usuario recibe la notificación "Nuevo evento" (y push si lo tiene activado) y
el email "Nuevo evento: {nombre}". Quien lo creó no recibe nada.

### TC-AVI-002: Evento cargado ya pasado

1. Crear un evento con fecha pasada.

**Esperado:** no sale ninguna notificación ni email.

### TC-AVI-003: Cambio de fecha o lugar

**Pre:** evento futuro con inscriptos.

1. Editar solo la fecha. Después solo el lugar. Después solo la descripción.

**Esperado:** los inscriptos activos reciben "Cambió la fecha de {evento}" y "Cambió el lugar de
{evento}" (notificación y email, con el dato cambiado resaltado). Cambiar la descripción no avisa.
Quien edita no recibe aviso aunque esté inscripto.

### TC-AVI-004: Notificaciones a admins

1. Inscribirse, cancelar, entrar y salir de una lista de espera.

**Esperado:** los admins reciben "Nueva inscripción a evento", "Inscripción cancelada", "Nueva
persona en lista de espera" y "Salida de lista de espera".

---

## Charlas y call for speakers

### TC-CHA-001: Proponer una charla

**Pre:** usuario logueado; evento con call for speakers habilitado.

1. En el evento tocar "proponer →"; el orador 1 viene precargado del perfil.
2. Completar título y descripción y tocar `enviarPropuesta();`.

**Esperado:** toast "¡Propuesta enviada! Nos pondremos en contacto pronto.", redirige al evento y
los admins reciben "Nueva propuesta de charla". Sin sesión, el link lleva al login.

### TC-CHA-002: Validaciones de oradores

1. Teléfono `+54 381 123`; no marcar profesional ni estudiante; marcar profesional sin empresa.
2. Agregar un segundo orador con `agregarOrador();` y quitarlo.

**Esperado:** "El teléfono debe contener solo dígitos…", "Debés seleccionar al menos una opción:
profesional o estudiante" y "La empresa es requerida para profesionales". El botón de quitar solo
aparece con 2 o más oradores.

### TC-CHA-003: Call for speakers cerrado

1. Abrir `/eventos/[id]/proponer-charla` de un evento sin call for speakers.

**Esperado:** redirige al evento.

### TC-CHA-004: Aceptar una propuesta y crear la charla

**Pre:** organizador con una propuesta pendiente.

1. En `/eventos/[id]/propuestas-de-charlas` tocar `aceptar();` y luego `crearCharla();`.
2. Intentar crearla otra vez.

**Esperado:** toasts "Propuesta aceptada" y "Charla creada a partir de la propuesta"; el botón queda
como "// charla creada" deshabilitado, la charla aparece en `/charlas` y los oradores con cuenta
reciben una notificación.

### TC-CHA-005: Propuestas de otro evento

**Pre:** organizador del evento A; propuesta del evento B.

1. Intentar aceptar o borrar la propuesta del evento B.

**Esperado:** "No tenés permisos para realizar esta acción".

### TC-CHA-006: Cargar charlas del evento

1. En `/eventos/[id]/charlas` crear una charla con slides y video, editarla y borrarla.

**Esperado:** se ve en la página del evento (y en el recuerdo cuando el evento termina) y en
`/charlas`; al borrarla desaparece de ambos.

---

## Eventos pasados

### TC-PAS-001: El evento terminado se muestra como recuerdo

**Pre:** evento con fecha pasada, fotos en la galería y charlas.

1. Abrir el evento.

**Esperado:** vista de recuerdo con portada, número de catálogo, cuánta gente se anotó, mosaico de
fotos, charlas, flyer con créditos y sponsors. No hay botón de inscripción ni lista de espera.

### TC-PAS-002: Fin del evento

1. Evento de hoy sin fecha de fin, ya empezado.
2. Evento con fecha de fin dentro de una hora.

**Esperado:** los dos siguen mostrando la página de inscripción; el primero pasa a recuerdo recién
después de medianoche y el segundo al pasar su fin.

### TC-PAS-003: No se puede inscribir a un evento terminado

1. Con la página de un evento abierta justo antes de que termine, tocar `inscribirme();` después.

**Esperado:** "Este evento ya terminó" y no se crea inscripción.

### TC-PAS-004: Elegir y encuadrar la portada

**Pre:** organizador de un evento pasado con varias fotos.

1. Elegir una foto como portada.
2. Ajustar el punto focal y el zoom y tocar `guardarEncuadre();`.
3. Elegir otra foto; después volver a la portada aleatoria.

**Esperado:** toasts "Portada actualizada", "Encuadre guardado" y "La portada vuelve a ser
aleatoria". Al elegir otra foto el encuadre vuelve al centro sin zoom. Un usuario común no ve estos
controles.

### TC-PAS-005: Lista de eventos

1. Abrir `/eventos`.

**Esperado:** próximos arriba y pasados agrupados por año, con inscriptos, fotos y charlas. Los
eventos eliminados no aparecen.

---

## Links, calendario y URLs cortas

### TC-LNK-001: Agregar al calendario

1. Tocar el link de Google Calendar.
2. Abrir `/eventos/[id]/calendario.ics` y `/eventos/no-existe/calendario.ics`.

**Esperado:** Google Calendar abre con nombre, fecha y lugar. El `.ics` se descarga como
`pcn-evento-{id}.ics` (`text/calendar`) y se importa bien en Apple Calendar; el id inexistente da 404.

### TC-LNK-002: Mapa

**Pre:** evento presencial con link de Google Maps (probar también un link corto `maps.app.goo.gl`).

**Esperado:** se ve el mapa embebido del lugar y el link abre Google Maps. Sin link no hay mapa.

### TC-LNK-003: URL corta

**Pre:** dos eventos con `shortcut` `cowork`: uno pasado y uno futuro.

1. Abrir `/cowork` y `/Cowork`.
2. Abrir un shortcut que no use ningún evento futuro.

**Esperado:** las dos primeras llevan al evento futuro; la tercera lleva a `/eventos`.

### TC-LNK-004: Vista previa al compartir

1. Pegar el link de un evento con flyer y el de uno sin flyer ni fotos en un validador de Open
   Graph.

**Esperado:** el primero usa el flyer; el segundo, la imagen generada de `/eventos/[id]/og-image`.

### TC-LNK-005: Anuncios de un evento

**Pre:** admin.

1. En `/anuncios` crear un anuncio asociado a un evento, fijado, y otro sin publicar.
2. Abrir el evento.

**Esperado:** toast "Anuncio creado exitosamente". En el evento aparece solo el publicado, fijado
primero. Un usuario común no ve `nuevoAnuncio();`.

---

## Concurrencia y casos borde

### TC-EDGE-001: Doble clic en inscribirme

1. Hacer doble clic rápido en `inscribirme();`.

**Esperado:** queda una sola inscripción; si el segundo pedido llega, el error es "Ya estás
inscripto en este evento o en su lista de espera".

### TC-EDGE-002: Dos personas por el último lugar

**Pre:** evento con un solo lugar libre; dos usuarios con la página abierta.

1. Tocar `inscribirme();` en los dos casi a la vez.

**Esperado:** uno queda inscripto y el otro entra a la lista de espera como #1. Nunca quedan los
dos inscriptos (el evento se bloquea con `FOR UPDATE` mientras se decide).

### TC-EDGE-003: Un lugar libre es primero de quien ya esperaba

**Pre:** evento con gente en espera al que se le subió el cupo directo en la base (sin pasar por
editar).

1. Un usuario nuevo toca `inscribirme();`.

**Esperado:** primero se promueve a quienes esperaban; el usuario nuevo solo queda inscripto si
sobra lugar, si no entra al final de la lista.

### TC-EDGE-004: Evento eliminado con la página abierta

1. Abrir el evento, eliminarlo en otra pestaña y tocar `inscribirme();`.

**Esperado:** "Evento no encontrado" y no se crea inscripción.

### TC-EDGE-005: Rate limit de inscripciones

1. Inscribirse y cancelar más de 20 veces en 10 minutos.

**Esperado:** a partir de la 21ª se frena con el mensaje de rate limit.
