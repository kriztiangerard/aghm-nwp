import { z } from 'zod'

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
          .min(1, 'Current internet speed must be at least 1 Mbps.')
          .max(10000, 'Current internet speed must be 10,000 Mbps or less.'),
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
