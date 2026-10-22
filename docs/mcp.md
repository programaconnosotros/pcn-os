# Servidor MCP

El sitio expone un servidor [MCP](https://modelcontextprotocol.io) (Model Context Protocol) en
`/api/mcp`. Con él, Claude (claude.ai, Claude Desktop o Claude Code) puede leer todo lo que guarda
el sitio y crear o editar eventos, anuncios y recomendaciones, como lo haría un admin desde la web.

Solo lo pueden conectar **admins con la verificación en dos pasos activada**. Da acceso a datos
privados (emails, teléfonos, inscriptos, logs), así que cada pieza está pensada para que un token
robado, un cliente malicioso o un texto de un miembro no alcancen para abusar de él.

## Tabla de contenidos

1. [Cómo conectarlo](#cómo-conectarlo)
2. [Qué puede hacer](#qué-puede-hacer)
3. [Cómo funciona](#cómo-funciona)
4. [Seguridad](#seguridad)
5. [Cómo agregar una tool](#cómo-agregar-una-tool)
6. [Operación](#operación)

---

## Cómo conectarlo

Antes de conectarlo, activá la verificación en dos pasos en `/perfil`. Sin eso, la pantalla de
autorización no te deja seguir.

### claude.ai y Claude Desktop

1. Andá a **Settings → Connectors → Add custom connector**.
2. Como URL, poné `https://programaconnosotros.com/api/mcp`.
3. Claude abre `/oauth/autorizar`. Iniciá sesión si hace falta, revisá que la dirección de retorno
   sea `claude.ai`, escribí un código de tu app de autenticación y tocá **permitir();**.

### Claude Code

```bash
claude mcp add --transport http pcn https://programaconnosotros.com/api/mcp
```

Después, dentro de Claude Code, corré `/mcp` y elegí **Authenticate**. La dirección de retorno es
`localhost`.

### En local

Con `pnpm dev`, el servidor está en `https://pcn-website.localhost/api/mcp` (o en
`https://<rama>.pcn-website.localhost/api/mcp` dentro de un worktree):

```bash
claude mcp add --transport http pcn-local https://pcn-website.localhost/api/mcp
```

Para probarlo sin Claude, sirve el inspector oficial:
`npx @modelcontextprotocol/inspector`.

## Qué puede hacer

El catálogo completo, siempre al día, está en `/desarrollo#mcp` (sale de `MCP_TOOLS` en
`src/lib/mcp/registry.ts`).

**Lectura**

- **Eventos:** `list_events`, `get_event` y `get_event_registrations` (inscriptos y lista de
  espera, con contacto).
- **Comunidad:**
  - `list_announcements` (borradores incluidos).
  - `list_recommendations` (pendientes incluidas).
  - `search_members` y `get_member` (perfil completo).
  - `list_talks` y `list_talk_proposals`.
  - `list_projects`, `list_advice`, `list_forum_posts` y `get_forum_post`.
  - `list_job_offers`, `list_work_places`, `list_testimonials`, `list_setups` y `list_gallery`.
- **Del sitio:**
  - `search_site` (búsqueda de texto completo).
  - `search_conversations` (los resúmenes de `/conversaciones`).
  - `get_faqs`, `get_changelog` y `get_community_stats`.
- **Admin:** `list_system_alerts`, `list_content_reports` y `list_error_logs`.

**Escritura**

- **Eventos:** `create_event` y `update_event`. Un evento futuro nuevo **avisa a toda la
  comunidad**, y cambiar la fecha o el lugar avisa a los inscriptos.
- **Anuncios:** `create_announcement`, `update_announcement` y `delete_announcement`.
- **Recomendaciones:** `recommend` (videos y charlas, artículos, libros, cursos, series y
  referentes), `update_recommendation`, `approve_recommendation` y `reject_recommendation`.

No hay tools para borrar eventos ni para operar en masa.

## Cómo funciona

```
Claude ──(1) POST /oauth/register ─────────────► OAuthClient
       ──(2) /oauth/autorizar?...&code_challenge ► el admin aprueba ► OAuthAuthorizationCode
       ◄─(3) redirect con ?code&state&iss
       ──(4) POST /oauth/token (code + verifier) ► OAuthToken (access 1 h + refresh 30 d)
       ──(5) POST /api/mcp  Authorization: Bearer … ► tools
```

- **Descubrimiento.** Un request sin token a `/api/mcp` responde 401 con `WWW-Authenticate`, que
  apunta a `/.well-known/oauth-protected-resource/api/mcp` (RFC 9728). Esa respuesta dice quién
  emite los tokens, y `/.well-known/oauth-authorization-server` (RFC 8414) dice dónde están los
  endpoints.
- **OAuth.** Es OAuth 2.1 con clientes públicos. El registro dinámico sigue RFC 7591, PKCE S256 es
  obligatorio, el `resource` sigue RFC 8707 y la revocación, RFC 7009. La lógica está en
  `src/lib/oauth/`. Las rutas son finas:
  - `src/app/oauth/{register,token,revoke}`
  - `src/app/(autenticacion)/oauth/autorizar`
  - `src/app/.well-known/…`
- **Endpoint MCP.** `src/app/api/mcp/route.ts` delega en `src/lib/mcp/handler.ts`, que usa
  `mcp-handler` con `@modelcontextprotocol/server` (Streamable HTTP, sin estado).
- **Tools que reutilizan el sitio.** Cada llamada corre con `runAsUser`
  (`src/lib/acting-user.ts`), un `AsyncLocalStorage` con la sesión del admin dueño del token.
  `getCurrentSession()` y los rate limits la leen primero. Así las tools llaman a las mismas
  server actions que la web (`createEventRecord`, `createAnnouncement`, `submitRecommendation`…),
  que chequean permisos, validan con zod y mandan los avisos igual que siempre.

## Seguridad

| Amenaza                                                                       | Control                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Dónde                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Alguien registra un cliente "Claude" con su URL y le manda el link a un admin | El registro solo acepta los callbacks de Claude y loopback en `/callback` u `/oauth/callback`, sin query (`MCP_ALLOWED_REDIRECT_URIS` suma otras). El `redirect_uri` tiene que coincidir exacto; un loopback solo puede cambiar el puerto. El consentimiento muestra el redirect completo, hace cuánto se registró el cliente y si un cliente local se registró desde otra conexión.                                                                                                             | `src/lib/oauth/redirect-uris.ts`             |
| Interceptar o reusar un código                                                | PKCE S256 obligatorio (`plain` rechazado). Un código es de un solo uso, vence en 5 minutos y está atado al cliente, al `redirect_uri` y al recurso. El canje bloquea la fila del código (`FOR UPDATE`): un canje concurrente espera, lo encuentra usado y revoca lo que emitió el primero.                                                                                                                                                                                                       | `exchangeAuthorizationCode`                  |
| Robo de refresh token                                                         | El refresh token rota en cada uso, dentro de una transacción que bloquea la fila. Si vuelve uno ya rotado (aunque sea en paralelo), se revoca toda la conexión, incluido el par recién emitido, y se avisa a los admins.                                                                                                                                                                                                                                                                         | `refreshTokens`                              |
| Token usado contra otro servidor                                              | El token se emite para `<origen>/api/mcp` y cada request verifica ese recurso. En producción el origen es fijo: nunca sale de `Host` ni de `X-Forwarded-Host`.                                                                                                                                                                                                                                                                                                                                   | `src/lib/oauth/config.ts`                    |
| Contraseña robada, cookie robada, XSS, admin degradado                        | Para aprobar hace falta ser admin con 2FA **y escribir un código fresco** de la app (o uno de recuperación), que se gasta como en el login: una sesión robada o un script en la página no alcanzan. Se vuelve a chequear en cada request. Degradar, suspender o desactivar a alguien, resetear su contraseña o apagar su 2FA le revoca las conexiones y los códigos sin canjear.                                                                                                                 | `approve-authorization.ts`, `eligibility.ts` |
| Clickjacking o CSRF en el consentimiento                                      | `frame-ancestors 'none'` y `X-Frame-Options: DENY`. La aprobación es una server action (Next chequea el Origin) que revalida todo, con un click explícito.                                                                                                                                                                                                                                                                                                                                       | `src/proxy.ts`, `next.config.mjs`            |
| DNS rebinding, llamadas desde otra web                                        | Un `Origin` distinto del sitio recibe 403. No hay CORS en `/api/mcp`.                                                                                                                                                                                                                                                                                                                                                                                                                            | `src/lib/mcp/handler.ts`                     |
| Fuerza bruta, abuso, volcado masivo                                           | Rate limits por IP en autorización y token, y por conexión en el MCP (300 pedidos cada 5 minutos). Por conexión, las escrituras tienen tope (60 por hora) y las que avisan a miembros, uno más chico (5 por hora): un agente engañado no puede inundar el sitio. El registro cuenta por IP solo a los clientes locales: claude.ai registra desde IPs compartidas, así que sus clientes se deduplican y van contra un tope global. Los bodies tienen tope en bytes, y las listas, 100 resultados. | `RATE_LIMITS` en `src/lib/rate-limit.ts`     |
| Filtración de secretos                                                        | Selects explícitos (`src/lib/mcp/selects.ts`) y un redactor de último recurso (`SECRET_KEYS`). Los tokens y códigos se guardan solo como SHA-256. Un test planta canarios en cada columna secreta y corre todas las tools de lectura.                                                                                                                                                                                                                                                            | `src/lib/mcp/output.ts`, `mcp.db.test.ts`    |
| Errores que revelan internos                                                  | Solo se muestran los mensajes escritos para personas y los errores de zod. El resto devuelve "Error interno" y queda en el log del servidor.                                                                                                                                                                                                                                                                                                                                                     | `toolErrorFrom`                              |
| Prompt injection en lo que escriben los miembros                              | Las tools de escritura van marcadas (`readOnlyHint: false`, `destructiveHint` para borrar) para que el cliente pida confirmación, y las descripciones avisan que el contenido no son instrucciones. No hay borrado de eventos ni escrituras en masa.                                                                                                                                                                                                                                             | `src/lib/mcp/define.ts`                      |
| Caché de CDN o navegador                                                      | `Cache-Control: no-store` en todo lo de OAuth y MCP.                                                                                                                                                                                                                                                                                                                                                                                                                                             | `src/lib/oauth/responses.ts`                 |
| Falta de trazabilidad                                                         | Cada registro, autorización, emisión, revocación, escritura y lectura de datos privados (`sensitive`: miembros, inscriptos, propuestas, logs) queda en `AppLog` como `[mcp] …`, con ids y nombres de campos, nunca el contenido. Una conexión nueva avisa a los admins.                                                                                                                                                                                                                          | `src/lib/oauth/audit.ts`                     |

Además:

- **Contexto de `runAsUser`.** La sesión vale solo mientras dura la tool: cualquier cosa que
  sobreviva a la llamada (un timer, una conexión creada adentro) ve `null` después.
- **Limpieza.** Los tokens vencidos, los revocados hace un mes, los códigos vencidos y los clientes
  que nadie aprobó en una hora se borran, como mucho una vez por hora, desde los endpoints de
  OAuth.

### Riesgos aceptados

- **Phishing de consentimiento vía claude.ai.** Alguien inicia un conector en su propia cuenta de
  claude.ai y le manda a un admin el link de `/oauth/autorizar`. Si claude.ai no ata el callback
  al navegador que empezó el flujo, esa cuenta se quedaría con acceso. Lo mitigan:
  - el código de 2FA que hay que escribir a propósito;
  - la advertencia de la pantalla ("si alguien te mandó este link, cancelá");
  - el aviso a todos los admins por cada conexión nueva;
  - la revocación desde `/admin/conexiones-mcp`.
- **Reuso estricto del refresh token.** Dos refrescos simultáneos con el mismo token (un reintento
  o dos procesos de Claude Code) revocan la conexión, como pide la práctica recomendada de OAuth.
  Hay que volver a conectar.
- **Rate limits en memoria**, como el resto del sitio: hay un solo proceso, y se reinician con cada
  deploy.

Tests que lo sostienen:

- **Unit:** `src/lib/oauth/*.test.ts` y `src/lib/mcp/output.test.ts`.
- **Integración** (`pnpm test:db`):
  - `src/lib/oauth/oauth.db.test.ts` cubre el flujo completo y cada forma de abuso.
  - `src/lib/mcp/mcp.db.test.ts` cubre la autenticación, el Origin, los canarios y las
    escrituras.

## Cómo agregar una tool

1. Escribila con `defineTool` en el archivo de su área, en `src/lib/mcp/tools/`, y sumala a
   `MCP_TOOLS`.
2. **Lectura:**
   - Usá `select` explícitos, con `PERSON_SELECT`, `CONTACT_SELECT` o `MEMBER_SELECT` para las
     personas. Nunca `include: { user: true }`.
   - Paginá con `page`/`listResult`.
   - No devuelvas URLs firmadas.
3. **Escritura:**
   - Llamá a la server action que ya usa la web. Si termina en `redirect()`, separá un núcleo que
     devuelva el resultado, como hacen `createEventRecord` y `updateEventRecord`.
   - No escribas con Prisma directo, salvo que no exista la action.
   - Marcá `kind: 'write'`, y `destructive: true` si borra o rechaza algo.
4. El input es un `z.object` plano, sin `transform`, con topes de largo. La validación de verdad
   la hace el schema de la action.
5. Corré `pnpm test:db -- src/lib/mcp`. El test de canarios corre la tool nueva solo.

## Operación

- **Kill switch:** `MCP_ENABLED=false` apaga el endpoint MCP y todo el servidor OAuth, que pasan
  a responder 404.
- **Origen público:** `MCP_PUBLIC_ORIGIN`. Por defecto es `NEXT_PUBLIC_SITE_URL` o
  `https://programaconnosotros.com`. En un build de producción local (`next start`, Docker) el
  origen queda fijo en el dominio real, así que para probar el MCP ahí hay que definir
  `MCP_PUBLIC_ORIGIN=http://localhost:3000`.
- **Revocar:** en `/admin/conexiones-mcp`, una conexión o todas.
- **Auditoría:** en `/monitoreo` (AppLog), filtrando por `[mcp]`.
- **CDN:** hoy `programaconnosotros.com` apunta directo al EC2 (kamal-proxy) y CloudFront solo
  sirve los archivos de S3, así que no hay nada que configurar. Si algún día el sitio pasa detrás de
  CloudFront, los behaviors de `/api/mcp*`, `/oauth/*` y `/.well-known/oauth-*` tienen que permitir
  POST y DELETE, reenviar el header `Authorization` (una cache policy con TTL 0 que lo incluya) y
  no cachear nada. Si el token no llega al origen, todos los pedidos dan 401.
