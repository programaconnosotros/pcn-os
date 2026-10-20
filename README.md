# <img src="./public/logo.webp" alt="Logo" width="30"/> Website de programaConNosotros

Este es el repositorio del website de PCN. El website está construido con Next.js. Podés contribuir al proyecto a través de pull requests. Revisa la información a continuación para comenzar a programar con nosotros! 🚀

## 📖 Guía para contribuir

1. Instalar [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/) en tu computadora.

2. Clonar el repositorio.

3. Crear archivo de variables de entorno con el nombre `.env` utilizando `.env.template` como base. Para desarrollar alcanza con completar la base de datos: elegí cualquier valor para `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` (el contenedor la crea con esos datos), y si corrés `pnpm dev` fuera de Docker apuntá `DATABASE_URL` y `DIRECT_URL` a `postgresql://USUARIO:CLAVE@localhost:5432/BASE`. El resto de las variables son opcionales en local; cada una explica en el template para qué sirve.

4. Levantar el servidor de desarrollo con Docker Compose. Utilizamos Docker para que no tengas que instalar Node.js ni ninguna otra dependencia en tu computadora. Para levantar el servidor, ejecutá el siguiente comando en la raíz del proyecto.

   ```bash
   docker-compose up -d
   ```

   > El código dentro del contenedor de Docker se sincronizará con el de tu computadora automáticamente, por lo cual no hace falta ejecutar ningún comando adicional para ver los cambios que hagas en tu código.

   > Si usas Visual Studio Code para desarrollar, hay una configuración para poder desarrollar usando los Dev Containers de Visual Studio Code, los cuales te permiten posicionar tu editor dentro del contenedor, y poder tener una experiencia de desarrollo similar a la que tendrías si estuvieras desarrollando el proyecto localmente en tu computadora sin utilizar Docker. Cuando abras el proyecto en Visual Studio Code, debería avisarte que podés desarrollar dentro del container, si aceptás, se configurará todo automáticamente para que puedas hacerlo.

5. Una vez levantados los contenedores de base de datos y web, tenés que ejecutar las migraciones:
   - Si posees MacOS o Linux simplemente ejecuta el siguiente comando:
   ```bash
   make apply-migrations
   ```
   - Si posees Windows y no podes usar el comando `make`, tendrías que ejecutar lo siguiente:
   ```bash
   docker exec -i pcn-web /bin/sh -c "pnpm apply-migrations"
   ```

> [!IMPORTANT]
> Tenes que usar `pnpm` si o si en este proyecto. Si usas `npm` o `yarn`, vas a tener problemas. Por favor, asegurate de usar `pnpm` para todo lo relacionado a las dependencias del proyecto.
>
> Si desarrollás sin Docker necesitás **Node.js 24** (`nvm use` toma la versión de `.nvmrc`) y **pnpm 10**: la versión exacta está en `packageManager` del `package.json`, y con `corepack enable` se usa esa sola.

