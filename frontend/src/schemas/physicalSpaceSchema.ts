import { z } from 'zod'

const requiredNumber = (
  message: string,
  minMessage: string,
  intMessage: string,
  minimum = 1,
  maximum?: number,
  maxMessage?: string
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
      .refine((value) => maximum === undefined || value <= maximum, {
        message: maxMessage ?? `Value must be at most ${maximum}.`,
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

export const physicalSpaceSchema = z.object({
  physicalSpace: z.object({
    numberOfFloors: requiredNumber(
      'Number of floors is required.',
      'Number of floors must be at least 1.',
      'Number of floors must be a whole number.',
      1,
      20,
      'Number of floors must be 20 or fewer.'
    ),

    floorAreaPerFloor: z.preprocess(
      (value) =>
        value === undefined || value === null || value === ''
          ? undefined
          : value,
      z.union([
        z.coerce.number()
          .int('Approximate floor area per floor must be a whole number.')
          .min(1, 'Floor area must be greater than 0.')
          .max(5000, 'Approximate floor area per floor must be 5,000 sqm or less.'),
        z.undefined(),
      ])
    ),

    roomsPerFloor: requiredNumber(
      'Number of rooms/work areas per floor is required.',
      'Number of rooms/work areas per floor must be at least 1.',
      'Number of rooms/work areas per floor must be a whole number.',
      1,
      100,
      'Number of rooms/work areas per floor must be 100 or fewer.'
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
