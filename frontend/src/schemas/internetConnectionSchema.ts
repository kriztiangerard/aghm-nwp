import { z } from 'zod'

export const internetConnectionSchema = z.object({
  internetSpeed: z.coerce
    .number()
    .min(1, 'Internet speed must be at least 1 Mbps'),

  connectionType: z.enum([
    'fiber',
    'dsl',
    'wireless',
    'not-checked',
  ]),

  downtime: z.enum([
    'wait',
    'same-day',
    'critical',
  ]),
})

export type InternetConnectionData = z.infer<
  typeof internetConnectionSchema
>