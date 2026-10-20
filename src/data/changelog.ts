// Changes shipped to the platform, newest first, written for the people who use it. Authors are
// GitHub logins: /changelog links each one to the PCN profile an admin linked it to in /vinculos.
// Entries with `audience: 'admins'` describe admin-only tools and never reach other users.

export type ChangelogAudience = 'todos' | 'admins';

export interface ChangelogEntry {
  /** YYYY-MM-DD, the day it shipped. */
  date: string;
  /** Section of the site it touches, shown as a tag. */
  area: string;
  title: string;
  description: string;
  /** GitHub logins of whoever built it. */
  authors: string[];
  /** Where to see it. */
  href?: string;
  /** Defaults to everyone. */
  audience?: ChangelogAudience;
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-10-19',
    area: 'admin',
    title: 'Servidor MCP para Claude',
    description:
      'Los admins con verificación en dos pasos pueden conectar Claude (claude.ai o Claude Code) al sitio: consulta eventos, inscriptos, miembros, anuncios, recomendaciones, charlas, foro y logs, y crea o edita eventos, anuncios y recomendaciones. Cada conexión se autoriza con OAuth y se revoca desde /admin/conexiones-mcp.',
    authors: ['agustin-sanc'],
    href: '/desarrollo#mcp',
    audience: 'admins',
  },
  {
    date: '2026-10-17',
    area: 'feed',
    title: 'Bienvenidas con perfil',
    description:
      'Cuando una sola persona se suma a la comunidad en el día, su bienvenida en /feed abre su perfil, para conocerla y saludarla. Los días con varias siguen llevando a /miembros.',
    authors: ['agustin-sanc'],
    href: '/feed',
  },
  {
    date: '2026-10-17',
    area: 'perfil',
    title: 'Vistas previas sin huecos',
    description:
      'Las vistas previas de charlas, artículos, eventos y setups en cada perfil, y los cursos y artículos relacionados de un curso, muestran filas completas en cualquier ancho de pantalla: cuatro en dos columnas, tres en tres, nunca uno solo con un espacio vacío al lado.',
    authors: ['agustin-sanc'],
    href: '/miembros',
  },
  {
    date: '2026-10-17',
    area: 'admin',
    title: 'Ocultar items del feed',
    description:
      'Los admins ven un botón ocultar en cada item de /feed: lo saca del feed y del centro de notificaciones para todos. /admin/feed lista lo oculto para volver a mostrarlo.',
    authors: ['agustin-sanc'],
    href: '/admin/feed',
    audience: 'admins',
  },
  {
    date: '2026-10-16',
    area: 'empleos',
    title: 'Bolsa de trabajo',
    description:
      '/empleos junta las búsquedas laborales que comparte la comunidad: puesto, empresa, modalidad, jornada, seniority y tecnologías, con un botón para postularte. Con sesión iniciada podés publicar la de tu empresa y cerrarla cuando se cubra.',
    authors: ['agustin-sanc'],
    href: '/empleos',
  },
  {
    date: '2026-10-16',
    area: 'foro',
    title: 'Avisos y me gusta en el foro',
    description:
      'Te avisamos cuando responden o le dan me gusta a tu tema, y cuando responden tu comentario. Las respuestas ahora también se pueden marcar con me gusta, y cada aviso te lleva directo a la respuesta.',
    authors: ['agustin-sanc'],
    href: '/foro',
  },
  {
    date: '2026-10-16',
    area: 'comunidad',
    title: 'Reportar contenido',
    description:
      'Si ves algo que no debería estar (spam, algo ofensivo o un ataque a alguien) en el foro, un consejo, un comentario, una foto, un setup, un proyecto o un perfil, tocá reportar: lo revisa el equipo de admins y nunca lo ve quien lo publicó.',
    authors: ['agustin-sanc'],
    href: '/foro',
  },
  {
    date: '2026-10-16',
    area: 'admin',
    title: 'Cola de moderación',
    description:
      '/admin/moderacion muestra los reportes de la comunidad agrupados por contenido, para resolverlos o descartarlos, y cuántas fotos, recomendaciones y propuestas de charlas esperan revisión.',
    authors: ['agustin-sanc'],
    href: '/admin/moderacion',
    audience: 'admins',
  },
  {
    date: '2026-10-16',
    area: 'perfil',
    title: 'Desactivar tu cuenta',
    description:
      'Desde tu perfil podés desactivar tu cuenta. Lo que publicaste sigue en la comunidad sin tu nombre ni tus datos, las fotos y proyectos donde estabas etiquetado siguen ahí sin tu vínculo, y tu email queda libre para volver cuando quieras.',
    authors: ['agustin-sanc'],
    href: '/perfil',
  },
  {
    date: '2026-10-16',
    area: 'comunidad',
    title: 'Bienvenida para quien recién llega',
    description:
      'Al crear tu cuenta te recibe /bienvenida con los primeros pasos (foto, presentación, stack, un evento, un tema en el foro y un consejo), que se tildan solos a medida que los hacés. También llega un email de bienvenida.',
    authors: ['agustin-sanc'],
    href: '/bienvenida',
  },
  {
    date: '2026-10-16',
    area: 'recomendaciones',
    title: 'Recomendá series, películas y creadores de contenido',
    description:
      'Las listas de /series-y-peliculas e /influencers ahora también se arman entre todos: recomendá las tuyas y, cuando un admin las aprueba, aparecen junto a las de siempre.',
    authors: ['agustin-sanc'],
    href: '/series-y-peliculas',
  },
  {
    date: '2026-10-16',
    area: 'búsqueda',
    title: 'Un buscador que ignora las tildes',
    description:
      'Buscar "programacion" ahora encuentra "Programación", y las palabras pueden ir en cualquier orden. Además encuentra respuestas del foro, anuncios, lugares, ofertas de trabajo y cada sección de las guías de entrevistas.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-16',
    area: 'feed',
    title: 'Más novedades en el feed',
    description:
      'El /feed suma los temas nuevos del foro, los consejos, los anuncios, los testimonios, los lugares, las ofertas de trabajo y quiénes se sumaron a la comunidad cada día.',
    authors: ['agustin-sanc'],
    href: '/feed',
  },
  {
    date: '2026-10-16',
    area: 'notificaciones',
    title: 'Avisos de insignias, proyectos y testimonios',
    description:
      'Te avisamos cuando ganás una insignia, cuando te suman al equipo de un proyecto y cuando destacan tu testimonio en la home.',
    authors: ['agustin-sanc'],
    href: '/notificaciones',
  },
  {
    date: '2026-10-16',
    area: 'seguridad',
    title: 'Captcha contra bots al iniciar sesión',
    description:
      'Iniciar sesión, crear una cuenta y recuperar la contraseña tienen un captcha que se resuelve solo en tu navegador: no hay que elegir semáforos, solo esperar un segundo a que diga verificado. Frena a los bots que prueban contraseñas o crean cuentas en masa.',
    authors: ['agustin-sanc'],
    href: '/iniciar-sesion',
  },
  {
    date: '2026-10-15',
    area: 'lugares',
    title: 'Lugares para laburar',
    description:
      '/lugares junta los cafés, coworks y bibliotecas copados para trabajar que recomienda la comunidad: qué tal el wifi, si hay mesas con enchufes, si se puede tener llamadas y qué tal la comida, con foto opcional y el link al mapa. Con sesión iniciada podés sumar los tuyos.',
    authors: ['agustin-sanc'],
    href: '/lugares',
  },
  {
    date: '2026-10-15',
    area: 'admin',
    title: 'Clics en los sponsors',
    description:
      'Cada clic en el logo o la card de un sponsor (los partners del inicio, /partners y el feed, y los sponsors de cada evento) se cuenta, y /admin/sponsors muestra cuántos recibió cada uno, en total y en los últimos 30 días, y desde dónde.',
    authors: ['agustin-sanc'],
    href: '/admin/sponsors',
    audience: 'admins',
  },
  {
    date: '2026-10-15',
    area: 'eventos',
    title: 'Anuncios de los organizadores',
    description:
      'Quien organiza un evento puede publicar anuncios desde su página (un cambio de aula, qué traer, un horario nuevo): aparecen en el detalle del evento y les llega una notificación a todos los inscriptos.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-10-15',
    area: 'charlas',
    title: 'Ideas para dar una charla',
    description:
      'Si querés dar una charla y no sabés de qué, la pestaña ideas de /charlas tiene temas de web, backend, seguridad, infra, calidad, IA y carrera, con su nivel. Los que usa esta web traen el link a cómo los usa, para contarlos con un caso real.',
    authors: ['agustin-sanc'],
    href: '/charlas?tab=ideas',
  },
  {
    date: '2026-10-15',
    area: 'inicio',
    title: 'Los colaboradores de la web, en el inicio',
    description:
      'El inicio tiene una sección que reconoce a todas las personas que colaboraron en el desarrollo de la web, con su rol y un link a su perfil de PCN.',
    authors: ['agustin-sanc'],
    href: '/#colaboradores',
  },
  {
    date: '2026-10-15',
    area: 'estadísticas',
    title: 'Estadísticas de la comunidad',
    description:
      '/estadisticas muestra quiénes somos según lo que cada miembro cargó en su perfil: los lenguajes, sistemas operativos e IDEs más usados, cuántos usan Linux, las especialidades, de qué países y provincias somos y cuántos se sumaron cada año.',
    authors: ['agustin-sanc'],
    href: '/estadisticas',
  },
  {
    date: '2026-10-15',
    area: 'perfil',
    title: 'Tu stack de software y hardware',
    description:
      'Contá con qué trabajás: además del IDE y los sistemas operativos, tu terminal, shell, gestor de base de datos, navegador y asistente de IA, y en la nueva sección hardware tu notebook, PC, monitor, teclado, mouse, auriculares y celular. Todo aparece en tu perfil.',
    authors: ['agustin-sanc'],
    href: '/perfil',
  },
  {
    date: '2026-10-15',
    area: 'perfil',
    title: 'Tu IDE favorito',
    description:
      'En la sección herramientas del perfil podés elegir tu IDE o editor favorito (VS Code, Cursor, Neovim, IntelliJ y más), y aparece en tu perfil.',
    authors: ['agustin-sanc'],
    href: '/perfil',
  },
  {
    date: '2026-10-15',
    area: 'perfil',
    title: 'Tus sistemas operativos',
    description:
      'En la nueva sección herramientas del perfil podés marcar los sistemas operativos que usás (Windows, macOS, las distros de Linux y más), y se muestran en tu perfil.',
    authors: ['agustin-sanc'],
    href: '/perfil',
  },
  {
    date: '2026-10-15',
    area: 'perfil',
    title: 'El país es obligatorio',
    description:
      'Al crear la cuenta y al editar el perfil el país de origen es obligatorio, y arranca con Argentina elegida.',
    authors: ['agustin-sanc'],
    href: '/perfil',
  },
  {
    date: '2026-10-15',
    area: 'consejos',
    title: 'Editá y eliminá tus comentarios',
    description:
      'Podés editar o eliminar los comentarios que dejaste en un consejo (si abrían un hilo, se eliminan con sus respuestas); los editados se marcan como tales. Los admins pueden eliminar cualquiera.',
    authors: ['agustin-sanc'],
    href: '/consejos',
  },
  {
    date: '2026-10-13',
    area: 'perfil',
    title: 'Timeline en el perfil',
    description:
      'La pestaña timeline de cada perfil muestra todo lo que la persona fue haciendo en la comunidad, mes a mes: proyectos, consejos, charlas, artículos, eventos que organizó, setups, temas del foro, conversaciones, lo que construyó en el sitio, sus badges y el día que se sumó.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-12',
    area: 'seguridad',
    title: 'Política para reportar vulnerabilidades',
    description:
      'El repositorio tiene una política de seguridad (SECURITY.md) con un canal privado para avisar de una vulnerabilidad del sitio, qué entra en el alcance y qué esperar después del reporte, en lugar de abrir un issue público.',
    authors: ['Ismaeldevs'],
    href: '/desarrollo',
  },
  {
    date: '2026-10-12',
    area: 'notificaciones',
    title: 'Notificaciones para todos',
    description:
      'Con sesión iniciada, /notificaciones y la campana te avisan cuando le dan like o comentan uno de tus consejos, cuando te etiquetan en una foto de la galería, cuando te suman como speaker de una charla y cuando se publica un evento nuevo.',
    authors: ['agustin-sanc'],
    href: '/notificaciones',
  },
  {
    date: '2026-10-12',
    area: 'consejos',
    title: 'Los consejos que te gustaron',
    description:
      'Con sesión iniciada, el filtro --liked de /consejos deja solo los consejos a los que les diste like.',
    authors: ['agustin-sanc'],
    href: '/consejos',
  },
  {
    date: '2026-10-12',
    area: 'motivación',
    title: 'Frases motivacionales para tu segundo monitor',
    description:
      'Dejá /motivacion abierta en otro monitor mientras trabajás: muestra una frase sobre una foto de la comunidad y cambia sola cada 5 minutos, con botón de pantalla completa y sin que se apague la pantalla.',
    authors: ['agustin-sanc'],
    href: '/motivacion',
  },
  {
    date: '2026-10-08',
    area: 'miembros',
    title: 'Panel de la comunidad en Miembros',
    description:
      'Miembros arranca con un panel de estado con los números reales de la comunidad (conectados, cofundadores, embajadores, oradores, charlas, organizadores y builders), la curva de crecimiento mes a mes y un muro con la cara de cada miembro.',
    authors: ['agustin-sanc'],
    href: '/miembros',
  },
  {
    date: '2026-10-08',
    area: 'lectura',
    title: 'Recomendá artículos, libros, cursos y videos',
    description:
      'Con recomendar en /lectura, /cursos, /videos y las charlas externas de /charlas podés sumar lo que te sirvió. Un admin lo revisa antes de publicarlo y mientras tanto lo ves como pendiente de revisión.',
    authors: ['agustin-sanc'],
    href: '/lectura',
  },
  {
    date: '2026-10-08',
    area: 'admin',
    title: 'Revisión de recomendaciones',
    description:
      'Lo que recomiendan los miembros espera en /admin/recomendaciones, con aviso a los admins, para completarlo, aprobarlo o rechazarlo. Ahí también se editan o despublican las recomendaciones que ya están en las listas.',
    authors: ['agustin-sanc'],
    href: '/admin/recomendaciones',
    audience: 'admins',
  },
  {
    date: '2026-10-08',
    area: 'métricas',
    title: 'Métricas de cada módulo',
    description:
      'Métricas tiene el detalle de cada módulo: visitas y su cambio, visitantes únicos, quiénes vuelven, qué se hizo ahí (inscripciones, consejos, hilos, fotos, setups, likes…) y sus páginas más vistas. Las visitas de los admins se excluyen por defecto, con un filtro para contarlas.',
    authors: ['agustin-sanc'],
    href: '/metricas',
    audience: 'admins',
  },
  {
    date: '2026-10-08',
    area: 'galería',
    title: 'Subí tus fotos a la galería',
    description:
      'Cualquier miembro puede subir fotos de los eventos a la galería desde subir(). Se publican cuando un admin las revisa y las aprueba.',
    authors: ['agustin-sanc'],
    href: '/galeria/subir',
  },
  {
    date: '2026-10-08',
    area: 'galería',
    title: 'Fotos trabajando',
    description:
      'Nueva pestaña "trabajando" en la galería con fotos de la comunidad en su escritorio, la oficina o una hackatón. Subí las tuyas desde la pestaña "trabajando" de tu perfil.',
    authors: ['agustin-sanc'],
    href: '/galeria?tipo=trabajando',
  },
  {
    date: '2026-10-08',
    area: 'galería',
    title: 'Revisión de fotos de la comunidad',
    description:
      'Las fotos que suben los miembros esperan en /galeria/pendientes, con aviso a los admins, para aprobarlas o rechazarlas de a una o todas juntas.',
    authors: ['agustin-sanc'],
    href: '/galeria/pendientes',
    audience: 'admins',
  },
  {
    date: '2026-10-08',
    area: 'eventos',
    title: 'Completar un evento con sus flyers',
    description:
      'En el formulario de un evento, completarConFlyers() lee los flyers adjuntos con IA y llena los campos vacíos: nombre, descripción, fecha, lugar, links, cupo y sponsors. Si el lugar ya se usó, trae su dirección y su mapa; si un sponsor es partner, su logo.',
    authors: ['agustin-sanc'],
    href: '/eventos/nuevo',
    audience: 'admins',
  },
  {
    date: '2026-10-08',
    area: 'ui',
    title: 'Eventos, charlas, historia y setups más grandes',
    description:
      'Las tarjetas de eventos, las fotos de cada evento en /historia, las charlas y las fotos de los setups se ven más grandes en pantallas anchas. Los títulos de las charlas se leen completos y las fotos horizontales de los setups se muestran enteras.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-10-08',
    area: 'ui',
    title: 'Una sidebar más hacker',
    description:
      'En el diseño clásico, los links de la sidebar se encienden con un panel con scanlines y un haz de luz al pasar el mouse, la página actual queda iluminada, el botón para ocultarla es un pequeño widget de terminal y los controles de abajo comparten sus bordes.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-08',
    area: 'conversaciones',
    title: 'Opiniones como un git log --graph',
    description:
      'Cada línea de tiempo de /conversaciones/opiniones se dibuja como un grafo de commits que cambia de color cuando el grupo cambió de opinión, con el HEAD en la opinión más reciente.',
    authors: ['agustin-sanc'],
    href: '/conversaciones/opiniones',
  },
  {
    date: '2026-10-08',
    area: 'galería',
    title: 'Fotos desde el iPhone',
    description:
      'Las fotos HEIC del iPhone se convierten solas a JPEG al subirlas, y subir fotos desde el iPhone o iCloud es más confiable: cada archivo aparece apenas está listo y los que fallan se pueden reintentar.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-08',
    area: 'eventos',
    title: 'Sponsors con su logo',
    description:
      'Los sponsors de un evento tienen logo y se muestran a color como un muro de agradecimiento después de la descripción. Al cargar un evento, cualquier partner del sitio se suma como sponsor en un clic.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-10-07',
    area: 'charlas',
    title: 'Cargar charlas con solo la foto',
    description:
      'En /charlas, cargarConFoto() recibe una foto de la charla y un agente de IA busca el evento, la propuesta y los oradores, y la carga sola. Si le falta algún dato, abre el formulario precargado para completarlo.',
    authors: ['agustin-sanc'],
    href: '/charlas',
    audience: 'admins',
  },
  {
    date: '2026-10-07',
    area: 'proyectos',
    title: 'Página de cada proyecto',
    description:
      'Cada proyecto de la comunidad tiene su propia página con la descripción completa, el stack, los links y el equipo. Los proyectos del feed, de PCN NEWS y de los perfiles abren directo en esa página.',
    authors: ['agustin-sanc'],
    href: '/proyectos',
  },
  {
    date: '2026-10-07',
    area: 'proyectos',
    title: 'Fotos y videos en los proyectos',
    description:
      'El equipo de un proyecto puede subir capturas y videos de demo a su página. Los videos se optimizan en tu dispositivo antes de subirse, como en la galería.',
    authors: ['agustin-sanc'],
    href: '/proyectos',
  },
  {
    date: '2026-10-07',
    area: 'perfil',
    title: 'Lo que construyó cada contribuidor',
    description:
      'La pestaña de contribuciones de cada perfil lista lo que la persona construyó en la plataforma, con las mismas entradas que aparecen en este changelog.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-07',
    area: 'foro',
    title: 'Foro de la comunidad',
    description:
      'Llegó el foro: categorías, hilos en markdown con vista previa mientras escribís, respuestas anidadas y likes. Los autores editan o borran lo suyo y los admins fijan y cierran hilos. También lista otros foros para developers que vale la pena conocer.',
    authors: ['agustin-sanc'],
    href: '/foro',
  },
  {
    date: '2026-10-07',
    area: 'autenticación',
    title: 'Verificación en dos pasos',
    description:
      'Desde tu perfil podés activar códigos de una app autenticadora (Google Authenticator, 1Password, Authy…) para iniciar sesión, con diez códigos de recuperación por si perdés el celular.',
    authors: ['agustin-sanc'],
    href: '/perfil',
  },
  {
    date: '2026-10-07',
    area: 'ui',
    title: 'Novedades en vivo',
    description:
      'Cuando hay algo nuevo en la comunidad aparece un aviso con su link, el feed muestra un banner para cargar las novedades sin mover la lista y, en el escritorio, una barra inferior pasa los últimos titulares. En la página de un evento, los cupos y la lista de espera se actualizan solos.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-07',
    area: 'conversaciones',
    title: 'Qué opina el grupo de cada tecnología',
    description:
      'En /conversaciones/opiniones, cómo cambió la opinión del grupo sobre 15 tecnologías (Claude Code, Cursor, Codex, MCP, Vercel, Docker…) a lo largo del tiempo, con cada momento enlazado a su conversación. Siempre el grupo, nunca una persona.',
    authors: ['agustin-sanc'],
    href: '/conversaciones/opiniones',
  },
  {
    date: '2026-10-07',
    area: 'testimonios',
    title: 'Testimonios desde las conversaciones',
    description:
      'Los momentos en que alguien le contó al grupo lo que la comunidad significó para esa persona se suman a /testimonios y al inicio, enlazados a su conversación.',
    authors: ['agustin-sanc'],
    href: '/testimonios',
  },
  {
    date: '2026-10-07',
    area: 'consejos',
    title: 'Consejos de las conversaciones y meetups',
    description:
      '347 consejos más sacados de las conversaciones y meetups, ahora con likes y comentarios como cualquier otro. Si un consejo te lo atribuyen a vos, podés ocultarlo desde su detalle.',
    authors: ['agustin-sanc'],
    href: '/consejos',
  },
  {
    date: '2026-10-07',
    area: 'consejos',
    title: 'Categorías en los consejos',
    description:
      'Al publicar un consejo elegís hasta tres categorías o creás una nueva, y también se le suman los temas que se deducen del texto para filtrar por ellos.',
    authors: ['agustin-sanc'],
    href: '/consejos',
  },
  {
    date: '2026-10-07',
    area: 'entrevistas',
    title: 'Entrevistas de liderazgo',
    description:
      'Nuevos tipos de entrevista de tech lead, arquitectura de software, engineering manager y soft skills, con preguntas de junior a senior en el simulador y su guía de preparación.',
    authors: ['agustin-sanc'],
    href: '/entrevistas/guias',
  },
  {
    date: '2026-10-07',
    area: 'videos',
    title: 'Lightning Talks de la comunidad',
    description:
      'Las primeras Lightning Talks de la comunidad, de 2020 y 2021, están en /videos. Los oradores de los videos y los profes de los cursos se vinculan a su perfil, que suma pestañas de videos y cursos.',
    authors: ['agustin-sanc'],
    href: '/videos',
  },
  {
    date: '2026-10-07',
    area: 'galería',
    title: 'Marcá dónde está cada persona en una foto',
    description:
      'Además de etiquetar a alguien en una foto, podés marcar dónde está: los nombres aparecen sobre la foto al pasar el mouse y llevan a cada perfil.',
    authors: ['agustin-sanc'],
    href: '/galeria',
  },
  {
    date: '2026-10-07',
    area: 'especialidades',
    title: 'Quién trabaja en cada especialidad',
    description:
      'Cada especialidad muestra los miembros que la marcaron en su perfil, para que sepas a quién consultarle. Ya podés marcar todas las que quieras.',
    authors: ['agustin-sanc'],
    href: '/especialidades',
  },
  {
    date: '2026-10-07',
    area: 'setups',
    title: 'El software de cada setup',
    description:
      'Un setup puede contar su sistema operativo, navegador, editor, terminal y otras herramientas. Los perfiles suman una pestaña de setups.',
    authors: ['agustin-sanc'],
    href: '/setups',
  },
  {
    date: '2026-10-07',
    area: 'logros',
    title: 'Nuevos badges',
    description:
      'Top speaker para quien dio más charlas, alma del grupo para quien participó en más conversaciones interesantes y top consejero para quien tiene más consejos. El badge de 100 conversaciones ahora se llama Locuaz.',
    authors: ['agustin-sanc'],
    href: '/logros',
  },
  {
    date: '2026-10-07',
    area: 'perfil',
    title: 'Tus contribuciones al sitio',
    description:
      'La pestaña de contribuciones de cada perfil resume los PRs mergeados por tipo (features, fixes, diseño, tests…) y el feed anuncia la primera contribución de cada developer.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-07',
    area: 'búsqueda',
    title: 'Búsqueda en todo el sitio',
    description:
      'La búsqueda ahora también encuentra perfiles, historia, setups, fotos, testimonios, herramientas, preguntas frecuentes, partners y el changelog.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-07',
    area: 'ui',
    title: 'Todos los atajos de teclado',
    description:
      'Apretá ? en cualquier página para ver todos los atajos agrupados por dónde funcionan, con un filtro. También se abre desde el menú de PCN OS y el de tu usuario.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-07',
    area: 'os',
    title: 'Ventanas a media pantalla y notificaciones en PCN OS',
    description:
      'Arrastrá una ventana contra un borde para que ocupe la mitad del escritorio; dos ventanas lado a lado comparten un divisor que las redimensiona. La barra de menú suma una campana con las novedades.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-07',
    area: 'eventos',
    title: 'Email a los inscriptos',
    description:
      'Desde las inscripciones de un evento, escribí un mensaje y mandalo a los confirmados, a la lista de espera o a todos.',
    authors: ['agustin-sanc'],
    audience: 'admins',
  },
  {
    date: '2026-10-07',
    area: 'usuarios',
    title: 'Suspender o eliminar cuentas',
    description:
      'Los admins pueden suspender una cuenta, que deja de poder iniciar sesión al instante y desaparece del sitio, o eliminarla con todo su contenido.',
    authors: ['agustin-sanc'],
    href: '/usuarios',
    audience: 'admins',
  },
  {
    date: '2026-10-07',
    area: 'desarrollo',
    title: 'Decisiones de arquitectura',
    description:
      '/desarrollo suma nueve ADRs (stack, base de datos, deploy, caché, emails…) con su contexto, la decisión, sus consecuencias y las alternativas descartadas.',
    authors: ['agustin-sanc'],
    href: '/desarrollo',
  },
  {
    date: '2026-10-07',
    area: 'galería',
    title: 'Galería más grande y más rápida',
    description:
      'La galería y la pestaña de galería del perfil muestran fotos más grandes. Al ver una foto, la anterior y la siguiente se precargan para pasar entre ellas al instante, y las fotos anchas y las altas se acomodan distinto.',
    authors: ['agustin-sanc'],
    href: '/galeria',
  },
  {
    date: '2026-10-07',
    area: 'perfil',
    title: 'Charlas y eventos en el perfil',
    description:
      'Las pestañas de charlas y eventos organizados del perfil se ven como en /charlas y /eventos: portadas más grandes, títulos completos y flyers a tamaño grande.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-07',
    area: 'feed',
    title: 'Feed en una sola columna',
    description:
      'El feed se lee de arriba abajo en una columna y, en pantallas anchas, al lado quedan fijos el próximo evento, los últimos anuncios y los partners.',
    authors: ['agustin-sanc'],
    href: '/feed',
  },
  {
    date: '2026-10-07',
    area: 'ui',
    title: 'Calendario propio para elegir fechas',
    description:
      'Los campos de fecha usan un calendario con estilo de terminal en lugar del del navegador: escribís la fecha o la elegís en el panel, también con el teclado.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-07',
    area: 'ui',
    title: 'Pantallas de carga con la forma de cada página',
    description:
      'Mientras una página carga se ve un esqueleto con su mismo diseño, así el contenido aparece sin saltos.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-06',
    area: 'ui',
    title: 'Emails con estilo de terminal',
    description:
      'Los emails de la plataforma se ven como una ventana de terminal de PCN OS, con el banner de PCN y un log de lo que acaba de pasar, y llegan de parte de programaConNosotros.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-04',
    area: 'os',
    title: 'Sesión al día en el escritorio',
    description:
      'Si iniciás sesión desde una ventana de PCN OS, la barra del escritorio se actualiza enseguida y deja de mostrar "Iniciar sesión".',
    authors: ['luki1qq'],
  },
  {
    date: '2026-10-04',
    area: 'infra',
    title: 'El sitio carga más rápido',
    description:
      'Eventos, charlas, galería, consejos, proyectos, miembros, perfiles, logros y la búsqueda se sirven desde un caché que se actualiza apenas cambia algo, así que la mayoría de las páginas ya no esperan a la base de datos.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-04',
    area: 'autenticación',
    title: 'Más protección contra scripts maliciosos',
    description:
      'Cada página solo ejecuta los scripts propios del sitio, así que si alguien lograra inyectar código no podría correrlo.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-04',
    area: 'admin',
    title: 'Alertas de errores y ataques',
    description:
      'Los admins reciben una notificación cuando el servidor registra un error nuevo o cuando alguien supera los límites de intentos de ingreso o de códigos de verificación, como mucho una vez por hora por cada caso.',
    authors: ['agustin-sanc'],
    audience: 'admins',
  },
  {
    date: '2026-10-04',
    area: 'infra',
    title: 'Imágenes más livianas y consultas más rápidas',
    description:
      'Las imágenes más pesadas del sitio se comprimieron (de 77 MB a 17 MB), la base de datos tiene índices para las consultas más frecuentes y la app quedó lista para servirse detrás de CloudFront. Los emails salen por Resend.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-04',
    area: 'desarrollo',
    title: 'Calidad del proyecto en /desarrollo',
    description:
      '/desarrollo/calidad explica cómo se testea el sitio y muestra la cobertura de tests por carpeta.',
    authors: ['agustin-sanc'],
    href: '/desarrollo/calidad',
  },
  {
    date: '2026-10-03',
    area: 'metricas',
    title: 'Métricas abiertas a todos',
    description:
      'La app Métricas ahora es pública: cualquiera puede ver el tráfico del sitio, los módulos y páginas más usados, el funnel de registro y el engagement de la comunidad. Los números se actualizan cada hora.',
    authors: ['agustin-sanc'],
    href: '/metricas',
  },
  {
    date: '2026-10-03',
    area: 'entrevistas',
    title: 'Entrevistas de seguridad informática',
    description:
      'Nuevo tipo de entrevista de seguridad informática (AppSec, pentesting y defensa) en el simulador, con preguntas para junior, semi-senior y senior y su guía de preparación. La guía recomienda los cursos de seguridad ofensiva y Blue Team de Endpoint Consulting, partner de la comunidad.',
    authors: ['agustin-sanc'],
    href: '/entrevistas/guias/security',
  },
  {
    date: '2026-10-03',
    area: 'entrevistas',
    title: 'Práctica de live coding',
    description:
      'Nueva sección de live coding en entrevistas: enunciados como los de una entrevista real para resolver por tu cuenta y problemas de LeetCode recomendados para cada tecnología y seniority, más una guía de cómo encarar un live coding. Marcá lo que ya resolviste para seguir tu progreso.',
    authors: ['agustin-sanc'],
    href: '/entrevistas/live-coding',
  },
  {
    date: '2026-10-03',
    area: 'entrevistas',
    title: 'Guías de preparación para entrevistas',
    description:
      'Cada tipo de entrevista tiene su guía de estudio: cómo suele ser el proceso, los temas que más se preguntan de junior a senior y qué tenés que poder explicar. Marcá cada sección como leída para seguir tu progreso y, cuando termines, ponete a prueba en el simulador.',
    authors: ['agustin-sanc'],
    href: '/entrevistas/guias',
  },
  {
    date: '2026-10-02',
    area: 'eventos',
    title: 'Lista de espera en los eventos',
    description:
      'Si un evento se llena, ahora podés sumarte a la lista de espera y ver en qué lugar de la fila estás. Cuando alguien cancela, la primera persona de la lista queda inscripta sola y le llega un email avisándole.',
    authors: ['FedericoV21', 'gmanavarro', 'agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-10-02',
    area: 'setups',
    title: 'Compartí tu setup',
    description:
      'Nueva sección para mostrar dónde programás: subí una foto de tu escritorio con un título y una descripción, y mirá los setups del resto de la comunidad, ordenados por recientes o por los que tienen más me gusta.',
    authors: ['nicofuentesg', 'agustin-sanc'],
    href: '/setups',
  },
  {
    date: '2026-10-02',
    area: 'ui',
    title: 'Instalá PCN como app',
    description:
      'La web se puede instalar en el celu o la compu y abre como una app, con accesos directos a eventos, conversaciones, cursos y lectura. Sin conexión muestra una pantalla propia con una trivia de programación y vuelve sola a la página cuando regresa la red.',
    authors: ['shadownrx', 'agustin-sanc'],
  },
  {
    date: '2026-10-02',
    area: 'inicio',
    title: 'Cartelera de próximos eventos',
    description:
      'La sección de eventos del inicio es una cartelera: el próximo evento va adelante con su flyer, cuenta regresiva, lugar e inscripción, y al lado los que siguen. Si no hay eventos próximos muestra los últimos tres.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2026-10-02',
    area: 'inicio',
    title: 'Inicio con más vida',
    description:
      'Las tarjetas de historia y galería rotan fotos de la comunidad, los artículos sugeridos muestran la foto de perfil de quien los escribió, las entrevistas muestran cada tipo y tecnología con link directo, se presentan los logros y los logos de partners brillan con efecto neón.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2026-10-02',
    area: 'galería',
    title: 'Dónde se sacó cada foto',
    description:
      'Las fotos de un evento muestran el lugar y la ciudad con link al mapa (u "online"). Las flechas para pasar de foto ya no tapan la imagen y la página de una foto carga con su propio esqueleto.',
    authors: ['agustin-sanc'],
    href: '/galeria',
  },
  {
    date: '2026-10-02',
    area: 'ui',
    title: 'Atajos h y l',
    description:
      'h y l funcionan como las flechas ← y →: pasan de foto en la galería, mueven carruseles y hacen scroll horizontal.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-02',
    area: 'perfil',
    title: 'Estudios en su propio bloque',
    description:
      'Carrera e institución se muestran en un bloque de estudios, igual que trabajo; las redes sociales pasan a ser solo íconos para que entren todas y los badges dejan de repetirse al lado del nombre.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-02',
    area: 'autenticación',
    title: 'Límites que explican por qué',
    description:
      'Cuando un formulario te frena por hacer muchos intentos seguidos, ahora te dice qué se limitó, por qué y en cuánto tiempo podés volver a intentar.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-02',
    area: 'autenticación',
    title: 'Cuentas y datos más protegidos',
    description:
      'Las contraseñas se guardan con un hash más fuerte, el email y el teléfono de los perfiles solo los ven miembros con sesión iniciada y se reforzaron el ingreso, el registro y la recuperación de contraseña.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-02',
    area: 'metricas',
    title: 'Métricas de producto',
    description:
      'Nueva app Métricas para admins: tráfico, módulos y páginas más usados, funnel de registro con el paso donde se pierde la gente, horarios, fuentes, dispositivos y engagement, filtrando por fechas y comparando con el período anterior.',
    authors: ['agustin-sanc'],
    href: '/metricas',
    audience: 'admins',
  },
  {
    date: '2026-10-02',
    area: 'entrevistas',
    title: 'Entrevistas de product engineering y project manager',
    description:
      'Dos tipos de entrevista nuevos: product engineering, con preguntas armadas a partir de los artículos de producto de /lectura, y project manager, de planificación, riesgos, stakeholders y equipos.',
    authors: ['agustin-sanc'],
    href: '/entrevistas',
  },
  {
    date: '2026-10-02',
    area: 'entrevistas',
    title: 'Entrevistas de iOS, Android y React Native',
    description:
      'Las entrevistas de frontend ahora te dejan elegir la tecnología: React.js, iOS (Swift, SwiftUI), Android (Kotlin, Compose) o React Native, cada una con preguntas para junior, semi-senior y senior.',
    authors: ['agustin-sanc'],
    href: '/entrevistas?tipo=frontend',
  },
  {
    date: '2026-10-02',
    area: 'logros',
    title: 'Logros y badges automáticos',
    description:
      'Nueva app Logros: badges que se desbloquean participando (dar charlas, organizar y asistir a eventos, leer, ver charlas, compartir proyectos, aportar código y más), cuánto te falta para cada uno y quiénes ya los tienen. Aparecen solos en tu perfil.',
    authors: ['agustin-sanc'],
    href: '/logros',
  },
  {
    date: '2026-10-01',
    area: 'vinculos',
    title: 'Vincular autores de artículos con miembros',
    description:
      'En vínculos ahora se puede asignar cada autor de /lectura a un miembro: todos sus artículos aparecen en su perfil y figura como escritor en cada uno.',
    authors: ['agustin-sanc'],
    href: '/vinculos',
    audience: 'admins',
  },
  {
    date: '2026-10-01',
    area: 'miembros',
    title: 'Nueva app Miembros para conocer a la comunidad',
    description:
      'Una página para conocer a las personas de PCN: co-founders, ambassadors, quienes dieron charlas, organizaron eventos o construyeron proyectos, con buscador.',
    authors: ['agustin-sanc'],
    href: '/miembros',
  },
  {
    date: '2026-10-01',
    area: 'partners',
    title: 'Partners separados en empresas y organizaciones',
    description: 'La página de partners ahora separa a las empresas de las organizaciones.',
    authors: ['agustin-sanc'],
    href: '/partners',
  },
  {
    date: '2026-10-01',
    area: 'partners',
    title: 'Sponsors ahora es Partners',
    description:
      'La página de sponsors pasa a llamarse partners; los links viejos redirigen solos.',
    authors: ['agustin-sanc'],
    href: '/partners',
  },
  {
    date: '2026-10-01',
    area: 'changelog',
    title: 'Changelog de la plataforma',
    description:
      'Una página con los últimos cambios de la plataforma y quién los hizo, con link a su perfil.',
    authors: ['agustin-sanc'],
    href: '/changelog',
  },
  {
    date: '2026-10-01',
    area: 'os',
    title: 'Nuevo dock de PCN OS',
    description:
      'El dock ahora es una barra de comandos animada: los íconos se agrandan bajo el cursor, el prompt escribe el comando del programa y cada programa muestra su nombre al pasar el mouse.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-10-01',
    area: 'charlas',
    title: 'Charlas de la comunidad renovadas',
    description:
      'Las charlas dadas por la comunidad se buscan, se recorren en una línea de tiempo por año y muestran los flyers completos.',
    authors: ['agustin-sanc'],
    href: '/charlas',
  },
  {
    date: '2026-10-01',
    area: 'conversaciones',
    title: 'Links directos a una conversación',
    description:
      'Un link a una conversación abre directamente su resumen en lugar de filtrar la lista.',
    authors: ['agustin-sanc'],
    href: '/conversaciones',
  },
  {
    date: '2026-10-01',
    area: 'entrevistas',
    title: 'Entrevistas de quality engineering',
    description: 'Nuevas entrevistas de testing manual y automatizado en el simulador.',
    authors: ['agustin-sanc'],
    href: '/entrevistas',
  },
  {
    date: '2026-09-30',
    area: 'entrevistas',
    title: 'Simulador de entrevistas técnicas',
    description:
      'Practicá entrevistas con active recall: una pregunta a la vez, 20 preguntas por entrevista, backends en Node, Python, Java y .NET, ingeniería de IA y agentes, y la opción de terminar cuando quieras.',
    authors: ['agustin-sanc'],
    href: '/entrevistas',
  },
  {
    date: '2026-09-30',
    area: 'proyectos',
    title: 'Publicá tus propios proyectos',
    description:
      'Los miembros pueden publicar sus proyectos, marcarlos como open source con su repo de GitHub y abrirlos dentro de PCN.',
    authors: ['agustin-sanc'],
    href: '/proyectos',
  },
  {
    date: '2026-09-30',
    area: 'proyectos',
    title: 'Orden de proyectos solo para admins',
    description:
      'Los proyectos nuevos se agregan al final y solo los admins pueden reordenar la lista.',
    authors: ['agustin-sanc'],
    href: '/proyectos',
    audience: 'admins',
  },
  {
    date: '2026-09-30',
    area: 'vinculos',
    title: 'Vínculos de identidades',
    description:
      'Asigná miembros de WhatsApp y logins de GitHub a usuarios de la plataforma, para que sus conversaciones y cambios lleven a su perfil.',
    authors: ['agustin-sanc'],
    href: '/vinculos',
    audience: 'admins',
  },
  {
    date: '2026-09-30',
    area: 'admin',
    title: 'Panel de administración en PCN OS',
    description:
      'Tablas compactas estilo terminal en las páginas de administración y una app Panel en el dock para admins.',
    authors: ['agustin-sanc'],
    href: '/admin',
    audience: 'admins',
  },
  {
    date: '2026-09-30',
    area: 'admin',
    title: 'Analíticas y monitoreo compactos',
    description: 'Los dashboards de analíticas y monitoreo muestran más datos en menos espacio.',
    authors: ['agustin-sanc'],
    href: '/analiticas',
    audience: 'admins',
  },
  {
    date: '2026-09-30',
    area: 'perfil',
    title: 'Perfiles con pestañas',
    description:
      'Los perfiles abren en un resumen, con una pestaña por sección: proyectos, charlas, conversaciones y más.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'búsqueda',
    title: 'Búsqueda global con ⌘K',
    description:
      'Buscá eventos, cursos, charlas, conversaciones y más desde cualquier página con ⌘K.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'ui',
    title: 'Atajos de teclado estilo vim',
    description: 'Navegá todas las páginas con el teclado.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'videos',
    title: 'Videos recomendados',
    description:
      'Una página de videos recomendados por la comunidad, con la opción de marcar los que ya viste.',
    authors: ['agustin-sanc'],
    href: '/videos',
  },
  {
    date: '2026-09-30',
    area: 'charlas',
    title: 'Charlas externas recomendadas',
    description:
      'Una pestaña con charlas de conferencias recomendadas por la comunidad, como Next.js Conf y Rails World.',
    authors: ['agustin-sanc'],
    href: '/charlas',
  },
  {
    date: '2026-09-30',
    area: 'lectura',
    title: 'Lista "para leer"',
    description:
      'Marcá artículos como leídos o guardalos para después, y leelos en su sitio original sin salir de PCN.',
    authors: ['agustin-sanc'],
    href: '/lectura',
  },
  {
    date: '2026-09-30',
    area: 'cursos',
    title: 'Cursos renovados',
    description:
      'La lista de cursos tiene búsqueda, filtros y secciones; cada curso tiene un reproductor con playlist de clases y sugiere cursos y artículos relacionados.',
    authors: ['agustin-sanc'],
    href: '/cursos',
  },
  {
    date: '2026-09-30',
    area: 'música',
    title: 'Música en PCN OS',
    description:
      'Escuchá los sets y las radios de la comunidad desde la barra de menú de PCN OS mientras navegás.',
    authors: ['agustin-sanc'],
    href: '/music',
  },
  {
    date: '2026-09-30',
    area: 'eventos',
    title: 'Eventos en tu calendario',
    description:
      'Descargá un .ics de cada evento para agregarlo a cualquier calendario, además del link de Google Calendar.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-09-30',
    area: 'feed',
    title: 'Feed RSS',
    description: 'Seguí las novedades de la comunidad desde tu lector de RSS.',
    authors: ['agustin-sanc'],
    href: '/feed.xml',
  },
  {
    date: '2026-09-30',
    area: 'os',
    title: 'PCN OS',
    description:
      'En pantallas grandes la plataforma se convierte en un escritorio: cada sección abre en su propia ventana, con dock, barra de menú y lanzador de programas.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'ui',
    title: 'Nuevo look de terminal',
    description:
      'Todo el sitio pasó a un estilo de terminal: tipografía Geist, paleta verde fósforo, listas compactas y navegación móvil con barra inferior.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'conversaciones',
    title: 'Conversaciones como log de terminal',
    description:
      'Las conversaciones se leen como un log, con un lector de resúmenes y 169 conversaciones nuevas de junio a septiembre.',
    authors: ['agustin-sanc'],
    href: '/conversaciones',
  },
  {
    date: '2026-09-30',
    area: 'desarrollo',
    title: 'Estadísticas de colaboración en vivo',
    description:
      'La página de desarrollo muestra commits, PRs y contribuidores del repo, actualizados desde GitHub.',
    authors: ['agustin-sanc'],
    href: '/desarrollo',
  },

  // 2026-09-30: the rest of the terminal redesign day.
  {
    date: '2026-09-30',
    area: 'brand',
    title: 'Nuevo logo de PCN',
    description: 'Nuevo logo y favicon en toda la plataforma.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'historia',
    title: 'Historia como línea de tiempo',
    description:
      'La historia de la comunidad se lee como una línea de tiempo, con un índice estilo árbol de terminal que acompaña el scroll.',
    authors: ['agustin-sanc'],
    href: '/historia',
  },
  {
    date: '2026-09-30',
    area: 'especialidades',
    title: 'Especialidades agrupadas por área',
    description: 'Las especialidades de la ingeniería de software se agrupan por área.',
    authors: ['agustin-sanc'],
    href: '/especialidades',
  },
  {
    date: '2026-09-30',
    area: 'seo',
    title: 'Previews de links, sitemap y páginas de error',
    description:
      'Cada página genera su propia imagen de preview al compartirla, el sitio publica sitemap.xml y robots.txt, y las páginas 404 y de error tienen estilo de terminal.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'galería',
    title: 'Galería renovada',
    description:
      'La galería y el visor de fotos tienen estilo de terminal y las fotos tienen un efecto de profundidad al mover el mouse.',
    authors: ['agustin-sanc'],
    href: '/galeria',
  },
  {
    date: '2026-09-30',
    area: 'os',
    title: 'Escritorio vivo en PCN OS',
    description:
      'El escritorio muestra fotos de la comunidad al azar y procesos animados de fondo; los perfiles y eventos abren en su propia ventana.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'ui',
    title: 'Diálogos, menús y notificaciones de terminal',
    description:
      'Diálogos, menús desplegables, pestañas y notificaciones rediseñados con estilo de terminal, y el logo de PCN se enciende mientras carga una página.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'ui',
    title: 'Buscador de terminal en todas las páginas',
    description: 'Todas las páginas con búsqueda usan el mismo buscador estilo "$ grep".',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'mobile',
    title: 'Arreglos para iPhone y Safari 26',
    description:
      'El contenido ya no queda debajo de la barra de estado ni de la barra de URL flotante de Safari, y la barra de pestañas llega hasta el borde inferior.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-30',
    area: 'sponsors',
    title: 'Macch se suma como sponsor',
    description:
      'Macch es nuevo sponsor de la comunidad, y todos los logos se muestran al mismo tamaño y sin fondos.',
    authors: ['agustin-sanc'],
    href: '/partners',
  },
  {
    date: '2026-09-30',
    area: 'desarrollo',
    title: 'Equipo ordenado por contribuciones',
    description:
      'El equipo de la plataforma se muestra como una lista compacta, con nuevos contribuidores y ordenado por líneas aportadas.',
    authors: ['agustin-sanc'],
    href: '/desarrollo',
  },
  {
    date: '2026-09-30',
    area: 'admin',
    title: 'Datos de administración protegidos',
    description:
      'Las páginas y datos de administración exigen un usuario admin también en el servidor.',
    authors: ['agustin-sanc'],
    audience: 'admins',
  },
  {
    date: '2026-09-30',
    area: 'conversaciones',
    title: 'Skill para sumar conversaciones',
    description:
      'Una skill de Claude Code convierte un export de WhatsApp en resúmenes nuevos para la página de conversaciones, cuidando la privacidad de los miembros.',
    authors: ['agustin-sanc'],
    audience: 'admins',
  },
  {
    date: '2026-09-30',
    area: 'infra',
    title: 'Dependencias sin vulnerabilidades',
    description: 'Se parchearon todas las vulnerabilidades reportadas por pnpm audit.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-09-29',
    area: 'eventos',
    title: 'Eventos en Google Calendar',
    description: 'Agregá cualquier evento a tu Google Calendar desde su página.',
    authors: ['facmartoni'],
    href: '/eventos',
  },
  {
    date: '2026-09-29',
    area: 'eventos',
    title: 'Varios flyers por evento',
    description:
      'Subí varias imágenes de flyer a la vez y reordenalas en el formulario del evento.',
    authors: ['agustin-sanc'],
    href: '/eventos',
    audience: 'admins',
  },
  {
    date: '2026-09-29',
    area: 'inicio',
    title: 'Nueva página de inicio',
    description: 'Rediseño de la landing y de la barra lateral.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2026-09-29',
    area: 'eventos',
    title: 'Eventos sin atajo obligatorio',
    description: 'Los eventos se pueden crear sin definir un link corto.',
    authors: ['agustin-sanc'],
    audience: 'admins',
  },
  {
    date: '2026-09-11',
    area: 'sponsors',
    title: 'Sponsors en la barra lateral',
    description: 'La página de sponsors ahora está en la sección Comunidad de la barra lateral.',
    authors: ['MaxiR23'],
    href: '/partners',
  },

  // 2026-06: content, tooling and the projects page.
  {
    date: '2026-06-28',
    area: 'proyectos',
    title: 'Proyectos de la comunidad',
    description: 'Una vitrina con los proyectos de software hechos por miembros de la comunidad.',
    authors: ['agustin-sanc'],
    href: '/proyectos',
  },
  {
    date: '2026-06-12',
    area: 'cursos',
    title: 'Logos en los cursos',
    description: 'Cada curso muestra el logo de su tecnología.',
    authors: ['agustin-sanc'],
    href: '/cursos',
  },
  {
    date: '2026-06-11',
    area: 'herramientas',
    title: 'Página de herramientas',
    description:
      'Un catálogo de lenguajes, frameworks y herramientas organizado en pestañas, con badges de tipado y paradigma, y una marca en las que usa esta plataforma.',
    authors: ['agustin-sanc'],
    href: '/herramientas',
  },
  {
    date: '2026-06-11',
    area: 'desarrollo',
    title: 'Guía para contribuir',
    description:
      'La página de desarrollo explica la arquitectura, las herramientas y las convenciones del proyecto.',
    authors: ['agustin-sanc'],
    href: '/desarrollo',
  },
  {
    date: '2026-06-11',
    area: 'lectura',
    title: '38 libros nuevos',
    description:
      'La biblioteca suma 38 libros con portada y cinco categorías nuevas, ebooks de diseño y artículos de Martin Fowler.',
    authors: ['agustin-sanc'],
    href: '/lectura',
  },
  {
    date: '2026-06-11',
    area: 'ui',
    title: 'Recursos en la barra lateral',
    description:
      'Recursos pasa a ser una sección principal con un desplegable "Más recursos", y Herramientas tiene su propio lugar en el menú.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-06-11',
    area: 'infra',
    title: 'Tests automáticos y hooks de git',
    description:
      'Tests con Jest para todas las server actions, lint-staged antes de cada commit y los tests corriendo antes de cada push.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-06-11',
    area: 'infra',
    title: 'Node 24, portless y bases por worktree',
    description:
      'El proyecto pasa a Node 24 LTS, pnpm dev usa portless con una URL estable por rama y cada worktree tiene su propia base de Postgres.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-06-11',
    area: 'infra',
    title: '52 vulnerabilidades corregidas',
    description: 'Actualización de dependencias que resuelve 47 alertas de Dependabot.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-06-10',
    area: 'lectura',
    title: 'Lector de artículos y pestaña de artículos',
    description:
      'Una pestaña con artículos de blogs de la industria, ordenados por fecha, que se leen dentro de la plataforma; los libros pueden tener varias categorías.',
    authors: ['agustin-sanc'],
    href: '/lectura',
  },
  {
    date: '2026-06-10',
    area: 'cursos',
    title: 'Cursos interactivos',
    description: 'Nuevos cursos externos interactivos, como el de Next.js y Patterns.dev.',
    authors: ['agustin-sanc'],
    href: '/cursos',
  },
  {
    date: '2026-06-10',
    area: 'conversaciones',
    title: '36 conversaciones de mayo y junio',
    description: 'Nuevos resúmenes de conversaciones del grupo, con tarjetas renovadas.',
    authors: ['agustin-sanc'],
    href: '/conversaciones',
  },
  {
    date: '2026-06-10',
    area: 'preguntas',
    title: 'Preguntas frecuentes siempre visibles',
    description: 'Las preguntas frecuentes se muestran todas abiertas en una grilla.',
    authors: ['agustin-sanc'],
    href: '/preguntas-frecuentes',
  },
  {
    date: '2026-06-09',
    area: 'series',
    title: 'Series y películas',
    description:
      'Una página con series y películas sobre tecnología recomendadas por la comunidad.',
    authors: ['agustin-sanc'],
    href: '/series-y-peliculas',
  },
  {
    date: '2026-06-09',
    area: 'lectura',
    title: 'Biblioteca ampliada',
    description: '18 libros nuevos con portada e ISBN, ordenados alfabéticamente.',
    authors: ['agustin-sanc'],
    href: '/lectura',
  },
  {
    date: '2026-06-09',
    area: 'influencers',
    title: '22 creadores de contenido nuevos',
    description: 'Más referentes de ingeniería de software para seguir.',
    authors: ['agustin-sanc'],
    href: '/influencers',
  },
  {
    date: '2026-06-09',
    area: 'software',
    title: '19 herramientas recomendadas nuevas',
    description:
      'El software recomendado suma 19 herramientas con badges de precio y orden alfabético.',
    authors: ['agustin-sanc'],
    href: '/software-recomendado',
  },
  {
    date: '2026-06-09',
    area: 'cursos',
    title: 'Cursos nuevos',
    description: 'Nuevos cursos en una grilla unificada, con descripciones más cortas.',
    authors: ['agustin-sanc'],
    href: '/cursos',
  },
  {
    date: '2026-06-09',
    area: 'historia',
    title: 'Historia completa de la comunidad',
    description:
      'La historia suma los eventos de 2021 a 2026, con secciones, pantalla completa y link al grupo de WhatsApp.',
    authors: ['agustin-sanc'],
    href: '/historia',
  },
  {
    date: '2026-06-09',
    area: 'eventos',
    title: 'Detalle de evento renovado',
    description: 'Nueva disposición de la página del evento y mejores previews al compartirla.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-06-09',
    area: 'eventos',
    title: 'Inscripciones con búsqueda',
    description: 'La lista de inscriptos tiene búsqueda, orden y tarjetas de resumen.',
    authors: ['agustin-sanc'],
    audience: 'admins',
  },
  {
    date: '2026-06-09',
    area: 'usuarios',
    title: 'Tabla de usuarios',
    description: 'Los usuarios se listan en una tabla con orden, filtros y paginación.',
    authors: ['agustin-sanc'],
    href: '/usuarios',
    audience: 'admins',
  },
  {
    date: '2026-06-09',
    area: 'registro',
    title: 'Registro sin doble envío',
    description: 'El botón de registro queda deshabilitado después de crear la cuenta.',
    authors: ['agustin-sanc'],
    href: '/crear-cuenta',
  },
  {
    date: '2026-06-08',
    area: 'eventos',
    title: 'Carrusel de flyers y links cortos',
    description:
      'Cada evento puede tener varios flyers en un carrusel y un link corto propio para compartirlo.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-06-08',
    area: 'infra',
    title: 'MailHog para emails locales',
    description: 'Los emails enviados en desarrollo se capturan en MailHog.',
    authors: ['agustin-sanc'],
  },

  // 2026-04 / 2026-05: events, talks and conversations.
  {
    date: '2026-05-24',
    area: 'charlas',
    title: 'Charlas vinculadas a eventos',
    description:
      'Cada charla muestra el evento donde se dio, con datos manuales para eventos fuera de la plataforma.',
    authors: ['agustin-sanc'],
    href: '/charlas',
  },
  {
    date: '2026-05-22',
    area: 'charlas',
    title: 'Fotos de oradores a color',
    description:
      'Las fotos de los oradores se ven a color y el formulario de charlas ya no pide teléfono.',
    authors: ['agustin-sanc'],
    href: '/charlas',
  },
  {
    date: '2026-05-07',
    area: 'conversaciones',
    title: 'Conversaciones del grupo de WhatsApp',
    description:
      'Una página con 256 resúmenes de las mejores conversaciones del grupo, ordenados por mes, y una invitación a sumarse.',
    authors: ['agustin-sanc'],
    href: '/conversaciones',
  },
  {
    date: '2026-05-07',
    area: 'seo',
    title: 'Previews actualizadas',
    description: 'Nuevos títulos e imágenes al compartir las páginas principales.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-04-28',
    area: 'eventos',
    title: 'Link corto /agents',
    description: 'pcn/agents lleva directo al evento Zero to Agent.',
    authors: ['agustin-sanc'],
    href: '/agents',
  },
  {
    date: '2026-04-27',
    area: 'charlas',
    title: 'Charlas administrables',
    description:
      'Las charlas se guardan en la base de datos y los admins las editan desde la misma página, con subida de imágenes y varios oradores por charla elegidos entre los usuarios.',
    authors: ['agustin-sanc'],
    href: '/charlas',
  },
  {
    date: '2026-04-27',
    area: 'ui',
    title: 'Botones con estado de carga',
    description:
      'Todos los botones de formularios y acciones muestran un spinner mientras trabajan.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-04-26',
    area: 'eventos',
    title: 'Convocatoria de charlas',
    description: 'Proponé una charla para un evento; los admins revisan las propuestas.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-04-26',
    area: 'eventos',
    title: 'Eventos online y estado del evento',
    description:
      'Eventos online con link de streaming, badges de "En curso" y "Cupo completo", horarios en 24 h y en tu zona horaria, y un botón para proponer organizar algo.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-04-26',
    area: 'infra',
    title: 'Next.js 16 y React 19',
    description: 'La plataforma se actualizó de Next.js 14 a 16, React 18 a 19 y ESLint 8 a 9.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-04-23',
    area: 'eventos',
    title: 'Previews por evento',
    description: 'Compartir un evento muestra su propio título, descripción y flyer.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-04-22',
    area: 'eventos',
    title: 'Inscripción externa',
    description:
      'Los eventos pueden inscribirse en un sitio externo y muestran su estado en la lista.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2026-04-22',
    area: 'sponsors',
    title: 'Sponsors de Zero to Agent',
    description: 'Una página para presentar el evento Zero to Agent a posibles sponsors.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-04-22',
    area: 'inicio',
    title: 'Eventos recientes en el inicio',
    description: 'El inicio muestra los últimos eventos publicados, después del hero.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2026-04-22',
    area: 'ui',
    title: 'Pantallas de carga',
    description: 'Cada página muestra un esqueleto mientras carga.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-04-22',
    area: 'ui',
    title: 'Barra lateral reorganizada',
    description:
      'Redes, recursos y preguntas frecuentes se agrupan bajo Comunidad; consejos, testimonios y anuncios salen del menú.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-04-20',
    area: 'eventos',
    title: 'Link corto /cowork',
    description: 'pcn/cowork lleva al próximo cowork de la comunidad.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-04-15',
    area: 'desarrollo',
    title: 'Equipo en la página de desarrollo',
    description: 'La lista de quienes construyen la plataforma pasa del inicio a /desarrollo.',
    authors: ['agustin-sanc'],
    href: '/desarrollo',
  },
  {
    date: '2026-04-14',
    area: 'ui',
    title: 'Modo oscuro siempre',
    description: 'La plataforma queda en modo oscuro y se quita el selector de tema.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-04-14',
    area: 'sponsors',
    title: 'Xetro y Once57 se suman como sponsors',
    description: 'Nuevos sponsors en la página de inicio.',
    authors: ['agustin-sanc'],
    href: '/partners',
  },
  {
    date: '2026-04-12',
    area: 'desarrollo',
    title: 'Página para contribuir',
    description:
      'Una página que explica cómo sumarse a desarrollar la plataforma y con qué tecnologías.',
    authors: ['agustin-sanc'],
    href: '/desarrollo',
  },
  {
    date: '2026-04-12',
    area: 'inicio',
    title: 'Botón para unirse al WhatsApp',
    description: 'Un botón en el inicio para sumarse a la comunidad de WhatsApp.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2026-04-12',
    area: 'perfil',
    title: 'Pestañas del perfil con contador',
    description: 'Las pestañas del perfil muestran cuántos elementos tiene cada una.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2026-04-12',
    area: 'usuarios',
    title: 'Usuarios solo para admins',
    description: 'La lista de usuarios pasa a ser visible solo para admins.',
    authors: ['agustin-sanc'],
    href: '/usuarios',
    audience: 'admins',
  },
  {
    date: '2026-04-12',
    area: 'sponsors',
    title: 'ASZ Software ahora es DIZENZ',
    description: 'El sponsor principal aparece con su nuevo nombre.',
    authors: ['agustin-sanc'],
    href: '/partners',
  },

  // 2025-12: the big platform push.
  {
    date: '2025-12-29',
    area: 'seo',
    title: 'Previews al compartir',
    description: 'Las páginas tienen título, descripción e imagen propios al compartirlas.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2025-12-28',
    area: 'autenticación',
    title: 'Verificación de email y recuperación de contraseña',
    description:
      'Las cuentas nuevas verifican su email y la contraseña se recupera por mail, con límite de intentos.',
    authors: ['agustin-sanc'],
    href: '/recuperar-clave',
  },
  {
    date: '2025-12-28',
    area: 'perfil',
    title: 'Perfiles completos',
    description:
      'Registro y perfil con datos profesionales, académicos, ubicación, teléfono y foto; el perfil público se organiza en pestañas.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2025-12-28',
    area: 'sponsors',
    title: 'Sponsors en el inicio',
    description:
      'Sección de sponsors con Bowery, IEEE Computer Society, Blackbox Cowork, UTN-FRT y Endpoint Consulting, y una invitación a sumarse.',
    authors: ['agustin-sanc'],
    href: '/partners',
  },
  {
    date: '2025-12-28',
    area: 'infra',
    title: 'Emails y variables de producción',
    description:
      'Envío de emails por SMTP y Resend, y el deploy con todas las variables de entorno de producción.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2025-12-27',
    area: 'trabajos',
    title: 'Ofertas de trabajo administrables',
    description: 'Los admins crean, editan y borran ofertas de trabajo.',
    authors: ['agustin-sanc'],
    audience: 'admins',
  },
  {
    date: '2025-12-27',
    area: 'anuncios',
    title: 'Anuncios',
    description: 'Anuncios de la comunidad, que pueden vincularse a un evento.',
    authors: ['agustin-sanc'],
    href: '/anuncios',
  },
  {
    date: '2025-12-26',
    area: 'eventos',
    title: 'Flyers subidos a S3',
    description: 'Los flyers de eventos se suben directamente a la nube.',
    authors: ['agustin-sanc'],
    audience: 'admins',
  },
  {
    date: '2025-12-26',
    area: 'eventos',
    title: 'Inscripción en un clic',
    description:
      'Si ya tenés cuenta con tus datos completos, te inscribís a un evento directamente.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2025-12-26',
    area: 'consejos',
    title: 'Moderación de consejos',
    description: 'Los admins pueden editar y borrar cualquier consejo.',
    authors: ['agustin-sanc'],
    audience: 'admins',
  },
  {
    date: '2025-12-25',
    area: 'eventos',
    title: 'Gestión de eventos',
    description:
      'Los admins crean, editan y borran eventos; los miembros se inscriben y cancelan, con cupo, sponsors y avisos a los admins.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2025-12-25',
    area: 'eventos',
    title: 'Link corto /meetup',
    description: 'pcn/meetup lleva a la próxima meetup de la comunidad.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2025-12-25',
    area: 'admin',
    title: 'Analíticas, visitas y monitoreo',
    description:
      'Estadísticas de usuarios y eventos, registro de visitas por página, y un monitor de errores y logs.',
    authors: ['agustin-sanc'],
    href: '/analiticas',
    audience: 'admins',
  },
  {
    date: '2025-12-25',
    area: 'admin',
    title: 'Roles y notificaciones',
    description:
      'Los usuarios tienen rol de admin o miembro, y los admins reciben notificaciones de inscripciones y testimonios.',
    authors: ['agustin-sanc'],
    href: '/notificaciones',
    audience: 'admins',
  },
  {
    date: '2025-12-25',
    area: 'testimonios',
    title: 'Testimonios',
    description: 'Dejá tu testimonio sobre la comunidad, editalo o borralo.',
    authors: ['agustin-sanc'],
    href: '/testimonios',
  },
  {
    date: '2025-12-25',
    area: 'usuarios',
    title: 'Página de comunidad',
    description: 'Buscá y filtrá a los miembros de la comunidad.',
    authors: ['agustin-sanc'],
    href: '/usuarios',
  },
  {
    date: '2025-12-25',
    area: 'charlas',
    title: 'Más charlas y fotos',
    description: 'Nuevas charlas de 2024 y 2025 con sus fotos, y más fotos en la galería.',
    authors: ['agustin-sanc'],
    href: '/charlas',
  },
  {
    date: '2025-12-22',
    area: 'especialidades',
    title: 'Especialidades',
    description:
      'Una guía de las especialidades de la ingeniería de software, de mobile a arquitectura, con índice.',
    authors: ['agustin-sanc'],
    href: '/especialidades',
  },
  {
    date: '2025-12-21',
    area: 'inicio',
    title: 'Inicio con todos los recursos',
    description:
      'Nuevo inicio con fondo animado y accesos a club de lectura, podcast, cursos, software y testimonios.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2025-12-21',
    area: 'lectura',
    title: 'Club de lectura',
    description:
      'Una biblioteca de libros recomendados con búsqueda, filtros y el grupo del club de lectura.',
    authors: ['agustin-sanc'],
    href: '/lectura',
  },
  {
    date: '2025-12-21',
    area: 'podcast',
    title: 'Podcast, preguntas frecuentes y anuncios',
    description: 'Nuevas páginas de podcast, preguntas frecuentes y anuncios.',
    authors: ['agustin-sanc'],
    href: '/podcast',
  },
  {
    date: '2025-12-21',
    area: 'historia',
    title: 'Historia con índice',
    description: 'La historia de PCN se organiza en tarjetas con un índice navegable.',
    authors: ['agustin-sanc'],
    href: '/historia',
  },
  {
    date: '2025-12-21',
    area: 'ui',
    title: 'Navegación con breadcrumbs',
    description: 'Todas las páginas muestran dónde estás y abren la barra lateral.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2025-12-20',
    area: 'perfil',
    title: 'GitHub en el perfil',
    description: 'Agregá tu GitHub a las redes de tu perfil.',
    authors: ['contrera-lean'],
  },
  {
    date: '2025-12-17',
    area: 'perfil',
    title: 'Lenguajes en tema claro',
    description: 'El selector de lenguajes de programación se ve bien en tema claro.',
    authors: ['contrera-lean'],
  },

  // 2025-03 to 2025-07: first contributors.
  {
    date: '2025-07-14',
    area: 'infra',
    title: 'Docker arreglado',
    description: 'La configuración de Docker vuelve a levantar el proyecto.',
    authors: ['Chelo154'],
  },
  {
    date: '2025-07-05',
    area: 'trabajos',
    title: 'Ofertas de trabajo',
    description: 'Una bolsa de trabajo con ofertas para la comunidad.',
    authors: ['FacuBzn'],
  },
  {
    date: '2025-06-23',
    area: 'usuarios',
    title: 'Directorio de miembros',
    description: 'Una página con el directorio de miembros de PCN.',
    authors: ['MauriJC'],
    href: '/usuarios',
  },
  {
    date: '2025-06-07',
    area: 'inicio',
    title: 'Club de algoritmos',
    description: 'Una sección del club de algoritmos en el inicio.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2025-06-06',
    area: 'consejos',
    title: 'Consejos en columnas',
    description: 'Los consejos se muestran en una grilla tipo masonry y cargan del servidor.',
    authors: ['agustin-sanc'],
    href: '/consejos',
  },
  {
    date: '2025-06-05',
    area: 'software',
    title: 'Software recomendado',
    description: 'Una página con software recomendado por la comunidad.',
    authors: ['nicofuentesg'],
    href: '/software-recomendado',
  },
  {
    date: '2025-06-05',
    area: 'ui',
    title: 'Encabezados fijos y arreglos mobile',
    description:
      'Los encabezados quedan fijos en todas las páginas y se corrigieron fallos en mobile.',
    authors: ['MatiasDG539'],
  },
  {
    date: '2025-06-05',
    area: 'seo',
    title: 'Metadatos para buscadores',
    description: 'Títulos y descripciones para buscadores y redes.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2025-06-03',
    area: 'inicio',
    title: 'Inicio con redes y testimonios',
    description:
      'Tarjetas con efecto vidrio, accesos a Instagram, YouTube y LinkedIn, la historia de PCN y testimonios de miembros.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2025-06-01',
    area: 'desarrollo',
    title: 'Colaboradores',
    description: 'Una sección con las personas que colaboran en la plataforma.',
    authors: ['gmanavarro'],
  },
  {
    date: '2025-06-01',
    area: 'ui',
    title: 'Alineación de títulos y menú',
    description:
      'Se corrigieron las posiciones del título de la galería, del encabezado de consejos y del botón del menú.',
    authors: ['MatiasDG539', 'MauriJC'],
  },
  {
    date: '2025-05-30',
    area: 'infra',
    title: 'Envío de emails',
    description: 'La plataforma envía emails con Nodemailer.',
    authors: ['MatiasDG539'],
  },
  {
    date: '2025-05-30',
    area: 'consejos',
    title: 'Mejores consejos',
    description: 'El inicio muestra los consejos con más likes y un consejo al azar.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2025-05-29',
    area: 'ui',
    title: 'Rutas en español',
    description: 'Las direcciones de la plataforma pasan a estar en español.',
    authors: ['nicofuentesg'],
  },
  {
    date: '2025-05-28',
    area: 'infra',
    title: 'Avisos en Discord',
    description: 'Un aviso en Discord cada vez que se mergea una rama a testing.',
    authors: ['MauriJC'],
  },
  {
    date: '2025-05-27',
    area: 'autenticación',
    title: 'Arreglos de registro y contraseña',
    description:
      'Se corrigieron el restablecimiento de contraseña, la validación de la contraseña y el campo de texto del registro.',
    authors: ['MauriJC'],
    href: '/crear-cuenta',
  },
  {
    date: '2025-05-27',
    area: 'influencers',
    title: 'Tarjetas de influencers',
    description:
      'Las tarjetas de influencers dejan de mostrar seguidores y ubican mejor el botón de YouTube.',
    authors: ['nicofuentesg'],
    href: '/influencers',
  },
  {
    date: '2025-05-24',
    area: 'infra',
    title: 'Tests end-to-end con Playwright',
    description: 'Se configuró Playwright para probar la plataforma en el navegador.',
    authors: ['emilianogsh'],
  },
  {
    date: '2025-05-21',
    area: 'ui',
    title: 'Carga y menú en mobile',
    description:
      'Nuevo indicador de carga y el botón del menú ya no tapa el mensaje de bienvenida en mobile.',
    authors: ['MatiasDG539'],
  },
  {
    date: '2025-05-20',
    area: 'consejos',
    title: 'Likes en consejos',
    description: 'Dale like a los consejos, con respuesta instantánea.',
    authors: ['FacuBzn'],
    href: '/consejos',
  },
  {
    date: '2025-05-10',
    area: 'galería',
    title: 'Galería mejorada',
    description: 'La galería se ve mejor en mobile y permite compartir fotos.',
    authors: ['agustin-sanc'],
    href: '/galeria',
  },
  {
    date: '2025-05-08',
    area: 'influencers',
    title: 'Influencers',
    description: 'Una página con creadores de contenido de software recomendados.',
    authors: ['FacuBzn'],
    href: '/influencers',
  },
  {
    date: '2025-05-08',
    area: 'ui',
    title: 'Imágenes optimizadas y botones de cuenta',
    description:
      'Las imágenes cargan más rápido y la barra lateral muestra "Crear cuenta" e "Iniciar sesión".',
    authors: ['MauriJC', 'MatiasDG539'],
  },
  {
    date: '2025-04-21',
    area: 'eventos',
    title: 'Lista de eventos arreglada',
    description: 'La lista de eventos vuelve a cargar.',
    authors: ['MauriJC'],
    href: '/eventos',
  },
  {
    date: '2025-04-12',
    area: 'galería',
    title: 'Galería de fotos',
    description: 'Una galería con fotos de los encuentros de la comunidad.',
    authors: ['nicofuentesg'],
    href: '/galeria',
  },
  {
    date: '2025-04-12',
    area: 'perfil',
    title: 'Editar perfil',
    description: 'Un botón para editar tu perfil desde tu página de usuario.',
    authors: ['FacuBzn'],
  },
  {
    date: '2025-04-12',
    area: 'autenticación',
    title: 'Botones de login en mobile',
    description: 'Se corrigieron los estilos de los botones de login en mobile y desktop.',
    authors: ['MatiasDG539'],
  },
  {
    date: '2025-04-08',
    area: 'cursos',
    title: 'Ajustes en cursos',
    description: 'Ajustes visuales en la página de cursos.',
    authors: ['SpagnoloCarlos'],
    href: '/cursos',
  },
  {
    date: '2025-04-08',
    area: 'desarrollo',
    title: 'Invitación a desarrollar',
    description: 'Una invitación a sumarse al desarrollo de la plataforma.',
    authors: ['SpagnoloCarlos'],
  },
  {
    date: '2025-04-07',
    area: 'eventos',
    title: 'Eventos',
    description: 'La primera versión de los eventos de la comunidad en la plataforma.',
    authors: ['MauriJC'],
    href: '/eventos',
  },
  {
    date: '2025-04-07',
    area: 'consejos',
    title: 'Comentarios en consejos',
    description: 'Comentá los consejos de otros miembros.',
    authors: ['gmanavarro'],
    href: '/consejos',
  },
  {
    date: '2025-03-27',
    area: 'perfil',
    title: 'Lenguajes favoritos',
    description:
      'Elegí tus lenguajes de programación preferidos; se muestran en tu perfil y en tus consejos.',
    authors: ['FacuBzn', 'agustin-sanc'],
  },
  {
    date: '2025-03-27',
    area: 'ui',
    title: 'Imágenes livianas',
    description: 'Las imágenes públicas se optimizaron para cargar más rápido.',
    authors: ['FacuBzn'],
  },
  {
    date: '2025-03-04',
    area: 'perfil',
    title: 'Perfil público',
    description: 'Cada usuario tiene un perfil público con sus datos.',
    authors: ['gmanavarro'],
  },
  {
    date: '2025-03-04',
    area: 'autenticación',
    title: 'Cuentas con email y contraseña',
    description:
      'Registro e inicio de sesión con email y contraseña, recuperación de contraseña y accesos en la barra lateral.',
    authors: ['agustin-sanc'],
    href: '/iniciar-sesion',
  },
  {
    date: '2025-03-03',
    area: 'ui',
    title: 'Nueva barra lateral',
    description: 'La barra lateral se rehízo desde cero.',
    authors: ['MatiasDG539'],
  },
  {
    date: '2025-03-03',
    area: 'inicio',
    title: 'Nuevo inicio con contadores',
    description:
      'Tarjetas compactas con contadores animados, eventos y ASZ Software como sponsor principal.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2025-02-06',
    area: 'infra',
    title: 'Deploy con Kamal',
    description: 'La plataforma se despliega con Kamal desde GitHub Actions.',
    authors: ['gmanavarro'],
  },
  {
    date: '2025-02-05',
    area: 'infra',
    title: 'Dev container',
    description:
      'Un dev container con pnpm y extensiones de VS Code para desarrollar sin configurar nada.',
    authors: ['agustin-sanc'],
  },

  // 2024: the first platform.
  {
    date: '2024-10-22',
    area: 'historia',
    title: 'La historia de PCN',
    description: 'Un post que cuenta cómo nació la comunidad.',
    authors: ['agustin-sanc'],
    href: '/historia',
  },
  {
    date: '2024-09-28',
    area: 'inicio',
    title: 'Landing pulida',
    description: 'Ajustes de íconos, textos y favicon en la landing.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2024-09-15',
    area: 'cursos',
    title: 'Cursos de la comunidad',
    description:
      'Cursos de Vim, Git y GitHub, SQL y HTML, diferenciando los hechos por la comunidad de los externos.',
    authors: ['agustin-sanc'],
    href: '/cursos',
  },
  {
    date: '2024-09-14',
    area: 'charlas',
    title: 'Slides de las charlas',
    description: 'Las charlas muestran un carrusel con sus slides.',
    authors: ['agustin-sanc'],
    href: '/charlas',
  },
  {
    date: '2024-09-13',
    area: 'ui',
    title: 'Favicon y fondo negro',
    description: 'El sitio tiene favicon con el logo de PCN y fondo negro en modo oscuro.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2024-09-10',
    area: 'eventos',
    title: 'Página de eventos',
    description: 'La primera página con los eventos de la comunidad.',
    authors: ['agustin-sanc'],
    href: '/eventos',
  },
  {
    date: '2024-09-10',
    area: 'charlas',
    title: 'Charlas en YouTube',
    description: 'Cada lightning talk enlaza a su video de YouTube.',
    authors: ['agustin-sanc'],
    href: '/charlas',
  },
  {
    date: '2024-09-09',
    area: 'podcast',
    title: 'Podcast, fotos y Code Warfare',
    description: 'Nuevas páginas de podcast, fotos y Code Warfare.',
    authors: ['agustin-sanc'],
    href: '/code-warfare',
  },
  {
    date: '2024-09-08',
    area: 'música',
    title: 'Playlists',
    description: 'Una página con la música de la comunidad.',
    authors: ['agustin-sanc'],
    href: '/music',
  },
  {
    date: '2024-09-08',
    area: 'cursos',
    title: 'Página de cursos',
    description: 'La primera página de cursos, con migas de pan y una invitación a sumar el tuyo.',
    authors: ['agustin-sanc'],
    href: '/cursos',
  },
  {
    date: '2024-09-04',
    area: 'inicio',
    title: 'Hero animado',
    description: 'La landing tiene un hero con partículas, texto brillante y línea de tiempo.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2024-09-03',
    area: 'charlas',
    title: 'Lightning talks',
    description: 'Una página con las lightning talks dadas en la comunidad.',
    authors: ['agustin-sanc'],
    href: '/charlas',
  },
  {
    date: '2024-08-31',
    area: 'consejos',
    title: 'Scroll infinito de consejos',
    description: 'Los consejos cargan a medida que scrolleás y muestran su fecha.',
    authors: ['agustin-sanc'],
    href: '/consejos',
  },
  {
    date: '2024-08-30',
    area: 'infra',
    title: 'Comandos de migraciones',
    description: 'Nuevos comandos para manejar las migraciones de la base de datos.',
    authors: ['cortesjpb'],
  },
  {
    date: '2024-08-29',
    area: 'perfil',
    title: 'Editá tu perfil',
    description: 'Un formulario para editar tus datos y un saludo personalizado.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2024-08-29',
    area: 'consejos',
    title: 'Editar y borrar consejos',
    description: 'Editá o borrá los consejos que escribiste.',
    authors: ['agustin-sanc'],
    href: '/consejos',
  },
  {
    date: '2024-08-29',
    area: 'ui',
    title: 'Plataforma abierta',
    description: 'Cualquiera puede ver la plataforma sin iniciar sesión.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2024-08-26',
    area: 'inicio',
    title: 'Primer inicio de la plataforma',
    description:
      'Tarjetas de miembros activos, crecimiento de la comunidad, próximos eventos y sponsors.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2024-08-25',
    area: 'ui',
    title: 'Barra lateral',
    description: 'La primera barra lateral para navegar la plataforma.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2024-08-22',
    area: 'consejos',
    title: 'Consejos',
    description: 'Escribí consejos para la comunidad y leé los de los demás.',
    authors: ['agustin-sanc'],
    href: '/consejos',
  },
  {
    date: '2024-08-21',
    area: 'autenticación',
    title: 'Login con GitHub',
    description: 'Iniciá sesión con tu cuenta de GitHub.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2024-08-21',
    area: 'ui',
    title: 'Tema claro y oscuro',
    description: 'Elegí entre tema claro y oscuro.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2024-08-16',
    area: 'infra',
    title: 'Base de datos con Prisma',
    description: 'La plataforma guarda sus datos en Postgres usando Prisma.',
    authors: ['Alejoboga20'],
  },
  {
    date: '2024-08-15',
    area: 'inicio',
    title: 'Landing de la comunidad',
    description:
      'La primera landing completa: hero, motivación, lightning talks, preguntas frecuentes, testimonios, fotos y equipo.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2024-07-16',
    area: 'inicio',
    title: 'Foto de portada',
    description: 'La landing muestra una foto de la comunidad en el encabezado.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2024-07-14',
    area: 'infra',
    title: 'Dev container de VS Code',
    description: 'Configuración para desarrollar dentro de un contenedor desde VS Code.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2024-06-30',
    area: 'inicio',
    title: 'Primera versión del inicio',
    description: 'La primera página de inicio de PCN.',
    authors: ['agustin-sanc'],
    href: '/',
  },
  {
    date: '2024-06-22',
    area: 'infra',
    title: 'Base del proyecto',
    description:
      'Next.js con la tipografía Geist, shadcn/ui, Prettier, husky y Docker para levantar todo con un comando.',
    authors: ['agustin-sanc'],
  },
  {
    date: '2024-06-21',
    area: 'infra',
    title: 'Comienza la plataforma',
    description: 'Primer commit de la plataforma de programaConNosotros.',
    authors: ['agustin-sanc'],
  },
];
