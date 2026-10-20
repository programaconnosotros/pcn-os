import type { RateLimitName } from '@/lib/rate-limit';

// Sin imports de servidor: lo usan tanto las actions como los componentes de cliente.

const PREFIX = 'RATE_LIMIT';

/**
 * Lo que viaja en el `digest` (y en el mensaje) de un error de rate limit. En producción Next no
 * le pasa al navegador el mensaje de un error lanzado por una server action, pero sí respeta el
 * `digest` si el error ya trae uno, así que es la forma de que la UI sepa qué pasó y cuánto falta.
 */
export const rateLimitDigest = (name: RateLimitName, waitSeconds: number) =>
  `${PREFIX}:${name}:${waitSeconds}`;

/** "45 segundos", "1 minuto", "9 minutos" o "1 hora". */
export const formatWait = (seconds: number) => {
  if (seconds < 60) return seconds === 1 ? '1 segundo' : `${seconds} segundos`;
  if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
  }
  const hours = Math.ceil(seconds / 3600);
  return hours === 1 ? '1 hora' : `${hours} horas`;
};

/**
 * Qué se limitó y por qué, para cada formulario. Cada mensaje explica el motivo (seguridad o
 * evitar spam) y cuánto falta, así nadie piensa que el sitio está roto o que hizo algo mal.
 */
const MESSAGES: Record<RateLimitName, (_wait: string) => string> = {
  signIn: (wait) =>
    `Hubo demasiados intentos de inicio de sesión seguidos. Para proteger tu cuenta pausamos los intentos por un rato: probá de nuevo en ${wait}.`,
  signUp: (wait) =>
    `Se crearon varias cuentas desde tu conexión en poco tiempo. Para frenar cuentas falsas pausamos los registros: probá de nuevo en ${wait}.`,
  sendCode: (wait) =>
    `Ya pediste varios códigos en los últimos minutos. Para evitar que se usen tus emails para mandar spam, esperá ${wait} antes de pedir otro. Mientras tanto, revisá también la carpeta de spam.`,
  verifyCode: (wait) =>
    `Probaste demasiados códigos seguidos. Para que nadie pueda adivinar un código pausamos los intentos: probá de nuevo en ${wait}.`,
  createContent: (wait) =>
    `Publicaste mucho contenido en poco tiempo. Para evitar spam en la comunidad hay un límite por hora: vas a poder publicar de nuevo en ${wait}.`,
  comment: (wait) =>
    `Estás comentando muy seguido. Para evitar spam hay un límite de comentarios: vas a poder comentar de nuevo en ${wait}.`,
  editContent: (wait) =>
    `Hiciste muchos cambios seguidos. Para proteger el sitio hay un límite de ediciones: vas a poder guardar de nuevo en ${wait}.`,
  eventRegistration: (wait) =>
    `Hiciste muchas inscripciones o cancelaciones seguidas. Para cuidar los cupos de los eventos hay un límite: probá de nuevo en ${wait}.`,
  eventBroadcast: (wait) =>
    `Mandaste varios mails a los inscriptos en poco tiempo. Para no saturar sus casillas hay un límite por hora: vas a poder mandar otro en ${wait}.`,
  upload: (wait) =>
    `Subiste muchos archivos en poco tiempo. Para cuidar el almacenamiento hay un límite de subidas: vas a poder subir de nuevo en ${wait}.`,
  photoDownload: (wait) =>
    `Descargaste muchas fotos en poco tiempo. Para que la galería ande rápido para todos hay un límite por hora: vas a poder descargar de nuevo en ${wait}.`,
  log: (wait) => `Demasiados registros seguidos. Probá de nuevo en ${wait}.`,
  // Nunca llega a la UI: las visitas se descartan en silencio al pasar el límite.
  pageVisit: (wait) => `Demasiadas visitas seguidas: probá de nuevo en ${wait}.`,
  // Tampoco llega a la UI: los clics en sponsors pasado el límite no se cuentan, y el link abre igual.
  sponsorClick: (wait) => `Demasiados clics seguidos: probá de nuevo en ${wait}.`,
  galleryUpload: (wait) =>
    `Subiste muchas fotos en la última hora. Para que los admins puedan revisarlas hay un límite: vas a poder subir más en ${wait}.`,
  recommendation: (wait) =>
    `Mandaste muchas recomendaciones en la última hora. Para que los admins puedan revisarlas hay un límite: vas a poder recomendar de nuevo en ${wait}.`,
  aiAgent: (wait) =>
    `Usaste mucho los agentes de IA en la última hora. Cada carga cuesta plata, así que hay un límite: probá de nuevo en ${wait} o cargá los datos a mano.`,
  oauthRegister: (wait) =>
    `Se registraron demasiadas apps desde tu conexión. Para evitar abusos del servidor MCP pausamos los registros: probá de nuevo en ${wait}.`,
  oauthRegisterGlobal: (wait) =>
    `Se están registrando demasiadas apps en el servidor MCP. Probá de nuevo en ${wait}.`,
  oauthAuthorize: (wait) =>
    `Abriste demasiadas autorizaciones seguidas. Por seguridad pausamos la pantalla de conexión: probá de nuevo en ${wait}.`,
  oauthToken: (wait) =>
    `Hubo demasiados pedidos de tokens seguidos. Por seguridad pausamos el servidor de autorización: probá de nuevo en ${wait}.`,
  mcp: (wait) =>
    `Claude hizo demasiados pedidos al servidor MCP en poco tiempo. Para proteger la base pausamos los pedidos: probá de nuevo en ${wait}.`,
  mcpWrite: (wait) =>
    `Esta conexión del MCP ya hizo muchos cambios en la última hora. Por seguridad pausamos las escrituras: probá de nuevo en ${wait}.`,
  mcpNotify: (wait) =>
    `Esta conexión del MCP ya mandó varios avisos a la comunidad en la última hora. Para no llenar de notificaciones a nadie, probá de nuevo en ${wait}.`,
};

