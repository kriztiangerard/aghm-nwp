import { z } from 'zod'

export const budgetBusinessContextSchema = z.object({
  budget: z.enum([
    'under-15k',
    '15k-40k',
    'over-40k',
  ]),

  itSupport: z.enum([
    'none',
    'outside',
    'in-house',
  ]),

  electricity: z.enum([
    'stable',
    'outages',
  ]),

  growth: z.enum([
    'no',
    'yes',
  ]),

  growthRate: z.enum([
    '0-10',
    '11-30',
    '31-plus',
  ]),

  additionalSites: z.enum([
    'none',
    'one',
    'two-plus',
  ]),

  management: z.enum([
    'simple',
    'technical',
    'not-sure',
  ]),
})

export type BudgetBusinessContextData = z.infer<
  typeof budgetBusinessContextSchema
>