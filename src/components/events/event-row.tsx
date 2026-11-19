import { EventStatusBadge } from '@/components/events/event-status-badge';
import { LocalEventDate } from '@/components/ui/local-date-time';
import { ruledCellClassName } from '@/components/ui/ruled-grid';
import { cn } from '@/lib/utils';
import { ChevronRight, MapPin, Video } from 'lucide-react';
import Link from 'next/link';
import type { Event } from '@/generated/prisma/browser';

type EventWithCount = Omit<Event, 'discountCode'> & { _count: { registrations: number } };

export const EventRow: React.FC<{
  event: EventWithCount;
  className?: string;
}> = ({ event, className }) => {
  const isFull =
    event.markedAsFull || (event.capacity !== null && event._count.registrations >= event.capacity);
  const flyer = event.flyerImages[0];
  const location = event.isOnline
    ? 'online'
    : [event.placeName, event.city].filter(Boolean).join(', ');
  const LocationIcon = event.isOnline ? Video : MapPin;

  return (
    <Link
      href={`/eventos/${event.id}`}
      className={cn(ruledCellClassName, 'flex group gap-4 p-4 sm:gap-3 sm:p-3', className)}
    >
      {/* Flyers are portrait posters: a taller thumbnail on phones reads as a poster, not a stamp. */}
      <div className="aspect-4/5 w-24 shrink-0 self-start overflow-hidden rounded-sm border border-pcnGreen-200 bg-black sm:aspect-square sm:w-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flyer ?? '/logo.webp'}
          alt={event.name}
          className={cn(
            'h-full w-full object-cover object-top transition-[filter,transform] duration-300 group-hover:scale-105',
            !flyer && 'p-4 opacity-30',
          )}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-1">
        <p className="font-mono text-xs text-pcnGreen-500 sm:text-[11px]">
          <LocalEventDate date={event.date} />
        </p>

        <div className="flex items-start gap-2">
          <h2 className="line-clamp-2 min-w-0 flex-1 font-mono text-base leading-snug font-semibold group-hover:text-pcnGreen sm:line-clamp-1 sm:text-sm sm:leading-5">
            {event.name}
          </h2>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-pcnGreen sm:mt-0.5 sm:h-3 sm:w-3" />
        </div>

        {event.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:text-xs sm:leading-4">
            {event.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          {location && (
            <p className="flex max-w-full min-w-0 items-center gap-1.5 font-mono text-xs text-muted-foreground/80 sm:text-[11px]">
              <LocationIcon className="h-3.5 w-3.5 shrink-0 text-pcnGreen-500 sm:h-3 sm:w-3" />
              <span className="truncate">{location}</span>
            </p>
          )}
          <span className="flex empty:hidden">
            <EventStatusBadge date={event.date} endDate={event.endDate} isFull={isFull} />
          </span>
        </div>
      </div>
    </Link>
  );
};
