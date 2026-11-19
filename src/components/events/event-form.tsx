'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { eventSchema, EventFormData } from '@/schemas/event-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  MapPin,
  Building2,
  Save,
  Plus,
  Trash2,
  Users,
  ExternalLink,
  Video,
  Link2,
  MapIcon,
  ImageIcon,
  TicketPercent,
} from 'lucide-react';
import { MultiFileUpload } from '@/components/ui/multi-file-upload';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import { formActionBarClassName } from '@/components/ui/form-action-bar';
import { FormSection } from '@/components/ui/form-section';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { partners } from '@/data/partners';
import { FlyerDesignersField } from '@/components/events/flyer-designers-field';
import { DateInput } from '@/components/ui/date-input';
import { FillFromFlyersButton } from '@/components/events/fill-from-flyers-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type EventFormProps = {
  defaultValues?: Partial<EventFormData>;
  onSubmit: (_values: EventFormData) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
  // Botón para completar el evento con IA a partir de los flyers (solo admins: son quienes suben flyers).
  flyerAgent?: boolean;
  /**
   * Who saving these values will notify, in the app and by email, if anyone: the form asks to
   * confirm before sending, so nobody mails the whole community by accident.
   */
  notificationNotice?: (_values: EventFormData) => string | null;
};

export function EventForm({
  defaultValues,
  onSubmit,
  submitLabel = 'guardarEvento();',
  cancelHref = '/eventos',
  flyerAgent = false,
  notificationNotice,
}: EventFormProps) {
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      date: defaultValues?.date || '',
      endDate: defaultValues?.endDate || '',
      city: defaultValues?.city || '',
      address: defaultValues?.address || '',
      placeName: defaultValues?.placeName || '',
      flyerImages: defaultValues?.flyerImages ?? [],
      flyerDesigners: defaultValues?.flyerDesigners ?? [],
      googleMapsUrl: defaultValues?.googleMapsUrl ?? '',
      sponsors: defaultValues?.sponsors || [],
      capacity: defaultValues?.capacity?.toString() || '',
      externalRegistrationUrl: defaultValues?.externalRegistrationUrl ?? '',
      discountCode: defaultValues?.discountCode ?? '',
      shortcut: defaultValues?.shortcut ?? '',
      isOnline: defaultValues?.isOnline ?? false,
      streamingUrl: defaultValues?.streamingUrl ?? '',
      markedAsFull: defaultValues?.markedAsFull ?? false,
      callForSpeakersEnabled: defaultValues?.callForSpeakersEnabled ?? false,
    },
  });

  const isOnline = !!form.watch('isOnline');
  const hasExternalRegistration = !!form.watch('externalRegistrationUrl')?.trim();
  // The end can't be before the start's day.
  const startDay = form.watch('date')?.slice(0, 10) || undefined;

  const sponsors = form.watch('sponsors') ?? [];
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'sponsors',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toUtcIso = (local: string) => (local ? new Date(local).toISOString() : '');

  const [pending, setPending] = useState<{ values: EventFormData; notice: string } | null>(null);

  const handleSubmit = async (values: EventFormData) => {
    const notice = notificationNotice?.(values);
    if (notice) {
      setPending({ values, notice });
      return;
    }
    await submit(values);
  };

  const submit = async (values: EventFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...values,
        date: toUtcIso(values.date),
        endDate: values.endDate ? toUtcIso(values.endDate) : '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="divide-y divide-pcnGreen-200 border border-pcnGreen-200">
            <FormSection id="general" index={1} title="general" description="de qué se trata">
              <div className="space-y-6">
                {/* Nombre del evento */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del evento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Meetup de desarrolladores" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Descripción */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe el evento, qué se hará, quién puede asistir, etc."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>
            <FormSection id="fecha" index={2} title="fecha" description="cuándo empieza y termina">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Fecha de inicio */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Calendar className="mr-2 inline h-4 w-4" />
                          Inicio
                        </FormLabel>
                        <FormControl>
                          <DateInput withTime required {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Fecha de finalización */}
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Calendar className="mr-2 inline h-4 w-4" />
                          Fin (opcional)
                        </FormLabel>
                        <FormControl>
                          <DateInput withTime min={startDay} {...field} />
                        </FormControl>
                        <FormDescription>
                          Si el evento tiene una duración específica
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </FormSection>
            <FormSection id="ubicacion" index={3} title="ubicación" description="dónde se hace">
              <div className="space-y-6">
                {/* Es online */}
                <FormField
                  control={form.control}
                  name="isOnline"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            id="isOnline"
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="h-4 w-4 cursor-pointer rounded border-input accent-pcnPurple dark:accent-pcnGreen"
                          />
                        </FormControl>
                        <FormLabel htmlFor="isOnline" className="cursor-pointer">
                          <Video className="mr-2 inline h-4 w-4" />
                          Es un evento online
                        </FormLabel>
                      </div>
                      <FormDescription>
                        Si el evento se realiza de forma virtual, no es necesario ingresar ubicación
                        física.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campos de ubicación (solo presencial) */}
                {!isOnline && (
                  <>
                    {/* Ciudad */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <MapPin className="mr-2 inline h-4 w-4" />
                            Ciudad
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Buenos Aires"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Nombre del lugar */}
                    <FormField
                      control={form.control}
                      name="placeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Building2 className="mr-2 inline h-4 w-4" />
                            Nombre del lugar
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Universidad de Buenos Aires, Bar XYZ"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Dirección */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <MapPin className="mr-2 inline h-4 w-4" />
                            Dirección
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Av. Corrientes 1234"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Link de transmisión (solo online) */}
                {isOnline && (
                  <FormField
                    control={form.control}
                    name="streamingUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Video className="mr-2 inline h-4 w-4" />
                          Link de transmisión (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://meet.google.com/..."
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>Link de Zoom, Google Meet, YouTube, etc.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {/* Link de Google Maps (solo presencial) */}
                {!isOnline && (
                  <FormField
                    control={form.control}
                    name="googleMapsUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <MapIcon className="mr-2 inline h-4 w-4" />
                          URL de Google Maps (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://maps.app.goo.gl/..."
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          En Google Maps: Compartir → Copiar vínculo. Se usa para el mapa y el link
                          &quot;abrir en Google Maps&quot;.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </FormSection>
            <FormSection
              id="flyers"
              index={4}
              title="flyers"
              description="cómo se ve en el listado"
            >
              <div className="space-y-6">
                {/* Flyer del evento */}
                <FormField
                  control={form.control}
                  name="flyerImages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flyers del evento (opcional)</FormLabel>
                      <FormControl>
                        <MultiFileUpload
                          value={field.value ?? []}
                          onChange={field.onChange}
                          folder="events/flyers"
                        />
                      </FormControl>
                      <FormDescription>
                        Podés subir uno o más flyers del evento (JPEG, PNG, WebP, GIF, HEIC). Si no
                        subís ninguno, se mostrará un placeholder con el logo de PCN.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {flyerAgent && <FillFromFlyersButton />}

                {/* Crédito a quien diseñó el flyer (todas sus imágenes) */}
                <FormField
                  control={form.control}
                  name="flyerDesigners"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diseño del flyer (opcional)</FormLabel>
                      <FormControl>
                        <FlyerDesignersField
                          flyers={form.watch('flyerImages') ?? []}
                          value={field.value ?? []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>
            <FormSection
              id="inscripcion"
              index={5}
              title="inscripción"
              description="cupo y cómo anotarse"
            >
              <div className="space-y-6">
                {/* Cupo */}
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Users className="mr-2 inline h-4 w-4" />
                        Cupo máximo (opcional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Ej: 50"
                          {...field}
                          value={String(field.value ?? '')}
                        />
                      </FormControl>
                      <FormDescription>
                        Número máximo de personas que pueden inscribirse al evento. Dejar vacío para
                        cupo ilimitado.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* URL de inscripción externa */}
                <FormField
                  control={form.control}
                  name="externalRegistrationUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <ExternalLink className="mr-2 inline h-4 w-4" />
                        URL de inscripción externa (opcional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://lu.ma/mi-evento"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Si se completa, el botón de inscripción redirigirá a esta URL (por ejemplo,
                        un evento de Luma) en lugar de usar el sistema interno.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Código de descuento para miembros (solo con inscripción externa) */}
                {hasExternalRegistration && (
                  <FormField
                    control={form.control}
                    name="discountCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <TicketPercent className="mr-2 inline h-4 w-4" />
                          Código de descuento (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: PCN20"
                            autoComplete="off"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Solo lo ven quienes tienen cuenta en programaConNosotros, desde el botón
                          &quot;Ver código de descuento&quot; de la página del evento.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Cupo completo manual */}
                <FormField
                  control={form.control}
                  name="markedAsFull"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            id="markedAsFull"
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="h-4 w-4 cursor-pointer rounded border-input accent-pcnPurple dark:accent-pcnGreen"
                          />
                        </FormControl>
                        <FormLabel htmlFor="markedAsFull" className="cursor-pointer">
                          Marcar como cupo completo
                        </FormLabel>
                      </div>
                      <FormDescription>
                        Muestra el badge &quot;Cupo completo&quot; en el listado y en la página del
                        evento. Útil cuando las inscripciones se manejan fuera del sistema (ej.
                        Luma).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>
            <FormSection
              id="difusion"
              index={6}
              title="difusión"
              description="links cortos y charlas"
            >
              <div className="space-y-6">
                {/* URL corta para flyers */}
                <FormField
                  control={form.control}
                  name="shortcut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Link2 className="mr-2 inline h-4 w-4" />
                        URL corta para flyers (opcional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="ej: cowork" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        Si se completa, este evento será accesible en{' '}
                        <strong>/{field.value || 'slug'}</strong> y redirigirá al próximo evento con
                        ese slug. Se puede reutilizar en futuros eventos de la misma serie.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Call for speakers */}
                <FormField
                  control={form.control}
                  name="callForSpeakersEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            id="callForSpeakersEnabled"
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="h-4 w-4 cursor-pointer rounded border-input accent-pcnPurple dark:accent-pcnGreen"
                          />
                        </FormControl>
                        <FormLabel htmlFor="callForSpeakersEnabled" className="cursor-pointer">
                          Habilitar call for speakers
                        </FormLabel>
                      </div>
                      <FormDescription>
                        Los miembros autenticados podrán proponer charlas para este evento.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>
            <FormSection
              id="sponsors"
              index={7}
              title="sponsors"
              description="quiénes apoyan (opcional)"
            >
              <div className="space-y-6">
                {/* Sponsors */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {/* Partners already listed on the site fill in name, link and logo. */}
                    <Select
                      value=""
                      onValueChange={(name) => {
                        const partner = partners.find((p) => p.name === name);
                        if (partner)
                          append({ name: partner.name, website: partner.url, logo: partner.logo });
                      }}
                    >
                      <SelectTrigger
                        className="h-8 w-56"
                        aria-label="Agregar un partner como sponsor"
                      >
                        <SelectValue placeholder="+ partner del sitio" />
                      </SelectTrigger>
                      <SelectContent>
                        {partners
                          .filter(
                            (partner) => !sponsors.some((sponsor) => sponsor.name === partner.name),
                          )
                          .map((partner) => (
                            <SelectItem key={partner.name} value={partner.name}>
                              {partner.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ name: '', website: '', logo: '' })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      agregarSponsor();
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-pcnGreen-200 bg-black/40">
                        {sponsors[index]?.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sponsors[index]?.logo ?? undefined}
                            alt=""
                            className="size-7 object-contain"
                          />
                        ) : (
                          <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
                        )}
                      </div>
                      <FormField
                        control={form.control}
                        name={`sponsors.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="min-w-40 flex-1">
                            <FormControl>
                              <Input placeholder="Nombre del sponsor" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`sponsors.${index}.website`}
                        render={({ field }) => (
                          <FormItem className="min-w-40 flex-1">
                            <FormControl>
                              <Input
                                type="url"
                                placeholder="https://ejemplo.com"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`sponsors.${index}.logo`}
                        render={({ field }) => (
                          <FormItem className="min-w-40 flex-1">
                            <FormControl>
                              <Input
                                placeholder="logo: https://… (opcional)"
                                aria-label="URL del logo"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="shrink-0"
                        aria-label="Quitar sponsor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {fields.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No hay sponsors agregados. Haz clic en &quot;Agregar sponsor&quot; para
                      agregar uno.
                    </p>
                  )}
                </div>
              </div>
            </FormSection>
          </div>

          {/* Botones */}
          <div className={`${formActionBarClassName} flex gap-4 border-t border-pcnGreen-200`}>
            <Button
              type="submit"
              variant="pcn"
              className="flex-1"
              loading={isSubmitting}
              loadingText="guardando..."
            >
              <Save className="mr-2 h-4 w-4" />
              {submitLabel}
            </Button>
            <Link href={cancelHref} className="flex-1">
              <Button type="button" variant="outline" className="w-full" disabled={isSubmitting}>
                cancelar();
              </Button>
            </Link>
          </div>
        </form>
      </Form>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Esto le avisa a la comunidad</AlertDialogTitle>
            <AlertDialogDescription>{pending?.notice}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const values = pending?.values;
                setPending(null);
                if (values) void submit(values);
              }}
            >
              {submitLabel.replace(/\(\);$/, '')} y avisar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
