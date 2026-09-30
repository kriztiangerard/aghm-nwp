import { z } from 'zod'

const requiredEnum = <T extends readonly [string, ...string[]]>(
  values: T,
  message: string
) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? '__MISSING__'
        : value,
    z
      .union([z.enum(values), z.literal('__MISSING__')])
      .refine((value) => value !== '__MISSING__', { message })
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

export const networkSetupPreferencesSchema = z.object({
  preferences: z.object({
    guestWifi: requiredBoolean('Guest Wi-Fi preference is required.'),

    sensitiveData: requiredEnum(
      ['no', 'yes', 'not_sure'],
      'Sensitive data handling preference is required.'
    ),

    applications: z.object({
      videoConferencing: z.boolean().optional().default(false),

      voipCalls: z.boolean().optional().default(false),

      posPayment: z.boolean().optional().default(false),

      cloudStorage: z.boolean().optional().default(false),

      businessSoftware: z.boolean().optional().default(false),

      videoStreaming: z.boolean().optional().default(false),

      securityCameraViewing: z.boolean().optional().default(false),

      basicBrowsingEmail: z.boolean().optional().default(false),

      otherEnabled: z.boolean().optional().default(false),

      other: z.string().optional(),
    }).superRefine((value, ctx) => {
      if (value.otherEnabled && (!value.other || value.other.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['other'],
          message: 'Other network usage is required.',
        })
      }
    }),

    equipmentLocation: requiredEnum(
      ['full_size_rack', 'wall_cabinet', 'not_sure'],
      'Equipment location is required.'
    ),

    managementPreference: requiredEnum(
      ['dashboard', 'command_line', 'not_sure'],
      'Management preference is required.'
    ),
  }),
})

export type NetworkSetupPreferencesData = z.infer<
  typeof networkSetupPreferencesSchema
>