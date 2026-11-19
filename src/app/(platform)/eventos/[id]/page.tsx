import { cache, Suspense } from 'react';
import { EmptyState } from '@/components/empty-state';
import { RealtimeRefresh } from '@/components/realtime/realtime-refresh';
import { JsonLd, organization, SITE_URL } from '@/components/seo/json-ld';
import { PageTitle } from '@/components/ui/page-title';
import { StickyHeader } from '@/components/ui/sticky-header';
import { CalendarPlus, Download, Edit, Users, Video, Mic, MapPin } from 'lucide-react';
import { fetchEvent } from '@/actions/events/fetch-event';
import { EventFlyerCarousel } from '@/components/events/event-flyer-carousel';
import { FlyerCredits } from '@/components/events/flyer-credits';
import { EventPhotos } from '@/components/events/event-photos';
import { EventDetailClient } from '@/components/events/event-detail-client';
import { EventStatusBadge } from '@/components/events/event-status-badge';
import { EventSection } from '@/components/events/event-section';
import { EventAnnouncements } from '@/components/announcements/event-announcements';
import { getEventAnnouncements } from '@/actions/announcements/get-event-announcements';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { EventSponsors } from '@/components/events/event-sponsors';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { LocalDate, LocalTime } from '@/components/ui/local-date-time';
import { optimizedOgImage } from '@/lib/og-image';
import { signGallerySrc, signGalleryItem } from '@/lib/gallery-signing';
import { createGoogleCalendarUrl } from '@/lib/google-calendar';
import { googleMapsEmbedUrl } from '@/lib/google-maps';
import { canEditEvent } from '@/lib/event-permissions';
import { PersonLink } from '@/components/people/person-link';
import { findSession } from '@/lib/session';
import { getWaitlistPosition } from '@/lib/event-waitlist';
import { getEventCounts } from '@/lib/event-index';
import { hasEventEnded } from '@/lib/event-status';
import { PastEventMemory } from '@/components/events/memory/past-event-memory';
import { MISSING_TAB_TITLE, tabTitle } from '@/lib/tab-title';

const Section = EventSection;

// generateMetadata and the page both need the event: one query per request.
const getEvent = cache(fetchEvent);

