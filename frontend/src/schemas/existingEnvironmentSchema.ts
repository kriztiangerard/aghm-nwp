import { z } from 'zod'

const requiredEnum = <T extends [string, ...string[]]>(
  values: T,
  message: string
) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? undefined
        : value,
    z.enum(values, {
      message,
    })
  )

export const existingEnvironmentObjectSchema = z.object({
    existingNetwork: z.object({
      equipmentStatus: requiredEnum(
        ['none', 'yes', 'not_sure'],
        'Existing network equipment status is required.'
      ),

      equipment: z
        .object({
          routerModem: z.boolean().optional().default(false),

          switches: z
            .object({
              quantity: z.enum(
                ['1', '2-3', 'more_than_3', 'not_sure'] as const,
              ).optional(),
})
            .optional(),

          wifiAccessPoints: z
            .object({
              quantity: z.enum(
                ['1', '2-3', 'more_than_3', 'not_sure'] as const,
              ).optional(),
            })
            .optional(),

          cablingAlreadyRun: z.boolean().optional().default(false),

          otherOrUnknown: z.boolean().optional().default(false),
        })
        .optional(),

      existingCabling: requiredEnum(
        ['none_or_not_sure', 'cat5e_or_cat6', 'fiber'],
        'Existing cabling type is required.'
      ).optional(),
    }),
  })

export const refineExistingEnvironment = (
  value: z.infer<typeof existingEnvironmentObjectSchema>,
  ctx: z.RefinementCtx
) => {
  if (value.existingNetwork.equipmentStatus !== 'yes') {
    return
  }

  const equipment = value.existingNetwork.equipment

  if (!equipment) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['existingNetwork', 'equipment'],
      message: 'Existing network equipment details are required when equipment is present on site.',
    })
    return
  }

  if (equipment.switches && equipment.switches.quantity === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['existingNetwork', 'equipment', 'switches', 'quantity'],
      message: 'Switch quantity is required.',
    })
  }

  if (
    equipment.wifiAccessPoints &&
    equipment.wifiAccessPoints.quantity === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['existingNetwork', 'equipment', 'wifiAccessPoints', 'quantity'],
      message: 'Wi-Fi access point quantity is required.',
    })
  }

  if (value.existingNetwork.existingCabling === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['existingNetwork', 'existingCabling'],
      message: 'Existing cabling type is required.',
    })
  }
}

export const existingEnvironmentSchema =
  existingEnvironmentObjectSchema.superRefine(refineExistingEnvironment)

export type ExistingEnvironmentData = z.infer<
  typeof existingEnvironmentSchema
>
