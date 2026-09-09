import { z } from 'zod'

export const physicalSpaceSchema = z.object({
  floors: z
    .coerce
    .number()
    .min(1, 'There must be at least 1 floor'),

  floorArea: z.preprocess(
    (value) =>
      value === '' || Number.isNaN(value)
        ? undefined
        : value,
    z.coerce
      .number()
      .min(1, 'Floor area must be greater than 0')
      .optional()
  ),

  rooms: z
    .coerce
    .number()
    .min(1, 'There must be at least 1 room/work area'),

  largeRooms: z.enum(['no', 'yes']),
})

export type PhysicalSpaceData = z.infer<typeof physicalSpaceSchema>