import { z } from 'zod'

const requiredString = (message: string) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? ''
        : value,
    z.string().trim().min(1, message)
  )

const requiredEnum = <T extends readonly [string, ...string[]]>(
  values: T,
  message: string
) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? undefined
        : value,
    z.enum(values, {
      error: message,
    })
  )

const requiredNumber = (
  message: string,
  minMessage: string,
  intMessage: string,
  minimum = 1
) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? undefined
        : value,
    z
      .coerce
      .number({ error: message })
      .refine((value) => !Number.isNaN(value), { error: message })
      .refine(Number.isInteger, { error: intMessage })
      .min(minimum, { error: minMessage })
  )

export const projectBasicsSchema = z.object({
  project: z.object({
    name: requiredString('Project or company name is required.'),

    numberOfSites: requiredNumber(
      'Number of business locations is required.',
      'Number of business locations must be at least 1.',
      'Number of business locations must be a whole number.'
    ),

    siteRelationship: requiredEnum(
      ['same_city', 'same_country', 'different_countries'],
      'Business location relationship is required.'
    ),

    totalUsers: requiredNumber(
      'Total number of users is required.',
      'Total number of users must be at least 1.',
      'Total number of users must be a whole number.'
    ),
  }),
})

export type ProjectBasicsData = z.infer<typeof projectBasicsSchema>