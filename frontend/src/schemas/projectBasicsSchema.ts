import { z } from 'zod'

export const projectBasicsSchema = z.object({
  project: z.object({
    name: z
      .string()
      .min(1, 'Project or company name is required'),

    numberOfSites: z
      .coerce
      .number()
      .min(1, 'There must be at least 1 site'),

    siteRelationship: z
      .enum([
        'same_city',
        'same_country',
        'different_countries',
      ])
      .optional(),

    totalUsers: z
      .coerce
      .number()
      .min(1, 'There must be at least 1 user'),
  }),
})

export type ProjectBasicsData = z.infer<
  typeof projectBasicsSchema
>