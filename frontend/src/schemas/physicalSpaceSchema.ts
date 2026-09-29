import { z } from 'zod'

export const physicalSpaceSchema = z.object({
  physicalSpace: z.object({
    numberOfFloors: z
      .coerce
      .number()
      .min(1, 'There must be at least 1 floor'),

    floorAreaPerFloor: z.preprocess(
      (value) =>
        value === '' || Number.isNaN(value)
          ? undefined
          : value,
      z.coerce
        .number()
        .min(1, 'Floor area must be greater than 0')
        .optional()
    ),

    roomsPerFloor: z
      .coerce
      .number()
      .min(1, 'There must be at least 1 room/work area'),

    largeGroupRooms: z.object({
      hasLargeGroupRooms: z.boolean(),

      rooms: z
        .array(
          z.object({
            floor: z.coerce
              .number()
              .min(1, 'Floor must be at least 1'),

            capacity: z.coerce
              .number()
              .min(1, 'Room capacity must be at least 1'),
          })
        )
        .optional(),
    }),
  }),
})

export type PhysicalSpaceData = z.infer<
  typeof physicalSpaceSchema
>
