import { useState } from 'react'
import {
  FormProvider,
  useForm,
  type FieldPath,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// shadcn components
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

import ProjectBasics from './ProjectBasics'
import PhysicalSpace from './PhysicalSpace'
import ExistingEnvironment from './ExistingEnvironment'
import InternetConnection from './InternetConnection'
import Devices from './Devices'
import NetworkSetupPreferences from './NetworkSetupPreferences'
import BudgetBusinessContext from './BudgetBusinessContext'
import SummaryPanel from './SummaryPanel'

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
type FormField = FieldPath<FormInput>

function Questionnaire() {
  const [currentStep, setCurrentStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(fullSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldUnregister: false,

    defaultValues: {
      preferences: {
        applications: {
          videoConferencing: false,
          voipCalls: false,
          posPayment: false,
          cloudStorage: false,
          businessSoftware: false,
          videoStreaming: false,
          securityCameraViewing: false,
          basicBrowsingEmail: false,
          otherEnabled: false,
          other: '',
        },
      },

      businessContext: {
        expectedGrowth: false,
      },
    },
  })

  const { isSubmitting } = form.formState
  const CurrentSection = steps[currentStep]

  /*
   * Paths aligned strictly with schema key locations:
   * Step 1 uses `project.*` namespace.
   */
  const fieldsByStep: FormField[][] = [
    // Step 1 - Project Basics
    [
      'project.name' as FormField,
      'project.numberOfSites' as FormField,
      'project.siteRelationship' as FormField,
      'project.totalUsers' as FormField,
    ],

    // Step 2 - Physical Space
    [
      'physicalSpace.numberOfFloors' as FormField,
      'physicalSpace.floorAreaPerFloor' as FormField,
      'physicalSpace.roomsPerFloor' as FormField,
      'physicalSpace.largeGroupRooms.hasLargeGroupRooms' as FormField,
    ],

    // Step 3 - Existing Environment
    ['existingNetwork' as FormField],

    // Step 4 - Internet Connection
    ['internet' as FormField],

    // Step 5 - Devices
    ['devices' as FormField],

    // Step 6 - Network Setup Preferences
    ['preferences' as FormField],

    // Step 7 - Budget / Business Context
    ['businessContext' as FormField],
  ]

  const handleNext = async () => {
    setSubmitError(null)
    form.clearErrors()

    const currentFields = [...fieldsByStep[currentStep]]

    // Dynamically validate details array only if large rooms are selected in Step 2
    if (
      currentStep === 1 &&
      form.getValues('physicalSpace.largeGroupRooms.hasLargeGroupRooms' as FormField) === true
    ) {
      currentFields.push('physicalSpace.largeGroupRooms.rooms' as FormField)
    }

    const isValid = await form.trigger(currentFields, {
      shouldFocus: true,
    })

    if (!isValid) {
      return
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((step) => step + 1)
    }
  }

  const handleBack = () => {
    setSubmitError(null)
    form.clearErrors()

    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
    }
  }

  const onSubmit = async (data: FormOutput) => {
    setSubmitError(null)

    const apiUrl = import.meta.env.VITE_API_URL?.trim()

    if (!apiUrl) {
      const missingApiMessage =
        'No API endpoint is configured yet. Add VITE_API_URL in your environment to submit the questionnaire.'

      console.warn(
        'VITE_API_URL is not configured. Submission is using placeholder mode.',
        data,
      )

      setSubmitError(missingApiMessage)
      return
    }

    try {
      const response = await fetch(`${apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(
          `Submission failed with status ${response.status}`,
        )
      }

      const result = await response.json()

      console.log(
        'Recommendation result:',
        result,
      )
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred.'

      setSubmitError(errorMessage)
    }
  }

  return (
    <FormProvider {...form}>
      <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.4fr)] lg:gap-12">

          <SummaryPanel />

          <Card className="flex flex-col overflow-hidden lg:h-[calc(100dvh-6rem)] lg:min-h-[36rem]">

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex min-h-0 flex-1 flex-col lg:h-full"
              aria-labelledby="questionnaire-title"
            >

              <CardHeader className="shrink-0">
                <h1
                  id="questionnaire-title"
                  className="text-2xl font-bold tracking-tight"
                >
                  Tell us more about your project.
                </h1>

                <div className="space-y-2 pt-2">
                  <Progress
                    value={
                      ((currentStep + 1) / steps.length) * 100
                    }
                    aria-label={`Step ${currentStep + 1} of ${steps.length}`}
                  />

                  <p className="text-sm text-muted-foreground">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
              </CardHeader>

              <Separator />

              <ScrollArea className="min-h-0 lg:h-0 lg:flex-1">
                <CardContent className="space-y-6 pt-6">

                  {submitError && (
                    <div
                      role="alert"
                      className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
                    >
                      {submitError}
                    </div>
                  )}

                  <CurrentSection />

                </CardContent>
              </ScrollArea>

              <Separator />

              <CardContent className="flex shrink-0 justify-between py-4">

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={
                    currentStep === 0 ||
                    isSubmitting
                  }
                >
                  Back
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Submitting...'
                      : 'Submit'}
                  </Button>
                )}

              </CardContent>
            </form>

          </Card>
        </div>
      </main>
    </FormProvider>
  )
}

export default Questionnaire