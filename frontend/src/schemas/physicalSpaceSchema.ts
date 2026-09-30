import { z } from 'zod'

const requiredNumber = (
  message: string,
  minMessage: string,
  intMessage: string,
  minimum = 1
) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? '__MISSING__'
        : value,
    z
      .union([z.coerce.number(), z.literal('__MISSING__')])
      .refine((value) => value !== '__MISSING__', { message })
      .refine((value) => !Number.isNaN(value), { message })
      .refine((value) => Number.isInteger(value), { message: intMessage })
      .refine((value) => value >= minimum, { message: minMessage })
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

export const physicalSpaceSchema = z.object({
  physicalSpace: z.object({
    numberOfFloors: requiredNumber(
      'Number of floors is required.',
      'Number of floors must be at least 1.',
      'Number of floors must be a whole number.'
    ),

    floorAreaPerFloor: requiredNumber(
      'Approximate floor area per floor is required.',
      'Floor area must be greater than 0.',
      'Approximate floor area per floor must be a whole number.'
    ),

    roomsPerFloor: requiredNumber(
      'Number of rooms/work areas per floor is required.',
      'Number of rooms/work areas per floor must be at least 1.',
      'Number of rooms/work areas per floor must be a whole number.'
    ),

    largeGroupRooms: z.object({
      hasLargeGroupRooms: requiredBoolean(
        'Large-group room answer is required.'
      ),

      rooms: z
        .array(
          z.object({
            floor: requiredNumber(
              'Room floor is required.',
              'Room floor must be at least 1.',
              'Room floor must be a whole number.'
            ),

            capacity: requiredNumber(
              'Room capacity is required.',
              'Room capacity must be at least 1.',
              'Room capacity must be a whole number.'
            ),
          })
        )
        .optional(),
    }),
  }),
})

export type PhysicalSpaceData = z.infer<
  typeof physicalSpaceSchema
>
