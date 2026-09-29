import { z } from 'zod'

export const devicesSchema = z.object({
  devices: z.object({
    wiredComputers: z.coerce
      .number()
      .min(0, 'Number of wired computers cannot be negative'),

    wifiDevices: z.coerce
      .number()
      .min(0, 'Number of Wi-Fi devices cannot be negative'),

    voip: z.object({
      enabled: z.boolean(),

      phoneCount: z.coerce
        .number()
        .min(0, 'Number of VoIP phones cannot be negative')
        .optional(),
    }),

    ipCameras: z.object({
      enabled: z.boolean(),

      cameraCount: z.coerce
        .number()
        .min(0, 'Number of IP cameras cannot be negative')
        .optional(),
    }),

    otherNetworkDevices: z.object({
      enabled: z.boolean(),

      description: z.string().optional(),
    }),
  }),
})

export type DevicesData = z.infer<typeof devicesSchema>
