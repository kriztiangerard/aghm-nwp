import { z } from 'zod'

export const projectBasicsSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Project or company name is required'),

  locations: z.enum(['one', 'multiple']),

  headcount: z
    .coerce
    .number()
    .min(1, 'There must be at least 1 user')
    .max(200, 'Maximum of 200 users'),
})

export type ProjectBasicsData = z.infer<typeof projectBasicsSchema>