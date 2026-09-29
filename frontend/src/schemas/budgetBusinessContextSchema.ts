import { z } from 'zod'

export const budgetBusinessContextSchema = z.object({
  businessContext: z.object({
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

    growth: z
      .object({
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
      .optional(),
  }),
})

export type BudgetBusinessContextData = z.infer<
  typeof budgetBusinessContextSchema
>
