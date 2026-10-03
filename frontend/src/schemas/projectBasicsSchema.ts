import { z } from 'zod'

import { QUESTIONNAIRE_LIMITS } from '../lib/questionnaireLimits'

const requiredString = (message: string) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? ''
        : value,
    z.string().trim().min(1, message).max(QUESTIONNAIRE_LIMITS.project.name.max, `Project or company name must be ${QUESTIONNAIRE_LIMITS.project.name.max} characters or fewer.`)
  )

const requiredNumber = (
  message: string,
  minMessage: string,
  intMessage: string,
  minimum = 1,
  maximum?: number,
  maxMessage?: string
) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? '__MISSING__'
        : value,
    z
      .union([z.coerce.number(), z.literal('__MISSING__')])
      .refine((value) => value !== '__MISSING__', { message })
      .refine((value) => !Number.isNaN(value), { message })
      .refine((value) => Number.isInteger(value), { message: intMessage })
      .refine((value) => value >= minimum, { message: minMessage })
      .refine((value) => maximum === undefined || value <= maximum, {
        message: maxMessage ?? `Value must be at most ${maximum}.`,
      })
  )

export const projectBasicsSchema = z.object({
  project: z.object({
    name: requiredString('Project or company name is required.'),

    numberOfSites: z.preprocess(
      (value) => {
        if (value === undefined || value === null || value === '') return '__MISSING__'
        if (typeof value === 'number') {
          if (value === 1) return 'one'
          if (value > 1) return 'two_or_more'
        }

        return value
      },
      z
        .union([
          z.enum(['one', 'two_or_more']),
          z.literal('__MISSING__'),
        ])
        .refine((value) => value !== '__MISSING__', {
          message: 'Number of business locations is required.',
        })
    ),

    siteRelationship: z
      .preprocess(
        (value) =>
          value === undefined || value === null || value === ''
            ? '__MISSING__'
            : value,
        z
          .union([
            z.enum(['same_city', 'same_country', 'different_countries']),
            z.literal('__MISSING__'),
          ])
      )
      .optional()
      .transform((value) => (value === '__MISSING__' ? undefined : value)),

    totalUsers: requiredNumber(
      'Total number of users is required.',
      `Headcount must be between ${QUESTIONNAIRE_LIMITS.project.totalUsers.min} and ${QUESTIONNAIRE_LIMITS.project.totalUsers.max}.`,
      `Headcount must be between ${QUESTIONNAIRE_LIMITS.project.totalUsers.min} and ${QUESTIONNAIRE_LIMITS.project.totalUsers.max}.`,
      QUESTIONNAIRE_LIMITS.project.totalUsers.min,
      QUESTIONNAIRE_LIMITS.project.totalUsers.max,
      `Headcount must be between ${QUESTIONNAIRE_LIMITS.project.totalUsers.min} and ${QUESTIONNAIRE_LIMITS.project.totalUsers.max}.`
    ),
  }).superRefine((value, ctx) => {
    if (value.numberOfSites === 'two_or_more' && !value.siteRelationship) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['siteRelationship'],
        message: 'Business location relationship is required when more than one site is selected.',
      })
    }
  }),
})

export type ProjectBasicsData = z.infer<typeof projectBasicsSchema>