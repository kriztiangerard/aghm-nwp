import { z } from 'zod'

export const networkSetupPreferencesSchema = z.object({
  guestWifi: z.enum(['no', 'yes']),

  sensitiveData: z.enum(['no', 'yes', 'not-sure']),

  usage: z.array(
    z.enum([
      'video-conferencing',
      'voip',
      'pos',
      'cloud',
      'erp',
      'streaming',
      'security',
      'basic',
    ])
  ),

  equipmentHousing: z.enum([
    'rack',
    'wall-cabinet',
    'not-sure',
  ]),
})

export type NetworkSetupPreferencesData = z.infer<
  typeof networkSetupPreferencesSchema
>