import { isGoogleMapsUrl } from '@/lib/google-maps';
import { z } from 'zod';

export const eventSchema = z
  .object({
    name: z
      .string()
      .min(3, { message: 'El nombre debe tener al menos 3 caracteres' })
      .max(200, { message: 'El nombre no puede exceder 200 caracteres' }),
    description: z
      .string()
      .min(10, { message: 'La descripción debe tener al menos 10 caracteres' })
      .max(2000, { message: 'La descripción no puede exceder 2000 caracteres' }),
    date: z.string().min(1, { message: 'La fecha es requerida' }),
    endDate: z
      .string()
      .optional()
      .transform((val) => (val === '' || val === undefined ? undefined : val)),
    city: z
      .string()
      .max(100, { message: 'La ciudad no puede exceder 100 caracteres' })
      .optional()
      .transform((val) => (val === '' || val === undefined ? undefined : val)),
    address: z
      .string()
      .max(200, { message: 'La dirección no puede exceder 200 caracteres' })
      .optional()
      .transform((val) => (val === '' || val === undefined ? undefined : val)),
    placeName: z
      .string()
      .max(100, { message: 'El nombre del lugar no puede exceder 100 caracteres' })
      .optional()
      .transform((val) => (val === '' || val === undefined ? undefined : val)),
    flyerImages: z
      .array(
        z.string().refine((val) => val.startsWith('/') || z.string().url().safeParse(val).success, {
          message: 'La imagen del flyer no es válida',
        }),
      )
      .optional()
      .default([]),
    // Quién diseñó el flyer del evento (todas sus imágenes): alguien con cuenta o solo un nombre.
    flyerDesigners: z
      .array(
        z.object({
          userId: z.string().max(40).optional().nullable(),
          name: z
            .string()
            .trim()
            .min(1, { message: 'Poné el nombre de quien diseñó el flyer' })
            .max(80, { message: 'Máximo 80 caracteres' }),
        }),
      )
      .max(40)
      .optional()
      .default([]),
    googleMapsUrl: z
      .string()
      .optional()
      .transform((val) => {
        const trimmed = val?.trim() ?? '';
        return trimmed === '' ? undefined : trimmed;
      })
      .refine((val) => val === undefined || isGoogleMapsUrl(val), {
        message: 'Pegá un link de Google Maps (google.com/maps o maps.app.goo.gl)',
      }),
    sponsors: z
      .array(
        z.object({
          name: z.string().min(1, { message: 'El nombre del sponsor es requerido' }),
          website: z
            .string()
            .optional()
            .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
              message: 'Debe ser una URL válida',
            })
            .transform((val) => (val === '' ? undefined : val)),
          // Ruta de /public (un partner del sitio) o URL https; nunca otro esquema.
          logo: z
            .string()
            .max(2048)
            .optional()
            .nullable()
            .refine((val) => !val || /^(\/[\w./-]+|https:\/\/\S+)$/.test(val), {
              message: 'El logo debe ser una ruta del sitio o una URL https',
            })
            .transform((val) => (val ? val : undefined)),
        }),
      )
      .optional()
      .default([]),
    externalRegistrationUrl: z
      .string()
      .optional()
      .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
        message: 'Debe ser una URL válida',
      })
      .transform((val) => (val === '' ? undefined : val)),
    // Descuento para quienes tienen cuenta en programaConNosotros; solo tiene sentido con
    // inscripción externa (se descarta sin ella).
    discountCode: z
      .string()
      .max(100, { message: 'El código no puede exceder 100 caracteres' })
      .optional()
      .nullable()
      .transform((val) => {
        const trimmed = val?.trim() ?? '';
        return trimmed === '' ? undefined : trimmed;
      }),
    isOnline: z.preprocess(
      (val) => (val === undefined || val === null ? false : val),
      z.boolean().default(false),
    ),
    streamingUrl: z
      .string()
      .optional()
      .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
        message: 'Debe ser una URL válida',
      })
      .transform((val) => (val === '' ? undefined : val)),
    markedAsFull: z.preprocess(
      (val) => (val === undefined || val === null ? false : val),
      z.boolean().default(false),
    ),
    callForSpeakersEnabled: z.preprocess(
      (val) => (val === undefined || val === null ? false : val),
      z.boolean().default(false),
    ),
    // Optional because the server re-parses the client-side output, where '' is already undefined.
    shortcut: z
      .string()
      .optional()
      .transform((val) => {
        const trimmed = val?.trim() ?? '';
        return trimmed === '' ? undefined : trimmed.toLowerCase();
      })
      .pipe(
        z
          .string()
          .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones (sin espacios)')
          .optional(),
      ),
    capacity: z.preprocess(
      (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return val.toString();
        return val;
      },
      z
        .string()
        .optional()
        .transform((val) => (val === '' || val === undefined ? undefined : parseInt(val, 10)))
        .refine((val) => val === undefined || (!isNaN(val) && val > 0), {
          message: 'El cupo debe ser un número mayor a 0',
        }),
    ),
  })
  .superRefine((data, ctx) => {
    // En el form, no recién en el servidor: ahí el mensaje no llega al navegador en producción
    if (data.endDate && new Date(data.endDate) <= new Date(data.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de finalización debe ser posterior a la fecha de inicio',
        path: ['endDate'],
      });
    }
    if (!data.isOnline) {
      if (!data.city || data.city.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 2,
          origin: 'string',
          inclusive: true,
          message: 'La ciudad debe tener al menos 2 caracteres',
          path: ['city'],
        });
      }
      if (!data.placeName || data.placeName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 2,
          origin: 'string',
          inclusive: true,
          message: 'El nombre del lugar debe tener al menos 2 caracteres',
          path: ['placeName'],
        });
      }
      if (!data.address || data.address.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 5,
          origin: 'string',
          inclusive: true,
          message: 'La dirección debe tener al menos 5 caracteres',
          path: ['address'],
        });
      }
    }
  });

// Tipo de entrada del formulario (antes del transform)
export type EventFormData = z.input<typeof eventSchema>;

// Tipo de salida después de la validación (después del transform)
export type EventData = z.infer<typeof eventSchema>;
