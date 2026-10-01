import { mapFormToNetworkConfiguration } from '../../lib/network-config-mapper'
import { useState } from 'react'
import {
  FormProvider,
  useForm,
  useFormContext,
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
import { getSummarySections, SECTION_TITLES } from '../../lib/summary'

const sectionSteps = [
  ProjectBasics,
  PhysicalSpace,
  ExistingEnvironment,
  InternetConnection,
  Devices,
  NetworkSetupPreferences,
  BudgetBusinessContext,
] as const

const sectionKeys = Object.keys(SECTION_TITLES) as Array<keyof typeof SECTION_TITLES>

const OverallSummary = () => {
  const { watch } = useFormContext()
  const formData = watch()
  const sections = getSummarySections(formData)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Overall Network Planning Summary</h2>
        <p className="text-sm text-muted-foreground">
          Review the answers from every section before continuing.
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
          Your answers will appear here
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
              <dl className="space-y-3">
                {section.items.map((item) => (
                  <div key={`${section.title}-${item.label}`} className="space-y-1 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
                    <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd>
                      {Array.isArray(item.value) ? (
                        <div className="flex flex-wrap gap-2">
                          {item.value.map((valueItem) => (
                            <span
                              key={`${item.label}-${valueItem}`}
                              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
                            >
                              {valueItem}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-foreground">{item.value}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

const steps = [...sectionSteps, OverallSummary]

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
  const currentSectionKey = currentStep < sectionKeys.length ? sectionKeys[currentStep] : undefined
  const totalSteps = steps.length

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
      form.getValues(
        'physicalSpace.largeGroupRooms.hasLargeGroupRooms' as FormField,
      ) === true
    ) {
      currentFields.push(
        'physicalSpace.largeGroupRooms.rooms' as FormField,
      )
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

    const payload = mapFormToNetworkConfiguration(data)

    console.log('Network payload:', payload)

    try {
      const response = await fetch(`${apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
          <SummaryPanel sectionKey={currentSectionKey} />

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
                      ((currentStep + 1) / totalSteps) * 100
                    }
                    aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
                  />

                  <p className="text-sm text-muted-foreground">
                    Step {currentStep + 1} of {totalSteps}
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

                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Please confirm exact quantities and placements with a qualified installer before purchasing.
                  </div>

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

                {currentStep < totalSteps - 1 ? (
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