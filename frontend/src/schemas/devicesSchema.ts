import { z } from 'zod'

import { QUESTIONNAIRE_LIMITS } from '../lib/questionnaireLimits'

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
      `Wired computer count must be at least ${QUESTIONNAIRE_LIMITS.devices.wiredComputers.min}.`,
      'Wired computer count must be a whole number.',
      QUESTIONNAIRE_LIMITS.devices.wiredComputers.min,
      QUESTIONNAIRE_LIMITS.devices.wiredComputers.max,
      `Wired computer count must be ${QUESTIONNAIRE_LIMITS.devices.wiredComputers.max.toLocaleString()} or fewer.`
    ),

    wifiDevices: requiredNumber(
      'Wireless device count is required.',
      `Wireless device count must be at least ${QUESTIONNAIRE_LIMITS.devices.wifiDevices.min}.`,
      'Wireless device count must be a whole number.',
      QUESTIONNAIRE_LIMITS.devices.wifiDevices.min,
      QUESTIONNAIRE_LIMITS.devices.wifiDevices.max,
      `Wireless device count must be ${QUESTIONNAIRE_LIMITS.devices.wifiDevices.max.toLocaleString()} or fewer.`
    ),

    voip: z.object({
      enabled: requiredBoolean(
        'Voice over internet protocol phone usage is required.'
      ),

      phoneCount: requiredOptionalCount(
        'Voice over internet protocol phone count is required.',
        `Voice over internet protocol phone count must be at least ${QUESTIONNAIRE_LIMITS.devices.voipPhoneCount.min}.`,
        'Voice over internet protocol phone count must be a whole number.'
      )
        .refine((value) => value === undefined || value <= QUESTIONNAIRE_LIMITS.devices.voipPhoneCount.max, {
          message: `Voice over internet protocol phone count must be ${QUESTIONNAIRE_LIMITS.devices.voipPhoneCount.max} or fewer.`,
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
        `Internet protocol camera count must be at least ${QUESTIONNAIRE_LIMITS.devices.ipCameraCount.min}.`,
        'Internet protocol camera count must be a whole number.'
      )
        .refine((value) => value === undefined || value <= QUESTIONNAIRE_LIMITS.devices.ipCameraCount.max, {
          message: `Internet protocol camera count must be ${QUESTIONNAIRE_LIMITS.devices.ipCameraCount.max} or fewer.`,
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
