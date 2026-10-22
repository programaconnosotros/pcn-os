# Seguridad: cómo nos defendemos del OWASP Top 10

Cómo se defiende el sitio de cada categoría del [OWASP Top 10 2025](https://owasp.org/Top10/),
qué tests automatizados lo sostienen y qué riesgos aceptamos a conciencia. Última revisión:
octubre de 2026, con una auditoría de todas las server actions y route handlers.

## Tabla de contenidos

1. [Resumen](#resumen)
2. [A01 Control de acceso](#a01-control-de-acceso)
3. [A02 Configuración de seguridad](#a02-configuración-de-seguridad)
4. [A03 Cadena de suministro](#a03-cadena-de-suministro)
5. [A04 Criptografía](#a04-criptografía)
6. [A05 Inyección (SQL y XSS)](#a05-inyección-sql-y-xss)
7. [A06 Diseño inseguro](#a06-diseño-inseguro)
8. [A07 Autenticación](#a07-autenticación)
9. [A08 Integridad de software y datos](#a08-integridad-de-software-y-datos)
10. [A09 Logging y alertas](#a09-logging-y-alertas)
11. [A10 Manejo de condiciones excepcionales](#a10-manejo-de-condiciones-excepcionales)
12. [Servidor MCP y OAuth](#servidor-mcp-y-oauth)
13. [Riesgos aceptados](#riesgos-aceptados)
14. [Cómo correr los chequeos](#cómo-correr-los-chequeos)
15. [Reglas para código nuevo](#reglas-para-código-nuevo)

---

## Resumen

| Categoría                | Defensa principal                                                       | Test que la sostiene                                                      |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A01 Control de acceso    | Chequeo de sesión/permisos en cada server action, sobre la fila real    | `src/lib/server-action-auth.test.ts`                                      |
| A02 Configuración        | Headers de seguridad, CSP con nonce, HSTS                               | `src/lib/csp.test.ts`, `src/proxy.test.ts`                                |
| A03 Cadena de suministro | Lockfile, overrides de pnpm, Dependabot                                 | `pnpm audit`                                                              |
| A04 Criptografía         | bcrypt costo 12, tokens de 256 bits hasheados, TLS                      | `src/lib/password.test.ts`, `src/lib/session.test.ts`                     |
| A05 Inyección SQL        | Solo Prisma y `$queryRaw` como template tag                             | `src/lib/sql-safety.test.ts`, `src/test/sql-injection.db.test.ts`, ESLint |
| A05 XSS                  | Escape de React + CSP que bloquea scripts sin nonce                     | `src/lib/csp.test.ts`                                                     |
| A06 Diseño inseguro      | Rate limits, SSRF bloqueado en el socket, límites de tamaño             | `src/lib/rate-limit.test.ts`, `src/lib/safe-fetch.test.ts`                |
| A07 Autenticación        | Sesiones revocables, mensajes y tiempos que no revelan cuentas, captcha | `src/actions/auth/*.test.ts`, `src/lib/captcha.test.ts`                   |
| A08 Integridad           | Validación con zod de todo input, uploads firmados con condiciones      | `src/actions/update-profile.test.ts`, tests de cada action                |
| A09 Logging y alertas    | `ErrorLog`/`AppLog` + notificaciones a admins                           | `src/lib/security-alerts.test.ts`                                         |
| A10 Condiciones anómalas | Errores genéricos en producción, fallos que cierran                     | `src/lib/rate-limit-messages.test.ts`, tests de actions                   |

---

## A01 Control de acceso

**El riesgo.** Una server action es un endpoint HTTP: se puede llamar desde la consola del
navegador con cualquier argumento, aunque ningún formulario lo mande.

**Cómo nos defendemos.**

- Cada action valida la sesión o los permisos adentro, no en la página que la usa:
  `requireAdmin` / `getAdminUser` (`src/lib/admin.ts`), `requireEventManager` y
  `canManageSomeEvent` (`src/lib/event-access.ts`), `canEditEvent` / `canDeleteEvent`
  (`src/lib/event-permissions.ts`), `requireSessionUser` (`src/actions/projects/get-session-user.ts`).
- Editar o borrar algo por id (charla, proyecto, consejo, comentario, inscripción, foto) carga la
  fila de la base y verifica el dueño o el rol **sobre esa fila**, nunca sobre un `authorId` que
  mande el cliente. El autor de lo que se crea sale siempre de la sesión.
- Lo sensible no sale de la base salvo que se pida: el cliente de Prisma omite por defecto el hash
  de la contraseña y el teléfono de los oradores (`omit` en `src/lib/prisma.ts`).
- Las búsquedas que devuelven datos de contacto tienen tope en el servidor
  (`searchUsersForSpeaker` devuelve 20 como máximo, mande lo que mande el navegador).
- **SSRF** (en 2025 es parte de A01): toda URL que elige un usuario y el servidor pide (la web de
  un proyecto, la foto de un perfil para la imagen OG) pasa por `safeFetch` (`src/lib/safe-fetch.ts`).
  Solo http(s), y la IP se valida **al conectar el socket**, con la misma respuesta DNS que usa la
  conexión: un dominio que primero resuelve a una IP pública y después a `169.254.169.254` (DNS
  rebinding) no pasa. Cada redirect se valida de nuevo y el body se corta a un tamaño máximo.
  La excepción son las notificaciones push: el servidor le hace POST al `endpoint` que manda el
  navegador, a través de la librería `web-push`. Ese endpoint solo se acepta si es HTTPS a uno de
  los servicios de push de los navegadores (Google, Mozilla, Apple, Microsoft;
  `src/lib/push-endpoints.ts`), al guardarlo y de nuevo al enviar.
- Los `?redirect=` del login pasan por `safeRedirectPath` (`src/lib/safe-redirect.ts`): solo rutas
  del mismo sitio.
- Descargas de la galería: el path se valida contra traversal (`/api/galeria/[id]/descargar`).

**Tests.** `src/lib/server-action-auth.test.ts` lee el AST de cada export de cada archivo
`'use server'` y falla si no llega a un helper de sesión o permisos, salvo que esté en
`PUBLIC_ACTIONS` con el motivo (hoy 26: login, registro, recuperar contraseña y lecturas de lo que
ya es público). Una action nueva sin chequeo rompe el test hasta que alguien decida a conciencia que
es pública. Además cada action tiene tests de "sin sesión", "sin permiso" y "otro usuario".

**Lo que encontramos y arreglamos en la auditoría.**

| Hallazgo                                                                                         | Severidad | Arreglo                                                             |
| ------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------- |
| `updateProfile` guardaba el objeto del cliente tal cual: cualquiera podía mandar `role: 'ADMIN'` | Crítica   | Se valida con `profileSchema`, que descarta campos ajenos al perfil |
| `updateProfile` cambiaba el email sin verificar la dirección nueva                               | Media     | El email ya no se cambia desde el perfil (campo de solo lectura)    |
| `searchUsersForSpeaker` aceptaba cualquier `limit`: emails y teléfonos de todos                  | Media     | Tope de 20 en el servidor                                           |
| `isEmbeddable` validaba el DNS y `fetch` resolvía de nuevo (DNS rebinding)                       | Baja      | `safeFetch` valida en el socket                                     |
| La imagen OG del perfil descargaba la foto sin chequeo de IP ni de tamaño                        | Baja      | `safeFetch` con `maxBytes`                                          |
| `fetchAllAnnouncements` (borradores) confiaba en que la página chequeara admin                   | Baja      | `requireAdmin()` adentro                                            |
| Páginas con `'use server'` arriba: cada export pasaba a ser un endpoint                          | Baja      | Se quitó la directiva                                               |

## A02 Configuración de seguridad

- Headers en todas las respuestas (`next.config.mjs`): `Strict-Transport-Security` con
  `includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` sin cámara, micrófono
  ni geolocalización, y `poweredByHeader: false`.
- **CSP con nonce** en cada página (`src/proxy.ts` + `src/lib/csp.ts`):
  `script-src 'self' 'nonce-<aleatorio>' 'strict-dynamic'`, `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, `worker-src 'self'`. El nonce
  es nuevo en cada request; Next se lo pone a sus scripts y el layout al script inline del `<head>`
  y al de `next-themes`. Imágenes, estilos, iframes y conexiones no se restringen (el sitio embebe
  mapas, videos y webs de proyectos, y sube directo a S3).
- `/_next/image` solo optimiza imágenes de hosts conocidos (`images.remotePatterns`), y del bucket
  propio, nunca de cualquier `*.amazonaws.com`.
- `serverActions.allowedOrigins` incluye el dominio público. Hoy el dominio apunta directo al
  servidor, pero si el sitio pasa detrás de CloudFront el Host va a ser
  `origin.programaconnosotros.com`, y así el chequeo CSRF de Next (compara `Origin` con `Host`)
  sigue funcionando.
- Producción no muestra mensajes de error ni stacks: Next manda un digest genérico.

**Tests.** `src/lib/csp.test.ts` (sin `unsafe-inline` ni `unsafe-eval` en producción, nonce de 128
bits distinto cada vez) y `src/proxy.test.ts` (el nonce del request y el de la respuesta coinciden,
el proxy corre en páginas y no en archivos estáticos ni en la API).

## A03 Cadena de suministro

- `pnpm-lock.yaml` versionado e instalación con `--frozen-lockfile` en el deploy.
- `pnpm.overrides` en `package.json` fuerza versiones parcheadas de dependencias transitivas con
  vulnerabilidades conocidas (por ejemplo `deepmerge-ts` y `mysql2` que trae el CLI de Prisma).
- Dependabot (`.github/dependabot.yml`) abre PRs los lunes para paquetes vulnerables o
  desactualizados. **No corre tests en CI**: cada PR se prueba localmente antes de mergear.
- Antes de agregar una dependencia, revisar `pnpm audit` y que esté mantenida.
- Alertas abiertas sin versión corregida publicada, que no tienen override posible:
  - `braces` 3.0.3 (DoS con patrones muy anidados): la trae `micromatch` vía `fast-glob` de
    `eslint-config-next`, solo al lintear, con los globs fijos de la config. Nunca recibe input de
    usuarios.
  - `sprintf-js` 1.0.3 (DoS con precisión sin límite): la trae `argparse` 1 vía `js-yaml` 3 de la
    cobertura de Jest. Solo corre en los tests locales.

## A04 Criptografía

- Contraseñas con bcrypt de costo 12 (`src/lib/password.ts`); los hashes viejos se regeneran al
  iniciar sesión.
- Sesiones: la cookie lleva un token aleatorio de 256 bits y la base guarda solo su SHA-256
  (`src/lib/session.ts`). Quien lea la tabla `Session` no puede usar esos ids.
- Cookie `httpOnly`, `secure` en producción, `sameSite=lax`.
- Códigos de verificación con `crypto.randomInt`, no `Math.random`.
- URLs firmadas de CloudFront y S3 para fotos y uploads. Si el sitio pasa detrás de CloudFront, el
  secreto que prueba que un request vino de ahí se compara con `timingSafeEqual`.
- TLS hasta el servidor (kamal-proxy con Let's Encrypt) y del servidor a Postgres según `sslmode`
  (ver `docs/migracion-prisma-7.md`).

## A05 Inyección (SQL y XSS)

### SQL injection

**Cómo nos defendemos.** A la base solo se le habla con la API de Prisma, que manda siempre los
valores como parámetros, o con `$queryRaw` / `$executeRaw` como **template tag**:
`` prisma.$queryRaw`... WHERE email = ${email}` `` se envía como `WHERE email = $1` con el valor
aparte. Nunca se arma SQL concatenando strings.

**Prohibido** (ESLint lo marca como error y el test falla):

- `$queryRawUnsafe` y `$executeRawUnsafe`.
- `Prisma.raw(...)`, que mete texto tal cual en la query.
- `$queryRaw(...)` como función con algo que no sea un `` Prisma.sql`...` ``.
- Importar un driver o query builder que no sea Prisma (`pg`, `postgres`, `knex`, `kysely`,
  `sequelize`, `typeorm`, `drizzle-orm`, `mysql2`).

Si alguna vez hace falta un nombre de columna u orden dinámico (que no se puede parametrizar), se
elige de una allowlist de fragmentos fijos con `Prisma.sql`, nunca desde el input.

**Tests.**

- `src/lib/sql-safety.test.ts` (corre con `pnpm test`): recorre el AST de todo `src/` y falla ante
  cualquiera de las formas prohibidas. Lee código, no texto, así que las guías que hablan de estas
  APIs no cuentan. Incluye casos que prueban que el detector sí las detecta y que `Prisma.sql` deja
  cada valor como parámetro (`$1`, `$2`) y nunca en el texto.
- `src/test/sql-injection.db.test.ts` (corre con `pnpm test:db`, contra Postgres real): manda 12
  payloads clásicos (tautologías, `DROP TABLE`, `UNION SELECT`, `UPDATE ... role = 'ADMIN'`,
  `pg_sleep`, comodines de `LIKE`) por login, recuperar contraseña, consejos, comentarios, perfil,
  proyectos, búsqueda, resúmenes de usuario y las queries crudas de métricas. Verifica que nadie
  inicia sesión, que el texto se guarda idéntico, que ninguna query se demora y que las tablas
  siguen intactas y sin admins nuevos. Un control demuestra que los mismos payloads **sí** rompen
  una query armada concatenando, para que el verde signifique algo.

### XSS

- React escapa todo lo que se renderiza. `dangerouslySetInnerHTML` solo se usa con contenido que
  no viene de usuarios: el script del `<head>`, el CSS del splash, el HTML que genera Shiki (que
  escapa el código) y los SVG de Mermaid generados desde definiciones del repo.
- La CSP con nonce (A02) es la segunda barrera: aunque se colara HTML sin escapar, el navegador no
  ejecuta scripts sin el nonce del request ni carga scripts de otros dominios.
- Las fotos de perfil tienen que ser URLs `https://` (no `javascript:` ni `data:`).

## A06 Diseño inseguro

- Rate limits por formulario (`src/lib/rate-limit.ts`): login, registro, envío y verificación de
  códigos, contenido, comentarios, ediciones, inscripciones, uploads, descargas, logs y visitas.
  Cuentan por usuario o por IP; la IP sale de la última entrada de `x-forwarded-for` (la que agrega
  kamal-proxy) o, si el sitio pasa detrás de CloudFront, de `cloudfront-viewer-address` validado
  con un secreto; nunca de las que puede escribir el cliente (`src/lib/client-ip.ts`).
- Los endpoints que se llaman sin login tienen tope de tamaño en cada campo (`trackPageVisit`,
  logs del cliente) para que nadie llene la base.
- Los textos libres del perfil tienen largo máximo.
- Los códigos de verificación vencen y tienen límite de intentos por código.

## A07 Autenticación

- Sesiones del lado del servidor, revocables: cerrar sesión borra la fila y la cookie deja de
  servir aunque alguien la haya copiado. Vencen a los 30 días.
- Contraseñas de 8 caracteres como mínimo.
- El login responde igual para "no existe" y "contraseña incorrecta", y **tarda lo mismo**: sin
  usuario se compara contra un hash falso del mismo costo (`DUMMY_PASSWORD_HASH`).
- Recuperar contraseña responde igual exista o no la cuenta, y la espera para pedir otro código
  también es la misma.
- El email no se cambia desde el perfil, porque quedaría marcado como verificado sin prueba.
- **Captcha** en el login, el registro y recuperar contraseña (`src/lib/captcha.ts`): ALTCHA, una
  prueba de trabajo que resuelve el navegador solo al abrir el formulario, sin terceros ni cookies
  de rastreo. Cada intento automatizado le cuesta CPU al bot, además del rate limit. Los desafíos
  salen de `GET /api/captcha` firmados con HMAC (clave derivada de `TWO_FACTOR_ENCRYPTION_KEY`,
  separada por dominio), vencen a los 10 minutos y cada uno sirve una sola vez. Las actions lo
  verifican antes de mirar la contraseña o mandar un mail.
- **Verificación en dos pasos opcional** (`/perfil`): códigos TOTP de una app de autenticación
  (`src/lib/totp.ts`, RFC 6238 con `node:crypto`) y 10 códigos de recuperación de un solo uso,
  guardados como hash. Con la contraseña correcta el login solo abre un intento de 10 minutos en
  una cookie httpOnly (`TwoFactorChallenge`, guardado como hash como las sesiones); 5 códigos
  incorrectos lo cierran. Un código de la app no se puede reusar (`twoFactorLastStep`). El secreto
  y los códigos están en el `omit` global de Prisma, como la contraseña.
- El secreto TOTP no se puede hashear (hace falta para calcular el código), así que se guarda
  cifrado con AES-256-GCM (`src/lib/two-factor-crypto.ts`) con `TWO_FACTOR_ENCRYPTION_KEY`, que
  vive en los secrets del deploy y no en la base: una base o un backup filtrados solos no alcanzan.
  El id del usuario va como dato asociado, así que copiar el valor a otra fila no sirve. En
  producción el servidor no arranca sin la clave (`src/instrumentation.ts`); en local se usa una
  fija de desarrollo. Cambiar la clave desactiva la app de autenticación de todos: habría que
  re-cifrar los secretos con la nueva. Detalle en `docs/verificacion-en-dos-pasos.md`.

## A08 Integridad de software y datos

- Todo input de server actions se valida con zod (o se toma campo por campo) antes de llegar a
  Prisma. Zod descarta campos desconocidos: no hay mass assignment de `role`, `emailVerified`,
  `authorId` ni similares.
- Uploads a S3 con POST prefirmado: tipo de archivo, tamaño máximo (`content-length-range`),
  carpeta fija y vencimiento de 15 minutos. Las claves se validan para que nadie escriba en la
  carpeta de otro.
- El deploy sale de `main` con `--frozen-lockfile` y una imagen construida en GitHub Actions.

## A09 Logging y alertas

- `ErrorLog` (errores del servidor y del cliente) y `AppLog`, visibles en `/monitoreo` solo para
  admins. Cada registro tiene tope de tamaño.
- **Alertas** (`src/lib/security-alerts.ts`): los admins reciben una notificación cuando

  - el servidor registra un error con un mensaje que no se vio en la última hora;
  - una IP o usuario llega al límite de inicio de sesión, verificación o envío de códigos
    (posible fuerza bruta).

  Cada alerta sale una vez por hora por clave, así un error repetido o un ataque sostenido no
  inundan las notificaciones.

## A10 Manejo de condiciones excepcionales

- Los errores esperados se devuelven como resultado (`{ success: false, error }`), no se lanzan,
  y la UI muestra un mensaje claro (`actionErrorMessage`, `rate-limit-messages.ts`).
- Ante un fallo, se cierra: `safeFetch`, `isEmbeddable` y `loadCardImage` devuelven "no" ante
  cualquier error; los chequeos de permisos lanzan antes de tocar la base.
- Loguear o trackear nunca rompe una página: los errores de esas rutas se silencian.

---

## Servidor MCP y OAuth

`/api/mcp` le da a Claude acceso de admin a todo el sitio, así que tiene su propio servidor OAuth
2.1 (`src/lib/oauth`). El detalle está en [docs/mcp.md](./mcp.md#seguridad). En corto, por
categoría:

- **A01:**
  - Solo admins activos con 2FA, chequeado en cada request; aprobar pide un código de 2FA
    fresco.
  - Cada tool corre como ese admin, a través de las mismas server actions (`runAsUser`).
  - Las conexiones se revocan al degradar, suspender o desactivar a alguien, al resetear su
    contraseña o al apagar su 2FA.
- **A02:**
  - El consentimiento no se puede embeber (`frame-ancestors 'none'`).
  - Todo va con `no-store`.
  - Un `Origin` ajeno recibe 403 en `/api/mcp`.
  - Hay un kill switch, `MCP_ENABLED=false`.
- **A04:**
  - Códigos y tokens de 256 bits, guardados solo como SHA-256.
  - PKCE S256 obligatorio, con comparación en tiempo constante.
- **A06:**
  - Los redirect URIs salen de una allowlist (callbacks de Claude y loopback).
  - El `resource` está atado al token (RFC 8707).
  - El refresh token rota y detecta reuso, con la fila bloqueada contra carreras.
  - Rate limits por IP y por conexión, con topes para escrituras y avisos, y las listas tienen
    tope de 100.
- **A07:** códigos de un solo uso que vencen en 5 minutos, access tokens de 1 hora y refresh de 30
  días.
- **A08:** cada input de tool se valida con zod, y después otra vez con el schema de la action.
- **A09:** registros, autorizaciones, emisiones, revocaciones y escrituras quedan en `AppLog`
  (`[mcp] …`), y hay alertas a los admins.
- **A10:**
  - Los errores de las tools se reducen a mensajes seguros.
  - Un test con canarios garantiza que ninguna tool de lectura devuelve secretos
    (`src/lib/mcp/mcp.db.test.ts`).

## Riesgos aceptados

| Riesgo                                                                       | Por qué lo aceptamos                                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| El registro dice "ese email ya existe"                                       | Es la experiencia esperada al registrarse; el rate limit de registro frena la enumeración masiva.   |
| Rate limits en memoria                                                       | El sitio corre en un solo proceso (Kamal, un servidor). Se reinician con cada deploy.               |
| `braces` vulnerable en el linter (`eslint-config-next`)                      | No hay versión parcheada y solo corre al lintear, nunca en producción.                              |
| `style-src`, `img-src`, `frame-src` y `connect-src` abiertos en la CSP       | El sitio embebe contenido externo y sube a S3; lo que ejecuta código (scripts) sí está restringido. |
| Organizadores de eventos ven email y teléfono de usuarios al cargar oradores | Lo necesitan para contactarlos; tope de 20 resultados por búsqueda.                                 |
| Los tests automatizados no corren en CI                                      | Decisión del equipo por tiempo: corren en el `pre-push` (`pnpm test`) y a mano (`pnpm test:db`).    |
| Cualquiera puede registrar un cliente OAuth del MCP                          | Lo pide el estándar para claude.ai; solo con redirect URIs de la allowlist, 10 por IP por día.      |
| Un token del MCP tiene acceso de admin completo durante su hora              | Es el propósito del servidor; vence en 1 hora, se revoca desde `/admin/conexiones-mcp`.             |

## Cómo correr los chequeos

```bash
pnpm test            # unit + server actions (incluye sql-safety y server-action-auth)
pnpm test:db         # integración contra Postgres real (incluye SQL injection)
pnpm lint            # incluye las reglas que prohíben SQL inseguro
pnpm audit --prod    # vulnerabilidades conocidas en dependencias
```

`pnpm test:db` necesita el Postgres local (`DATABASE_URL`). Crea una base aparte
(`<base>_integration_test`) con todas las migraciones y la borra al terminar; solo corre contra
hosts locales.

## Reglas para código nuevo

1. **Toda server action valida sesión o permisos adentro.** Si es pública, se agrega a
   `PUBLIC_ACTIONS` en `src/lib/server-action-auth.test.ts` con el motivo.
2. **Todo input se valida con zod** antes de Prisma. Nunca `...data` del cliente en un `create` o
   `update`.
3. **Editar o borrar por id**: cargar la fila y verificar dueño o rol sobre esa fila.
4. **SQL**: API de Prisma o `$queryRaw` como template tag. Nada de `Unsafe`, `Prisma.raw` ni
   drivers directos.
5. **URLs de usuarios que pide el servidor**: siempre `safeFetch`.
6. **Nada de scripts inline nuevos**; si hace falta uno, lleva el `nonce` del layout.
7. **Endpoints sin login**: rate limit y tope de tamaño en cada campo.
8. **Datos sensibles** (contraseñas, teléfonos, emails de otros): que no salgan de la base salvo
   que la consulta los pida y quien la hace tenga permiso.
9. **Tools del MCP**: `select` explícitos (nunca `include: { user: true }`), escrituras a través de
   la server action que ya usa la web y el test de canarios (`pnpm test:db -- src/lib/mcp`) en
   verde. Ver [docs/mcp.md](./mcp.md#cómo-agregar-una-tool).
