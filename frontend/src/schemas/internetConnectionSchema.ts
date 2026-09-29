import { z } from 'zod'

export const internetConnectionSchema = z.object({
  internet: z.object({
    currentSpeedMbps: z.coerce
      .number()
      .min(1, 'Internet speed must be at least 1 Mbps')
      .optional(),

    connectionType: z.enum([
      'fiber',
      'dsl_or_cellular',
      'not_checked',
    ]),

    downtimeImpact: z.enum([
      'can_wait',
      'same_day_matters',
      'every_minute_matters',
    ]),
  }),
})

export type InternetConnectionData = z.infer<
  typeof internetConnectionSchema
>
