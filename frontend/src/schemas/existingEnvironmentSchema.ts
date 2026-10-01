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

const requiredBoolean = (message: string) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? '__MISSING__'
        : value,
    z
      .union([z.boolean(), z.literal('__MISSING__')])
      .refine((value) => value !== '__MISSING__', { message })
  )

export const existingEnvironmentSchema = z.object({
  existingNetwork: z.object({
    equipmentStatus: requiredEnum(['none', 'yes', 'not_sure'], 'Existing network equipment status is required.'),

    equipment: z
      .object({
        routerModem: requiredBoolean('Router or modem status is required.'),

        switches: z
          .object({
            quantity: requiredEnum(
              ['1', '2-3', 'more_than_3', 'not_sure'],
              'Switch quantity is required.'
            ),
          })
          .optional(),

        wifiAccessPoints: z
          .object({
            quantity: requiredEnum(
              ['1', '2-3', 'more_than_3', 'not_sure'],
              'Wi-Fi access point quantity is required.'
            ),
          })
          .optional(),

        cablingAlreadyRun: requiredBoolean('Cabling status is required.'),

        otherOrUnknown: requiredBoolean(
          'Other or unknown network status is required.'
        ),
      })
      .optional(),

    existingCabling: requiredEnum(
      ['none_or_not_sure', 'cat5e_or_cat6', 'fiber'],
      'Existing cabling type is required.'
    ),
  }),
})

export type ExistingEnvironmentData = z.infer<
  typeof existingEnvironmentSchema
>
