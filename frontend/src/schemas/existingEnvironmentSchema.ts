import { z } from 'zod'

export const existingEnvironmentSchema = z.object({
  existingNetwork: z.object({
    equipmentStatus: z.enum([
      'none',
      'yes',
      'not_sure',
    ]),

    equipment: z
      .object({
        routerModem: z.boolean(),

        switches: z
          .object({
            quantity: z.enum([
              '1',
              '2-3',
              'more_than_3',
              'not_sure',
            ]),
          })
          .optional(),

        wifiAccessPoints: z
          .object({
            quantity: z.enum([
              '1',
              '2-3',
              'more_than_3',
              'not_sure',
            ]),
          })
          .optional(),

        cablingAlreadyRun: z.boolean(),

        otherOrUnknown: z.boolean(),
      })
      .optional(),

    existingCabling: z.enum([
      'none_or_not_sure',
      'cat5e_or_cat6',
      'fiber',
    ]),
  }),
})

export type ExistingEnvironmentData = z.infer<
  typeof existingEnvironmentSchema
>
