import { z } from 'zod'

export const existingEnvironmentSchema = z.object({
  existingEquipment: z.enum(['no', 'yes', 'not-sure']),

  equipment: z.enum([
    'router',
    'switch',
    'access-point',
    'cabling',
    'not-sure',
  ]),

  cabling: z.enum([
    'none',
    'cat5e',
    'cat6',
    'fiber',
    'not-sure',
  ]),
})

export type ExistingEnvironmentData = z.infer<
  typeof existingEnvironmentSchema
>