/** El mensaje para mostrarle a quien llegó al límite de `name`. */
export const rateLimitMessage = (name: RateLimitName, waitSeconds: number) =>
  MESSAGES[name](formatWait(waitSeconds));

const isRateLimitName = (value: string): value is RateLimitName => value in MESSAGES;

/** El formulario y la espera si `error` es un rate limit (por digest o mensaje); null si no. */
export const parseRateLimitError = (error: unknown) => {
  if (!error || typeof error !== 'object') return null;
  const { digest, message } = error as { digest?: unknown; message?: unknown };

  for (const value of [digest, message]) {
    const match = typeof value === 'string' && /^RATE_LIMIT:(\w+):(\d+)$/.exec(value);
    if (match && isRateLimitName(match[1])) {
      return { name: match[1], waitSeconds: Number(match[2]) };
    }
  }
  return null;
};

/** El mensaje para mostrar si `error` es un rate limit; null si es cualquier otro error. */
export const getRateLimitMessage = (error: unknown) => {
  const rateLimit = parseRateLimitError(error);
  return rateLimit ? rateLimitMessage(rateLimit.name, rateLimit.waitSeconds) : null;
};

// Lo que Next pone en lugar del mensaje real de un error de server action en producción: el texto
// de Next 15 y el error minificado de React que manda Next 16 (#441 y similares).
const isRedactedMessage = (message: string) =>
  message.startsWith('An error occurred in the Server Components render') ||
  message.includes('Minified React error') ||
  message.includes('react.dev/errors/');

/**
 * Texto para avisar que falló una server action: el aviso de rate limit si corresponde; si no,
 * el mensaje del error cuando `showMessage` (las actions que lanzan textos pensados para el
 * usuario) o `fallback`. El mensaje genérico en inglés que Next usa en producción nunca se muestra.
 */
export const actionErrorMessage = (error: unknown, fallback: string, showMessage = false) => {
  const rateLimit = getRateLimitMessage(error);
  if (rateLimit) return rateLimit;

  const message = error instanceof Error ? error.message : '';
  if (showMessage && message && !isRedactedMessage(message)) return message;
  return fallback;
};
