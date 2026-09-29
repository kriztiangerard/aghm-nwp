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
      videoConferencing: z.boolean(),

      voipCalls: z.boolean(),

      posPayment: z.boolean(),

      cloudStorage: z.boolean(),

      businessSoftware: z.boolean(),

      videoStreaming: z.boolean(),

      securityCameraViewing: z.boolean(),

      basicBrowsingEmail: z.boolean(),

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