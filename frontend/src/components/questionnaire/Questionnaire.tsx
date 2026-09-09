import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import ProjectBasics from './ProjectBasics'
import PhysicalSpace from './PhysicalSpace'
import ExistingEnvironment from './ExistingEnvironment'
import InternetConnection from './InternetConnection'
import Devices from './Devices'
import NetworkSetupPreferences from './NetworkSetupPreferences'
import BudgetBusinessContext from './BudgetBusinessContext'

import { questionnaireSchema } from '../../schemas/questionnaireSchema'

const steps = [
  ProjectBasics,
  PhysicalSpace,
  ExistingEnvironment,
  InternetConnection,
  Devices,
  NetworkSetupPreferences,
  BudgetBusinessContext,
]

const fullSchema = questionnaireSchema

type FormInput = z.input<typeof fullSchema>
type FormOutput = z.output<typeof fullSchema>

type FormField = keyof FormInput

function Questionnaire() {
  const [currentStep, setCurrentStep] = useState(0)

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(fullSchema),
    mode: 'onSubmit',
  })

  const CurrentSection = steps[currentStep]

  const handleNext = async () => {
    const fieldsByStep: FormField[][] = [
      [
        'companyName',
        'locations',
        'headcount',
      ],

      [
        'floors',
        'floorArea',
        'rooms',
        'largeRooms',
      ],

      [
        'existingEquipment',
        'equipment',
        'cabling',
      ],

      [
        'internetSpeed',
        'connectionType',
        'downtime',
      ],

      [
        'wiredDevices',
        'wifiDevices',
        'voip',
        'cameras',
        'otherDevices',
      ],

      [
        'guestWifi',
        'sensitiveData',
        'usage',
        'equipmentHousing',
      ],

      [
        'budget',
        'itSupport',
        'electricity',
        'growth',
        'growthRate',
        'additionalSites',
        'management',
      ],
    ]

    const currentFields = fieldsByStep[currentStep]

    if (currentFields) {
      const isValid = await form.trigger(currentFields)

      if (!isValid) {
        return
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((step) => step + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
    }
  }

  return (
    <FormProvider {...form}>
      <form>
        <CurrentSection />

        <div>
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
          >
            Next
          </button>
        </div>

        <p>
          Step {currentStep + 1} of {steps.length}
        </p>
      </form>
    </FormProvider>
  )
}

export default Questionnaire