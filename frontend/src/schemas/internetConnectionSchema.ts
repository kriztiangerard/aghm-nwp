import { z } from 'zod'

import { QUESTIONNAIRE_LIMITS } from '../lib/questionnaireLimits'

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

export const internetConnectionSchema = z.object({
  internet: z.object({
    currentSpeedMbps: z.preprocess(
      (value) =>
        value === undefined || value === null || value === ''
          ? undefined
          : value,
      z.union([
        z.coerce.number()
          .int('Current internet speed must be a whole number.')
          .min(QUESTIONNAIRE_LIMITS.internet.currentSpeedMbps.min, `Current internet speed must be at least ${QUESTIONNAIRE_LIMITS.internet.currentSpeedMbps.min} Mbps.`)
          .max(QUESTIONNAIRE_LIMITS.internet.currentSpeedMbps.max, `Current internet speed must be ${QUESTIONNAIRE_LIMITS.internet.currentSpeedMbps.max.toLocaleString()} Mbps or less.`),
        z.undefined(),
      ])
    ),

    connectionType: requiredEnum(
      ['fiber', 'dsl_or_cellular', 'not_checked'],
      'Internet connection type is required.'
    ),

    downtimeImpact: requiredEnum(
      ['can_wait', 'same_day_matters', 'every_minute_matters'],
      'Internet downtime impact is required.'
    ),
  }),
})

export type InternetConnectionData = z.infer<
  typeof internetConnectionSchema
>
