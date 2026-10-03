import { z } from 'zod'

import { QUESTIONNAIRE_LIMITS } from '../lib/questionnaireLimits'

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
      `Number of floors must be at least ${QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.min}.`,
      'Number of floors must be a whole number.',
      QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.min,
      QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.max,
      `Number of floors must be ${QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.max} or fewer.`
    ),

    floorAreaPerFloor: z.preprocess(
      (value) =>
        value === undefined || value === null || value === ''
          ? undefined
          : value,
      z.union([
        z.coerce.number()
          .int('Approximate floor area per floor must be a whole number.')
          .min(QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.min, `Floor area must be at least ${QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.min}.`)
          .max(QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.max, `Approximate floor area per floor must be ${QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.max.toLocaleString()} sqm or less.`),
        z.undefined(),
      ])
    ),

    roomsPerFloor: requiredNumber(
      'Number of rooms/work areas per floor is required.',
      `Number of rooms/work areas per floor must be at least ${QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.min}.`,
      'Number of rooms/work areas per floor must be a whole number.',
      QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.min,
      QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.max,
      `Number of rooms/work areas per floor must be ${QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.max} or fewer.`
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
              `Room floor must be at least ${QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.floor.min}.`,
              'Room floor must be a whole number.',
              QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.floor.min,
              QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.max,
              `Room floor must be ${QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.max} or fewer.`
            ),

            capacity: requiredNumber(
              'Room capacity is required.',
              `Room capacity must be at least ${QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.min}.`,
              'Room capacity must be a whole number.',
              QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.min,
              QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.max,
              `Room capacity must be ${QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.max} or fewer.`
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
