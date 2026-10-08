import { z } from 'zod'

import { projectBasicsSchema } from './projectBasicsSchema'
import { physicalSpaceSchema } from './physicalSpaceSchema'
import {
  existingEnvironmentObjectSchema,
  refineExistingEnvironment,
} from './existingEnvironmentSchema'
import { internetConnectionSchema } from './internetConnectionSchema'
import { devicesSchema } from './devicesSchema'
import { networkSetupPreferencesSchema } from './networkSetupPreferencesSchema'
import { budgetBusinessContextSchema } from './budgetBusinessContextSchema'

export const questionnaireSchema = projectBasicsSchema
  .extend(physicalSpaceSchema.shape)
  .extend(existingEnvironmentObjectSchema.shape)
  .extend(internetConnectionSchema.shape)
  .extend(devicesSchema.shape)
  .extend(networkSetupPreferencesSchema.shape)
  .extend(budgetBusinessContextSchema.shape)
  .superRefine(refineExistingEnvironment)

export type QuestionnaireData = z.infer<typeof questionnaireSchema>
