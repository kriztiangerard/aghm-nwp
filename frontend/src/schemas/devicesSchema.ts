import { z } from 'zod'

export const devicesSchema = z.object({
  wiredDevices: z.coerce
    .number()
    .min(0, 'Number of wired devices cannot be negative'),

  wifiDevices: z.coerce
    .number()
    .min(0, 'Number of Wi-Fi devices cannot be negative'),

  voip: z.enum(['no', 'yes']),

  cameras: z.enum(['no', 'yes']),

  otherDevices: z.string().optional(),
})

export type DevicesData = z.infer<typeof devicesSchema>