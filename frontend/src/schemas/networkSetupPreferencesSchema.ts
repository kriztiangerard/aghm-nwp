import { z } from 'zod'

export const networkSetupPreferencesSchema = z.object({
  preferences: z.object({
    guestWifi: z.boolean(),

    sensitiveData: z.enum([
      'no',
      'yes',
      'not_sure',
    ]),

    applications: z.object({
      videoConferencing: z.boolean().optional().default(false),

      voipCalls: z.boolean().optional().default(false),

      posPayment: z.boolean().optional().default(false),

      cloudStorage: z.boolean().optional().default(false),

      businessSoftware: z.boolean().optional().default(false),

      videoStreaming: z.boolean().optional().default(false),

      securityCameraViewing: z.boolean().optional().default(false),

      basicBrowsingEmail: z.boolean().optional().default(false),

      other: z.string().optional(),
    }),

    equipmentLocation: z.enum([
      'full_size_rack',
      'wall_cabinet',
      'not_sure',
    ]),

    managementPreference: z.enum([
      'dashboard',
      'command_line',
      'not_sure',
    ]),
  }),
})

export type NetworkSetupPreferencesData = z.infer<
  typeof networkSetupPreferencesSchema
>