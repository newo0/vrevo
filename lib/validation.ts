import { z } from "zod";
export const leadSchema = z.object({
  requestKey: z.string().uuid(),
  name: z.string().trim().max(100).optional(),
  phone: z
    .string()
    .transform((x) => x.replace(/\D/g, ""))
    .refine(
      (x) => /^([78]\d{10})$/.test(x),
      "Укажите российский номер: +7 и 10 цифр",
    )
    .transform((x) => "+7" + x.slice(1)),
  date: z
    .string()
    .max(10)
    .regex(/^$|^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (s) =>
        !s ||
        (!Number.isNaN(Date.parse(s)) &&
          new Date(s).toISOString().slice(0, 10) === s),
      "Проверьте дату",
    )
    .optional(),
  comment: z.string().max(2000).optional(),
  plotId: z.string().max(80).nullable().optional(),
  kind: z.enum(["viewing", "plot", "availability", "consultation"]),
  consent: z.literal(true),
  source: z.string().max(100),
  pageUrl: z.string().max(1000),
  utm: z.record(z.string(), z.string().max(200)).default({}),
  website: z.string().max(0),
});
export const plotPatch = z.object({
  status: z.enum(["available", "reserved", "sold"]),
  areaM2: z.number().positive().max(1000000).nullable(),
  priceRub: z.number().int().positive().max(2000000000).nullable(),
  description: z.string().max(3000).nullable(),
  cadastralNumber: z.string().max(100).nullable(),
  electricityKw: z.number().int().positive().max(1000).nullable(),
});
export const mediaSchema = z.object({
  title: z.string().min(1).max(250),
  category: z.string().min(1).max(100),
  author: z.string().max(500),
  source: z
    .string()
    .max(2000)
    .refine((s) => !s || /^https:\/\//.test(s)),
  license: z.string().max(200),
  licenseUrl: z
    .string()
    .max(2000)
    .nullable()
    .refine((s) => !s || /^https:\/\//.test(s)),
  publicationStatus: z.enum([
    "rights_not_confirmed",
    "allowed_with_attribution_and_sharealike",
    "rights_confirmed",
  ]),
  date: z.string().max(10).nullable(),
  order: z.number().int(),
  published: z.boolean(),
  visualization: z.boolean(),
});
export const contentSchema = z.object({
  metrikaId: z
    .string()
    .regex(/^$|^\d+$/)
    .default(""),
  analyticsEnabled: z.boolean().default(false),
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(500),
  phone: z.string().regex(/^\+\d{10,15}$/),
  phoneDisplay: z.string().max(40),
  contactName: z.string().max(100),
  priceFrom: z.number().int().positive(),
  headline: z.string().min(1).max(250),
  introduction: z.string().max(5000),
  lakeText: z.string().max(5000),
  natureText: z.string().max(5000),
  cityText: z.string().max(5000),
  purchaseText: z.string().max(5000),
  maintenanceText: z.string().max(5000),
  privacy: z.string().max(30000),
  consent: z.string().max(30000),
  legalDetails: z.string().max(5000),
  workingHours: z.string().max(200),
  geometryReviewed: z.boolean(),
  routes: z
    .array(
      z.object({
        city: z.string().max(100),
        origin: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/),
        roads: z.string().max(2000),
        distanceKm: z.number().positive().nullable(),
        minutes: z.number().positive().nullable(),
        verifiedAt: z.string().max(30).nullable(),
      }),
    )
    .length(3),
  infrastructure: z
    .array(
      z.object({
        title: z.string().max(100),
        description: z.string().max(2000),
        status: z.string().max(100),
        season: z.string().max(100),
      }),
    )
    .min(5)
    .max(15),
});
export const postSchema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(5000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mediaId: z.string().nullable(),
  published: z.boolean(),
});
