import { z } from 'zod'

const requiredEnum = <const T extends readonly [string, ...string[]]>(
  values: T,
  message: string
): z.ZodType<T[number]> =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? undefined
        : value,
    z.enum(values, {
      error: message,
    })
  )

const requiredBoolean = (message: string) =>
  z.preprocess(
    (value) =>
      value === undefined || value === null || value === ''
        ? '__MISSING__'
        : value,
    z
      .union([z.boolean(), z.literal('__MISSING__')])
      .refine((value) => value !== '__MISSING__', { message })
  )

const growthSchema = z.object({
  headcountGrowth: requiredEnum(
    ['0_10', '11_30', '31_plus'],
    'Headcount growth is required.'
  ),

  newSites: requiredEnum(
    ['none', 'one', 'two_or_more'],
    'New site count is required.'
  ),
})

export const budgetBusinessContextSchema = z.object({
  businessContext: z
    .object({
      monthlyITBudget: requiredEnum(
        ['under_15000', '15000_40000', 'over_40000'],
        'Monthly IT budget is required.'
      ),

      ITSupport: requiredEnum(
        ['none', 'external', 'in_house'],
        'IT support model is required.'
      ),

      electricityReliability: requiredEnum(
        ['stable', 'frequent_outages'],
        'Electricity reliability is required.'
      ),

      expectedGrowth: requiredBoolean(
        'Expected business growth is required.'
      ),

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
