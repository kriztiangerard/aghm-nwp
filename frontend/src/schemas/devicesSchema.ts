import { z } from 'zod'

export const devicesSchema = z.object({
  devices: z.object({
    wiredComputers: z.coerce
      .number()
      .min(0, 'Wired computer count cannot be negative'),

    wifiDevices: z.coerce
      .number()
      .min(0, 'Wi-Fi device count cannot be negative'),

    voip: z.object({
      enabled: z.boolean(),

      phoneCount: z.coerce
        .number()
        .min(0, 'Voice over internet protocol phone count cannot be negative')
        .optional(),
    }),

    ipCameras: z.object({
      enabled: z.boolean(),

      cameraCount: z.coerce
        .number()
        .min(0, 'Internet protocol camera count cannot be negative')
        .optional(),
    }),

    otherNetworkDevices: z.object({
      enabled: z.boolean(),

      description: z.string().optional(),
    }),
  }),
})

export type DevicesData = z.infer<typeof devicesSchema>
