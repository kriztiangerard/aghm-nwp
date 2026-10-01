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

const requiredNumber = (
  message: string,
  minMessage: string,
  intMessage: string,
  minimum = 1
) =>
  z.preprocess(
    (value) =>
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'number' && Number.isNaN(value))
        ? '__MISSING__'
        : value,
    z
      .union([z.coerce.number(), z.literal('__MISSING__')])
      .refine((value) => value !== '__MISSING__', { message })
      .refine((value) => !Number.isNaN(value), { message })
      .refine((value) => Number.isInteger(value), { message: intMessage })
      .refine((value) => value >= minimum, { message: minMessage })
  )

export const internetConnectionSchema = z.object({
  internet: z.object({
    currentSpeedMbps: requiredNumber(
      'Current internet speed is required.',
      'Current internet speed must be at least 1 Mbps.',
      'Current internet speed must be a whole number.'
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
