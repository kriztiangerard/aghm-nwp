import { z } from 'zod'

const requiredNumber = (
  message: string,
  minMessage: string,
  intMessage: string,
  minimum = 0,
  maximum?: number,
  maxMessage?: string
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
      .refine((value) => maximum === undefined || value <= maximum, {
        message: maxMessage ?? `Value must be at most ${maximum}.`,
      })
  )

const requiredBoolean = (message: string) =>
  z.preprocess(
    (value) =>
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'number' && Number.isNaN(value))
        ? '__MISSING__'
        : value,
    z
      .union([z.boolean(), z.literal('__MISSING__')])
      .refine((value) => value !== '__MISSING__', { message })
  )

const requiredOptionalCount = (
  requiredMessage: string,
  minMessage: string,
  intMessage: string,
  minimum = 0
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
      .refine((value) => value !== '__MISSING__', { message: requiredMessage })
      .refine((value) => !Number.isNaN(value), { message: requiredMessage })
      .refine((value) => Number.isInteger(value), { message: intMessage })
      .refine((value) => value >= minimum, { message: minMessage })
  )

export const devicesSchema = z.object({
  devices: z.object({
    wiredComputers: requiredNumber(
      'Wired computer count is required.',
      'Wired computer count cannot be negative.',
      'Wired computer count must be a whole number.',
      0,
      1500,
      'Wired computer count must be 1,500 or fewer.'
    ),

    wifiDevices: requiredNumber(
      'Wireless device count is required.',
      'Wireless device count cannot be negative.',
      'Wireless device count must be a whole number.',
      0,
      2500,
      'Wireless device count must be 2,500 or fewer.'
    ),

    voip: z.object({
      enabled: requiredBoolean(
        'Voice over internet protocol phone usage is required.'
      ),

      phoneCount: requiredOptionalCount(
        'Voice over internet protocol phone count is required.',
        'Voice over internet protocol phone count cannot be negative.',
        'Voice over internet protocol phone count must be a whole number.'
      )
        .refine((value) => value === undefined || value <= 500, {
          message: 'Voice over internet protocol phone count must be 500 or fewer.',
        })
        .optional(),
    }).superRefine((value, ctx) => {
      if (
        value.enabled &&
        (value.phoneCount === undefined || Number.isNaN(value.phoneCount))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['phoneCount'],
          message: 'Voice over internet protocol phone count is required.',
        })
      }
    }),

    ipCameras: z.object({
      enabled: requiredBoolean(
        'Internet protocol camera usage is required.'
      ),

      cameraCount: requiredOptionalCount(
        'Internet protocol camera count is required.',
        'Internet protocol camera count cannot be negative.',
        'Internet protocol camera count must be a whole number.'
      )
        .refine((value) => value === undefined || value <= 500, {
          message: 'Internet protocol camera count must be 500 or fewer.',
        })
        .optional(),
    }).superRefine((value, ctx) => {
      if (
        value.enabled &&
        (value.cameraCount === undefined || Number.isNaN(value.cameraCount))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cameraCount'],
          message: 'Internet protocol camera count is required.',
        })
      }
    }),

    otherNetworkDevices: z.object({
      enabled: requiredBoolean(
        'Other network-connected devices usage is required.'
      ),

      description: z.string().optional(),
    }).superRefine((value, ctx) => {
      if (value.enabled && (!value.description || value.description.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['description'],
          message: 'Other network-connected device description is required.',
        })
      }
    }),
  }),
})

export type DevicesData = z.infer<typeof devicesSchema>
