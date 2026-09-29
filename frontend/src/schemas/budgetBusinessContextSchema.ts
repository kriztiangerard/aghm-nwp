import { z } from 'zod'

const growthSchema = z.object({
  headcountGrowth: z.enum([
    '0_10',
    '11_30',
    '31_plus',
  ]),

  newSites: z.enum([
    'none',
    'one',
    'two_or_more',
  ]),
})

export const budgetBusinessContextSchema = z.object({
  businessContext: z
    .object({
      monthlyITBudget: z.enum([
        'under_15000',
        '15000_40000',
        'over_40000',
      ]),

      ITSupport: z.enum([
        'none',
        'external',
        'in_house',
      ]),

      electricityReliability: z.enum([
        'stable',
        'frequent_outages',
      ]),

      expectedGrowth: z.boolean(),

      growth: growthSchema.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.expectedGrowth && !value.growth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['growth'],
          message: 'Required when business growth is expected',
        })
      }

      if (value.growth && !value.growth.headcountGrowth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['growth', 'headcountGrowth'],
          message: 'Required when business growth is expected',
        })
      }

      if (value.growth && !value.growth.newSites) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['growth', 'newSites'],
          message: 'Required when business growth is expected',
        })
      }
    }),
})

export type BudgetBusinessContextData = z.infer<
  typeof budgetBusinessContextSchema
>