function normalizeDescription(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const event = await getEvent(params.id);

  if (!event) {
    return {
      title: { absolute: MISSING_TAB_TITLE },
      description: 'El evento que buscas no existe o ha sido eliminado.',
    };
  }

  const normalizedDesc = normalizeDescription(event.description);
  const description =
    normalizedDesc.length > 160 ? normalizedDesc.substring(0, 157) + '…' : normalizedDesc;

  const rawImage =
    event.flyerImages[0] ||
    (event.galleryItems[0] && signGallerySrc(event.galleryItems[0].src).url);
  const imageUrl = rawImage ? optimizedOgImage(rawImage) : `/eventos/${event.id}/og-image`;
  const imageAlt = `Flyer de ${event.name}`;
  const url = `/eventos/${event.id}`;

  return {
    title: tabTitle.cat('eventos', event.name),
    description,
    openGraph: {
      title: { absolute: event.name },
      description,
      images: [{ url: imageUrl, alt: imageAlt }],
      url,
      type: 'website',
      siteName: 'programaConNosotros',
    },
    twitter: {
      card: 'summary_large_image',
      title: { absolute: event.name },
      description,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
  };
}

const EventDetailPage: React.FC<{ params: Promise<{ id: string }> }> = async (props) => {
  const params = await props.params;
  const id: string = params.id;

  // El evento y la sesión no dependen entre sí: se piden a la vez.
  const sessionId = (await cookies()).get('sessionId')?.value;
  const [event, session] = await Promise.all([
    getEvent(id),
    sessionId ? findSession(sessionId) : null,
  ]);

  const isAdmin = session?.user.role === 'ADMIN';
  const userId: string | null = session?.userId ?? null;
  // Ambassadors editan los eventos que crearon; cualquier usuario, los que organiza
  const canEdit = !!session && (isAdmin || (!!event && canEditEvent(session.user, event)));

  if (!event) {
    return (
      <>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="mt-4">
            <PageTitle path={[{ label: 'eventos', href: '/eventos' }, { label: '404' }]} />
            <EmptyState
              command={`cat ~/eventos/${id}`}
              output={`cat: ~/eventos/${id}: no such file or directory`}
              title="No encontramos este evento"
              description="Puede que se haya borrado o que el enlace esté mal."
              action={
                <Link href="/eventos" className="text-pcnGreen hover:underline">
                  cd ~/eventos
                </Link>
              }
            />
          </div>
        </div>
      </>
    );
  }

  // Un evento que ya terminó se muestra como el recuerdo de cómo fue, sin inscripción
  if (hasEventEnded(event)) {
    return <PastEventMemory event={event} canEdit={canEdit} isAdmin={isAdmin} />;
  }

  // Verificar si el evento ya pasó
  const now = new Date();
  const eventEndDate = event.endDate || event.date;
  const hasEventPassed = new Date(eventEndDate) < now;

  const isExternalEvent = !!event.externalRegistrationUrl;

  // El mapa sale del link de Google Maps; si es un link corto, se busca la dirección.
  const mapEmbedUrl =
    !event.isOnline && event.googleMapsUrl
      ? googleMapsEmbedUrl(
          event.googleMapsUrl,
          [event.placeName, event.address, event.city].filter(Boolean).join(', '),
        )
      : null;

  // Todo lo que sigue depende solo del evento y la sesión: se pide en paralelo.
  const [registration, counts, registrations, eventAnnouncements, discountRow] = await Promise.all([
    // Si el usuario ya está registrado (solo inscripciones activas)
    userId && !isExternalEvent
      ? prisma.eventRegistration.findFirst({
          where: { eventId: id, userId, cancelledAt: null },
          select: { id: true },
        })
      : null,
    // Inscripciones activas (para el cupo) y cuántos esperan en la lista de espera
    !isExternalEvent ? getEventCounts(id) : null,
    // Inscripciones, para el resumen de quien gestiona el evento (solo inscripción interna)
    canEdit && !isExternalEvent
      ? prisma.eventRegistration.findMany({
          where: { eventId: id },
          select: { cancelledAt: true },
        })
      : Promise.resolve([] as { cancelledAt: Date | null }[]),
    getEventAnnouncements(id),
    // El código de descuento no viene en el evento cacheado: se pide aparte y solo llega al
    // navegador con sesión iniciada.
    isExternalEvent
      ? prisma.event.findUnique({ where: { id }, select: { discountCode: true } })
      : null,
  ]);

  const discount = discountRow?.discountCode
    ? { code: userId ? discountRow.discountCode : null }
    : null;

  const currentRegistrations =
    event.capacity !== null && counts ? counts.activeRegistrations : null;
  const waitlistCount = counts?.waitlist ?? 0;
  const isRegistered = !!registration;
  const registrationId = registration?.id ?? null;

  const capacityInfo =
    event.capacity !== null && currentRegistrations !== null
      ? {
          current: currentRegistrations,
          capacity: event.capacity,
          available: currentRegistrations < event.capacity,
        }
      : null;

  const isFull = event.markedAsFull || (capacityInfo !== null && !capacityInfo.available);

  // Si el usuario está esperando, en qué lugar
  const waitlistPosition =
    userId && !isRegistered && waitlistCount > 0 ? await getWaitlistPosition(id, userId) : null;

  const absolute = (src: string) => (src.startsWith('/') ? `${SITE_URL}${src}` : src);
  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: normalizeDescription(event.description).slice(0, 5000),
    startDate: event.date.toISOString(),
    endDate: (event.endDate ?? event.date).toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: event.isOnline
      ? { '@type': 'VirtualLocation', url: `${SITE_URL}/eventos/${event.id}` }
      : {
          '@type': 'Place',
          name: event.placeName || event.city || 'A confirmar',
          address: {
            '@type': 'PostalAddress',
            streetAddress: event.address ?? undefined,
            addressLocality: event.city ?? undefined,
            addressCountry: 'AR',
          },
        },
    ...(event.flyerImages[0] && { image: [absolute(event.flyerImages[0])] }),
    organizer: organization,
    isAccessibleForFree: true,
    url: `${SITE_URL}/eventos/${event.id}`,
  };

  return (
    <>
      <JsonLd data={eventJsonLd} />
      {/* Places left update live as people sign up or cancel. */}
      {!isExternalEvent && <RealtimeRefresh topics={[`event:${event.id}`]} />}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col p-4 pt-0">
        <StickyHeader className="mt-4">
          <PageTitle
            path={[{ label: 'eventos', href: '/eventos' }, { label: event.name }]}
            action={
              <>
                <EventStatusBadge date={event.date} endDate={event.endDate} isFull={isFull} />
                {canEdit && (
                  <Link href={`/eventos/${id}/editar`}>
                    <Button variant="pcn" size="sm" className="flex items-center gap-1.5">
                      <Edit className="h-4 w-4" />
                      editarEvento();
                    </Button>
                  </Link>
                )}
              </>
            }
          />
        </StickyHeader>

        <div className="mb-14 grid grid-cols-1 divide-y divide-pcnGreen-200 border border-pcnGreen-200 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:divide-x md:divide-y-0">
          {/* Columna principal — flyer */}
          <div className="flex flex-col divide-y divide-pcnGreen-200">
            <div className="relative w-full overflow-hidden">
              <EventFlyerCarousel
                images={event.flyerImages}
                eventName={event.name}
                variant="detail"
              />
            </div>
            {event.flyerImages.length > 0 && event.flyerDesigners.length > 0 && (
              <FlyerCredits credits={event.flyerDesigners} className="px-3 py-2" />
            )}

            {(event.galleryItems.length > 0 || isAdmin) && (
              <Section title="fotos y videos">
                <EventPhotos
                  eventId={id}
                  photos={event.galleryItems.map(signGalleryItem)}
                  total={event._count.galleryItems}
                  canUpload={isAdmin}
                />
              </Section>
            )}

            {/* Link a propuestas de charlas (quien gestiona el evento, con call for speakers) */}
            {canEdit && event.callForSpeakersEnabled && (
              <Section title="propuestas de charlas">
                <Link
                  href={`/eventos/${id}/propuestas-de-charlas`}
                  className="flex items-center justify-between gap-2 text-sm text-muted-foreground hover:text-pcnGreen"
                >
                  <span className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Call for speakers habilitado.
                  </span>
                  <span className="font-mono text-xs">ver propuestas →</span>
                </Link>
              </Section>
            )}

            {/* Gestión de las charlas del evento (quien gestiona el evento) */}
            {canEdit && (
              <Section title="charlas del evento">
                <Link
                  href={`/eventos/${id}/charlas`}
                  className="flex items-center justify-between gap-2 text-sm text-muted-foreground hover:text-pcnGreen"
                >
                  <span className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Cargá y editá las charlas que se dieron.
                  </span>
                  <span className="font-mono text-xs">gestionar →</span>
                </Link>
              </Section>
            )}
          </div>

          {/* Columna de información */}
          <div className="flex flex-col divide-y divide-pcnGreen-200">
            {/* Botón de registro */}
            {!hasEventPassed && (
              <div className="p-3">
                <Suspense
                  fallback={
                    <Button variant="pcn" className="w-full" disabled>
                      cargando...
                    </Button>
                  }
                >
                  <EventDetailClient
                    eventId={id}
                    eventName={event.name}
                    isAuthenticated={!!userId}
                    isRegistered={isRegistered}
                    registrationId={registrationId}
                    capacityAvailable={capacityInfo?.available ?? true}
                    capacityInfo={capacityInfo}
                    externalRegistrationUrl={event.externalRegistrationUrl}
                    discount={discount}
                    isFull={isFull}
                    waitlistPosition={waitlistPosition}
                    waitlistCount={waitlistCount}
                  />
                </Suspense>
              </div>
            )}

            {/* Información del evento */}
            <Section title="info">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                {event.endDate ? (
                  <>
                    <dt className="text-muted-foreground">inicio</dt>
                    <dd>
                      <LocalDate date={event.date} /> <LocalTime date={event.date} />
                    </dd>
                    <dt className="text-muted-foreground">fin</dt>
                    <dd>
                      <LocalDate date={event.endDate} /> <LocalTime date={event.endDate} />
                    </dd>
                  </>
                ) : (
                  <>
                    <dt className="text-muted-foreground">fecha</dt>
                    <dd>
                      <LocalDate date={event.date} /> <LocalTime date={event.date} />
                    </dd>
                  </>
                )}
                {event.isOnline ? (
                  <>
                    <dt className="text-muted-foreground">modo</dt>
                    <dd>online</dd>
                  </>
                ) : (
                  (event.city || event.placeName || event.address) && (
                    <>
                      <dt className="text-muted-foreground">lugar</dt>
                      <dd>
                        {[event.placeName, event.address, event.city && `${event.city}, Argentina`]
                          .filter(Boolean)
                          .join(' · ')}
                        {event.googleMapsUrl && (
                          <>
                            {' '}
                            <a
                              href={event.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-pcnGreen hover:underline"
                            >
                              <MapPin className="h-3 w-3" />
                              abrir en Google Maps
                            </a>
                          </>
                        )}
                      </dd>
                    </>
                  )
                )}
                {event.isOnline && event.streamingUrl && (
                  <>
                    <dt className="text-muted-foreground">stream</dt>
                    <dd>
                      <a
                        href={event.streamingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-pcnGreen hover:underline"
                      >
                        <Video className="h-3 w-3" />
                        ver transmisión
                      </a>
                    </dd>
                  </>
                )}
              </dl>
              {!hasEventPassed && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <a
                    href={createGoogleCalendarUrl(event)}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-pcnGreen-700 hover:text-pcnGreen"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    agregar a google calendar
                  </a>
                  <a
                    href={`/eventos/${event.id}/calendario.ics`}
                    download
                    title="Para Apple Calendar, Outlook y otros calendarios"
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-pcnGreen-700 hover:text-pcnGreen"
                  >
                    <Download className="h-3.5 w-3.5" />
                    descargar .ics
                  </a>
                </div>
              )}
            </Section>

            {/* Descripción */}
            {event.description && (
              <Section title="descripción">
                <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                  {event.description}
                </p>
              </Section>
            )}

            {/* Sponsors: right after what the event is about, with their logos. */}
            {event.sponsors && event.sponsors.length > 0 && (
              <Section title="sponsors">
                <EventSponsors eventId={event.id} sponsors={event.sponsors} />
              </Section>
            )}

            {/* Organizadores, con link a su perfil */}
            {(event.organizers.length > 0 || canEdit) && (
              <Section title="organizadores">
                <ul className="flex flex-wrap gap-x-4 gap-y-2">
                  {event.organizers.map(({ user }) => (
                    <li key={user.id}>
                      <PersonLink person={user} />
                    </li>
                  ))}
                </ul>
                {canEdit && (
                  <Link
                    href={`/eventos/${id}/organizadores`}
                    className="mt-2 block text-right font-mono text-xs text-muted-foreground hover:text-pcnGreen"
                  >
                    gestionar organizadores →
                  </Link>
                )}
              </Section>
            )}

            {/* Link a página de inscripciones (solo para quien gestiona el evento) */}
            {canEdit && !isExternalEvent && (
              <Section title="inscripciones">
                <Link
                  href={`/eventos/${id}/inscripciones`}
                  className="flex items-center justify-between gap-2 font-mono text-xs hover:text-pcnGreen"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    {registrations.filter((r) => r.cancelledAt === null).length} activas ·{' '}
                    {registrations.length} total
                    {waitlistCount > 0 && <> · {waitlistCount} en espera</>}
                  </span>
                  <span>ver todas →</span>
                </Link>
              </Section>
            )}

            {/* Call for speakers — botón para usuarios */}
            {event.callForSpeakersEnabled && (
              <Section title="call for speakers">
                <Link
                  href={
                    userId
                      ? `/eventos/${id}/proponer-charla`
                      : `/iniciar-sesion?redirect=/eventos/${id}/proponer-charla`
                  }
                  className="flex items-center justify-between gap-2 text-sm text-muted-foreground hover:text-pcnGreen"
                >
                  <span>Este evento acepta propuestas de charlas de la comunidad.</span>
                  <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-pcnGreen">
                    <Mic className="h-3.5 w-3.5" />
                    proponer →
                  </span>
                </Link>
              </Section>
            )}

            {/* Anuncios del evento */}
            {(eventAnnouncements.length > 0 || canEdit) && (
              <div className="p-3">
                <EventAnnouncements
                  announcements={eventAnnouncements}
                  eventId={event.id}
                  canManage={canEdit}
                />
              </div>
            )}

            {/* Mapa */}
            {mapEmbedUrl && (
              <div className="relative h-56 w-full overflow-hidden">
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación del evento"
                  sandbox="allow-scripts allow-same-origin"
                  className="absolute inset-0"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EventDetailPage;
