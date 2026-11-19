import { PageTitle } from '@/components/ui/page-title';
import { StickyHeader } from '@/components/ui/sticky-header';
import { getCurrentSession } from '@/actions/auth/get-current-session';
import { canDeleteEvent } from '@/lib/event-permissions';
import { redirect } from 'next/navigation';
import { fetchEventForEdit } from '@/actions/events/fetch-event-for-edit';
import { EditEventForm } from '@/components/events/edit-event-form';
import { DeleteEventButton } from '@/components/events/delete-event-button';
import type { Metadata } from 'next';
import { tabTitle } from '@/lib/tab-title';

export const metadata: Metadata = { title: tabTitle.vim('eventos/*/editar') };

const EditEventPage = async (props: { params: Promise<{ id: string }> }) => {
  const params = await props.params;
  const id = params.id;

  const session = await getCurrentSession();

  if (!session) {
    redirect(`/eventos/${id}`);
  }

  // Quien no puede editar este evento vuelve al detalle
  const event = await fetchEventForEdit(id).catch(() => redirect(`/eventos/${id}`));

  if (!event) {
    redirect('/eventos');
  }

  const defaultValues = {
    name: event.name,
    description: event.description,
    date: event.date.toISOString(),
    endDate: event.endDate?.toISOString() ?? '',
    city: event.city ?? '',
    address: event.address ?? '',
    placeName: event.placeName ?? '',
    flyerImages: event.flyerImages,
    googleMapsUrl: event.googleMapsUrl ?? '',
    capacity: event.capacity?.toString() || '',
    externalRegistrationUrl: event.externalRegistrationUrl ?? '',
    discountCode: event.discountCode ?? '',
    shortcut: event.shortcut ?? '',
    isOnline: event.isOnline ?? false,
    streamingUrl: event.streamingUrl ?? '',
    markedAsFull: event.markedAsFull ?? false,
    callForSpeakersEnabled: event.callForSpeakersEnabled ?? false,
    flyerDesigners: event.flyerDesigners,
    sponsors:
      event.sponsors?.map((sponsor) => ({
        name: sponsor.name,
        website: sponsor.website || '',
        logo: sponsor.logo,
      })) || [],
  };

  return (
    <>
      <div className="flex flex-1 flex-col p-4 pt-0">
        <div className="mt-4">
          <StickyHeader>
            <PageTitle
              path={[
                { label: 'eventos', href: '/eventos' },
                { label: event.name, href: `/eventos/${id}` },
                { label: 'editar' },
              ]}
              action={
                canDeleteEvent(session.user, event) && (
                  <DeleteEventButton eventId={id} eventName={event.name} />
                )
              }
            />
          </StickyHeader>

          <EditEventForm
            eventId={id}
            defaultValues={defaultValues}
            flyerAgent={session.user.role === 'ADMIN'}
          />
        </div>
      </div>
    </>
  );
};

export default EditEventPage;