6. Elegí una [issue](https://github.com/programaconnosotros/pcn-os/issues) y creá una nueva rama en Git para ir guardando tus cambios (la página se va refrescando automáticamente en tu browser, no hace falta que refresques manualmente).

7. Pusheá tus cambios a GitHub y crea una pull request hacia la rama `testing`, asegurate de que tenga una buena descripción explicando lo que hiciste, con capturas de pantalla o videos si incluyen cambios de UI. Si usás un agente, pedile "abrí la PR": la skill `create-pr` hace todo esto por vos (ver [Desarrollo con agentes](#-desarrollo-con-agentes)).

   Las tareas se organizan con [issues de GitHub](https://github.com/programaconnosotros/pcn-os/issues). Si tu pull request resuelve una issue, mencionala en la descripción con `Closes #<número de la issue>` para que se cierre sola al mergearse.

8. Si queres instalar dependencias de desarrollo, tenes que usar el siguiente comando:

   ```bash
   pnpm add NOMBRE_DEL_PAQUETE
   ```

   pnpm 10 no corre los scripts de instalación de las dependencias salvo las que están en `pnpm.onlyBuiltDependencies` del `package.json`. Si al instalar ves `Ignored build scripts: …` y el paquete los necesita (por ejemplo, para bajar un binario), agregalo a esa lista.

> [!IMPORTANT]
> Todas las contribuciones deben ser realizadas a través de pull requests. No se aceptarán cambios directos en las ramas `main` y `testing`. Las pull requests serán revisadas y aprobadas por los administradores del repositorio, y deben solicitar merge a la rama `testing`, no `main`. Una vez aprobado el testing, se hará merge a `main`.

> [!NOTE]
> Cada vez que creás un commit, Prettier formatea automáticamente los archivos que cambiaste. Antes de cada push se corren el linter (`pnpm lint`), el chequeo de formato (`pnpm format:check`), los tests unitarios (`pnpm test`) y el build (`pnpm build`): si alguno falla, el push no se hace. No tenemos CI que corra los tests, así que este hook es lo que mantiene sana la rama; pedimos disculpas por la demora que agrega al pushear.

> [!NOTE]
> Tenemos un channel en Discord para coordinar el desarrollo del website. Si no estás en el Discord, podes sumarte haciendo click [acá](https://discord.gg/tPZExRnbBP).
>
> También charlamos el desarrollo en un [grupo de WhatsApp](https://chat.whatsapp.com/LAHHq1vtgY6ApnPCyZXX4X): aunque no vayas a programar, podés sumarte a leer o a preguntar lo que quieras.

## 🐰 Code review con CodeRabbit

Cada pull request hacia `testing` recibe una review automática de [CodeRabbit](https://www.coderabbit.ai/). **No tenés que activar nada**: cuando abrís la PR, CodeRabbit publica un resumen de los cambios y deja comentarios en las líneas donde encuentra problemas. Cada vez que pusheás commits nuevos a la misma PR, revisa solo lo que cambió.

La configuración está en [`.coderabbit.yaml`](./.coderabbit.yaml): revisa en español, conoce las reglas del repo (las de [`CLAUDE.md`](./CLAUDE.md) y [`docs/seguridad-owasp.md`](./docs/seguridad-owasp.md)) e ignora los archivos generados.

Hay casos en los que no revisa sola:

- **PRs en borrador (draft):** no se revisan hasta que las marcás como _Ready for review_.
- **PRs de Dependabot:** se saltean para no llenar de ruido las actualizaciones de dependencias.
- **PRs hacia otra rama que no sea `testing`.**

En cualquiera de esos casos, o si querés que vuelva a revisar, comentá en la PR:

| Comentario                  | Qué hace                                                                |
| --------------------------- | ----------------------------------------------------------------------- |
| `@coderabbitai review`      | Revisa los cambios que todavía no revisó.                               |
| `@coderabbitai full review` | Revisa toda la PR de cero.                                              |
| `@coderabbitai pause`       | Deja de revisar los pushes nuevos (`@coderabbitai resume` lo reactiva). |
| `@coderabbitai help`        | Lista todos los comandos.                                               |

También podés responderle a cualquiera de sus comentarios mencionando `@coderabbitai` para preguntarle por qué lo marcó o pedirle una alternativa. Sus comentarios son sugerencias: si no estás de acuerdo con uno, respondé explicando por qué y resolvelo. La aprobación final la dan los administradores del repo.

Si trabajás con un agente, la skill `pr-review` hace una revisión parecida antes de abrir la PR (ver [Desarrollo con agentes](#-desarrollo-con-agentes)), así llegás a CodeRabbit con menos para corregir.

## 🤖 Desarrollo con agentes

El repo está preparado para trabajar con agentes de código como [Claude Code](https://claude.com/claude-code). Las convenciones del proyecto (cómo se escribe el nombre de la comunidad, la caché de datos, las reglas de seguridad, cómo se testea) están en [`CLAUDE.md`](./CLAUDE.md) y [`AGENTS.md`](./AGENTS.md), y el agente las lee solo al empezar cada sesión: no hace falta que se las expliques.

### Skills

Las skills son instrucciones empaquetadas para tareas que se repiten. Viven en `.agents/skills/` (con un symlink en `.claude/skills/`) y se activan pidiéndole la tarea al agente con tus palabras, o escribiendo `/nombre-de-la-skill`.

| Skill                     | Qué hace                                                                                                                                          | Pedile por ejemplo                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `commit`                  | Agrupa tus cambios en commits con [Conventional Commits](https://www.conventionalcommits.org/), uno por cambio lógico.                            | "commiteá los cambios"                 |
| `verify-all`              | Corre todos los checks (ESLint, TypeScript, Prettier, tests unitarios, de integración y e2e, y el build) y te dice qué falló.                     | "verificá que no rompí nada"           |
| `pr-review`               | Revisa tu rama o una PR buscando bugs, problemas de seguridad, convenciones del repo y tests faltantes. En una PR deja los comentarios en GitHub. | "revisá mi rama antes de pushear"      |
| `create-pr`               | Pushea la rama y abre la PR hacia `testing` con título convencional, descripción, checklist y capturas si cambió la UI.                           | "abrí la PR, cierra la issue #123"     |
| `fix-e2e`                 | Encuentra y arregla tests de Playwright que fallan o son inestables.                                                                              | "arreglá los tests e2e"                |
| `verify-docker`           | Construye y prueba las imágenes de Docker (la de producción y el stack de desarrollo).                                                            | "probá que la imagen de Docker anda"   |
| `actualizar-stats-github` | Regenera el snapshot de estadísticas de GitHub que muestra el sitio.                                                                              | "actualizá las stats de GitHub"        |
| `agregar-conversaciones`  | Convierte un export del grupo de WhatsApp en resúmenes para `/conversaciones`.                                                                    | "agregá estas conversaciones" + el zip |

### Flujo recomendado

1. Abrí una sesión en un worktree con `claude -w`: tenés una rama y una base de datos propias, sin pisarte con otras sesiones (ver [Trabajo con worktrees](#-trabajo-con-worktrees-claude-code)).
2. Pasale la issue: "resolvé la issue #123".
3. Revisá lo que hizo en el navegador con `pnpm dev`.
4. "Verificá todo" (`verify-all`) y "revisá mi rama" (`pr-review`) hasta que no queden problemas.
5. "Abrí la PR" (`create-pr`): pushea, saca las capturas de las rutas que cambiaron y las adjunta, y pone `Closes #123` en la descripción.

Igual que con código escrito a mano, sos responsable de lo que entra en la PR: leé el diff antes de pedir la review.

## Trabajo con la base de datos

- Para crear registros de prueba en la base de datos, tenes que ejecutar el siguiente comando:

  ```bash
  pnpm populate-database
  ```

  El script es idempotente: borra y recrea datos de prueba (conserva usuarios por email). Incluye usuarios, consejos, likes, eventos, sponsors, inscripciones, charlas y propuestas, anuncios, testimonios, ofertas de trabajo, comentarios, lenguajes de programación, notificaciones, visitas de página, y logs de errores/aplicación.

  También podés resetear la base y volver a poblarla con:

  ```bash
  pnpm reset-database
  ```

  (aplica migraciones y corre el seed automáticamente).

- Si cambias algún modelo de base de datos, tenes que hacer una migración. Para eso, ejecutá el siguiente comando:

  ```bash
  pnpm create-migration NOMBRE_DE_LA_MIGRACION
  ```

  Después regenerá el diagrama de entidades y relaciones que se muestra en [/desarrollo](https://programaconnosotros.com/desarrollo#base-de-datos), así refleja el esquema nuevo:

  ```bash
  pnpm db:diagram
  ```

  El script (`scripts/generate-db-schema.mjs`) lee el esquema de Prisma y escribe `src/app/(platform)/desarrollo/db-schema.ts` con la fecha de hoy como última actualización. Si agregaste un modelo nuevo, sumalo a la parte del sitio que le corresponde en `DOMAINS` dentro del script; si no, falla avisándote.

- Si pulleaste los cambios de GitHub y hay nuevas migraciones, vas a tener que aplicarlas con el siguiente comando:

  ```bash
  pnpm apply-migrations
  ```

- Prisma ofrece un studio que permite visualizar la base de datos. Para acceder al studio, ejecutá el siguiente comando:

  ```bash
  pnpm prisma-studio
  ```

  Luego vas a poder acceder a la URL [http://localhost:5555](http://localhost:5555) en el navegador web y vas a poder ver la base de datos.

  <img src="./public/prisma-studio-screenshot.webp" alt="Screenshot del Prisma Studio"/>

## 📊 Estadísticas de GitHub

Los números de GitHub que muestra el sitio (estadísticas de colaboración en `/desarrollo`, contribuciones en los perfiles y `/vinculos`) no se piden a la API de GitHub mientras se renderiza: salen de un snapshot versionado en `src/data/github-stats.json`. Para actualizarlo:

```bash
pnpm github:stats
```

El script (`scripts/update-github-stats.mjs`) usa `GITHUB_TOKEN` o el token del CLI `gh` si hay alguno, y funciona sin token también. Algunas estadísticas GitHub las calcula en segundo plano: si el script avisa con un `!` que alguna todavía no estaba lista, esperá un minuto y corrélo de nuevo. Después commiteá el JSON.

Con Claude Code podés pedirle "actualizá las stats de GitHub": la skill `actualizar-stats-github` corre el script, revisa que los números tengan sentido y commitea el snapshot.

## 🔌 Servidor MCP

El sitio tiene un servidor [MCP](https://modelcontextprotocol.io) en `/api/mcp`: conectado a Claude (claude.ai, Claude Desktop o Claude Code), permite consultar todo lo que guarda el sitio y crear o editar eventos, anuncios y recomendaciones. Lo pueden conectar solo admins con la verificación en dos pasos activada, a través de OAuth.

```bash
# Claude Code
claude mcp add --transport http pcn https://programaconnosotros.com/api/mcp
# En local, con pnpm dev
claude mcp add --transport http pcn-local https://pcn-website.localhost/api/mcp
```

En claude.ai: **Settings → Connectors → Add custom connector** con la misma URL. Las conexiones activas se ven y se revocan en `/admin/conexiones-mcp`. Cómo funciona, el catálogo de tools, el modelo de seguridad y cómo agregar una tool: [docs/mcp.md](./docs/mcp.md).

## 🌿 Trabajo con worktrees (Claude Code)

Si usás `claude -w` para abrir sesiones de Claude Code, cada worktree recibe automáticamente su propia base de datos Postgres aislada.

### Cómo funciona

- Al iniciar una sesión (`claude -w`), el hook `SessionStart` ejecuta `scripts/setup-worktree-db.sh` automáticamente.  
  El script:

  1. Deriva el nombre de la base a partir del directorio del worktree (ej. `delightful-skipping-comet` → `pcn_delightful_skipping_comet`).
  2. Crea esa base dentro del contenedor `pcn-db` compartido.
  3. Genera el `.env` del worktree copiando el del checkout principal y apuntando `DATABASE_URL`/`DIRECT_URL` a la nueva base.
  4. Instala dependencias si no existen (`node_modules/`).
  5. Aplica migraciones y ejecuta el seed con datos de prueba.

- Al salir de la sesión y elegir **"remove worktree"**, el hook `WorktreeRemove` ejecuta `scripts/drop-worktree-db.sh` automáticamente y elimina la base de datos del worktree.

Todo esto requiere que el contenedor `pcn-db` esté corriendo:

```bash
pnpm docker:up:dettached
```

### Comandos manuales

Si necesitás provisionar o limpiar un worktree a mano:

```bash
# Crear la base, .env, migraciones y seed para el worktree actual
pnpm setup-worktree-db

# Eliminar la base del worktree actual (o de uno en particular)
pnpm drop-worktree-db
pnpm drop-worktree-db /ruta/al/worktree
```

### Servidor de desarrollo con múltiples worktrees

`pnpm dev` ya usa portless por defecto, por lo que cada worktree obtiene su propia URL `.localhost` automáticamente — sin conflictos de puerto:

```bash
pnpm dev
```

`portless run` detecta automáticamente si estás en un worktree y asigna una URL única por rama:

| Contexto                     | URL                                       |
| ---------------------------- | ----------------------------------------- |
| Checkout principal           | `https://pcn-website.localhost`           |
| Worktree en rama `testing`   | `https://testing.pcn-website.localhost`   |
| Worktree en rama `fix-login` | `https://fix-login.pcn-website.localhost` |

El puerto interno se asigna automáticamente — sin conflictos, sin configuración extra. La primera vez genera un certificado local y lo agrega al sistema de confianza (requiere `sudo` en macOS/Linux).

> [!NOTE]
> portless requiere **Node 24+** (LTS "Krypton"). Si usás `nvm`, ejecutá `nvm use` en la raíz del proyecto para activar la versión correcta (`.nvmrc` ya está configurado). Si desarrollás con Docker, el contenedor sigue usando `next dev` directamente en el puerto 3000 — no necesita portless.

> [!NOTE]
> El `.env` de cada worktree es generado automáticamente y **no se versiona** (está en `.gitignore`). Si el worktree no tiene `.env`, ejecutá `pnpm setup-worktree-db` o iniciá una nueva sesión de Claude Code.

## 🧪 Tests

Los tests corren solo en tu máquina (no hay CI que los corra), así que corrélos antes de abrir la PR:

```bash
pnpm test       # tests unitarios (Jest)
pnpm test:db    # tests de integración contra una base Postgres local descartable
pnpm test:e2e   # tests end-to-end con Playwright
```

El hook de pre-push ya corre `pnpm test`. Si tu cambio toca queries, el esquema o server actions, corré también `pnpm test:db`, y si cambia algo que se ve en el sitio, `pnpm test:e2e`. Con un agente, la skill `verify-all` los corre todos en orden.

## 📧 Emails en desarrollo local

El stack de Docker incluye [MailHog](https://github.com/mailhog/MailHog), un servidor SMTP local que captura todos los emails que envía la aplicación sin entregarlos realmente. Esto te permite probar flujos de email (registro, reseteo de contraseña, códigos de verificación) sin mandar emails reales. En producción los emails salen por [Resend](https://resend.com/), que solo se usa si está definida `RESEND_API_KEY` (no la definas en tu `.env` local).

MailHog se levanta automáticamente junto con los demás contenedores al ejecutar `docker-compose up`. Podés ver los emails capturados en:

[http://localhost:18025](http://localhost:18025)

> [!NOTE]
> El puerto del servidor web de MailHog es `18025` (y no el `8025` por defecto) para evitar conflictos si ya tenés una instancia de MailHog corriendo localmente. El puerto SMTP es `11025`: si corrés `pnpm dev` fuera de Docker, usá `SMTP_HOST=localhost` y `SMTP_PORT=11025` en tu `.env`. El contenedor web siempre usa el MailHog del stack, sin importar lo que diga tu `.env`.

## 🐳 Problemas comunes con Docker

- **Docker Desktop no arranca** (`docker info` devuelve `Internal Server Error`): suele ser que se llenó el disco virtual de Docker (`no space left on device` en sus logs). Subí el límite en Settings → Resources o liberá espacio con `docker system prune` (o Troubleshoot → Clean / Purge data, que borra todas las imágenes y volúmenes).
- **Errores de Turbopack en `pcn-web`** (`panicked`, `conflicting effects for the same key`, chunks que dan 404): recreá el contenedor con su `.next` y `node_modules` limpios:

  ```bash
  docker-compose up -d --force-recreate -V web
  ```

- **`docker-compose down` borra los datos de la base** (el contenedor `pcn-db` no tiene un volumen con nombre). Para frenar el stack sin perderlos usá `docker-compose stop`; si ya los perdiste, `make apply-migrations` y `pnpm populate-database` la dejan como nueva.

## 🛠️ Tech stack

- [Docker](https://www.docker.com/) (contenedores)
- [Node.js](https://nodejs.org/) 24 (entorno de ejecución de JavaScript)
- [pnpm](https://pnpm.io/) 10 (gestor de paquetes)
- [TypeScript](https://www.typescriptlang.org/) (lenguaje de programación)
- [React](https://react.dev/) (librería de JavaScript para construir interfaces de usuario)
- [Next.js](https://nextjs.org/) (framework de React)
- [Tailwind CSS](https://tailwindcss.com/) (estilos de la página)
- [shadcn/ui](https://ui.shadcn.com/) (componentes reusables de React con Tailwind CSS)
- [PostgreSQL](https://www.postgresql.org/) (base de datos)
- [Prisma](https://www.prisma.io/) 7 (ORM y migraciones)
- [Jest](https://jestjs.io/) (tests unitarios y de integración)
- [Playwright](https://playwright.dev/) (tests end-to-end)
- [ESLint](https://eslint.org/) (linting del código)
- [Prettier](https://prettier.io/) (formateo del código)
- [Husky](https://typicode.github.io/husky/) (hooks de pre-commit y pre-push)
- [Resend](https://resend.com/) (envío de emails en producción)
- [Kamal](https://kamal-deploy.org/) (deploy a AWS EC2 con GitHub Actions)
- [Git](https://git-scm.com/) y [GitHub](https://www.github.com/) (control de versiones y colaboración)

## 📁 Estructura de archivos

La estructura de archivos del proyecto sigue las convenciones de Next.js:

```
.
├── src/                 # Directorio principal de la aplicación
│   ├── app/             # Páginas y rutas de API (src/app/api)
│   ├── actions/         # Server actions de Next.js
│   ├── components/      # Componentes React reutilizables
│   ├── data/            # Datos versionados (por ejemplo, el snapshot de GitHub)
│   ├── hooks/           # Hooks de React
│   ├── lib/             # Funciones y utilidades compartidas
│   └── schemas/         # Esquemas de validación con zod
├── prisma/              # Schema, migraciones y seed de Prisma
├── tests/e2e/           # Tests end-to-end de Playwright
├── docs/                # Documentación técnica del proyecto
├── scripts/             # Scripts de desarrollo (worktrees, capturas, stats, diagramas)
├── config/deploy.yml    # Configuración del deploy con Kamal
├── .agents/skills/      # Skills para agentes de código
├── CLAUDE.md            # Convenciones del proyecto para agentes
├── prisma.config.ts     # Configuración del CLI de Prisma (URL de migraciones, seed)
├── public/              # Archivos estáticos accesibles públicamente
├── .env                 # Variables de entorno (no incluido en el repositorio)
├── .env.template        # Plantilla para variables de entorno
├── docker-compose.yml   # Configuración de Docker Compose
├── next.config.mjs      # Configuración de Next.js
├── package.json         # Dependencias y scripts del proyecto
└── tsconfig.json        # Configuración de TypeScript
```

## 📚 Aprender más

En [`docs/`](./docs) está la documentación técnica de cómo funcionan las partes más delicadas del sitio:

- [Seguridad (OWASP Top 10)](./docs/seguridad-owasp.md): las reglas que tiene que cumplir todo código nuevo.
- [Caché de datos](./docs/cache-de-datos.md): cómo se cachean las lecturas y por qué no hace falta invalidar a mano.
- [Migración a Prisma 7](./docs/migracion-prisma-7.md)
- [PCN OS y rendimiento](./docs/pcn-os-y-rendimiento.md)
- [Sistema de eventos](./docs/sistema-eventos.md) y [de testimonios](./docs/sistema-testimonios.md)
- [Verificación en dos pasos](./docs/verificacion-en-dos-pasos.md)

Para aprender más sobre Next.js, revisá su [documentación](https://nextjs.org/docs) y el tutorial [Learn Next.js](https://nextjs.org/learn).
