import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

//shadcn components
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"


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
    shouldUnregister: false,
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

  const onSubmit = (data: FormOutput) => {
  // send `data` to your Engine/BOM Lambda here, e.g.:
  // fetch('/api/generate', { method: 'POST', body: JSON.stringify(data) })
  console.log(data)
}

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <h1>Tell us more about your project.</h1>
        <div className="space-y-2">
          <Progress value={((currentStep + 1) / steps.length) * 100} />
          <p className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        <div className="space-y-6">
          <CurrentSection />
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            Back
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button type="submit">
              Submit
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  )
}

export default Questionnaire