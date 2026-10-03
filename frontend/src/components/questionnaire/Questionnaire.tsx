import { mapFormToNetworkConfiguration } from '../../lib/network-config-mapper'
import { closeOpenSelectPortals } from '../../lib/closeOpenSelectPortals'
import { useEffect, useRef, useState } from 'react'
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
import OverallSummary from './OverallSummary'
import SummaryPanel from './SummaryPanel'

import { questionnaireSchema } from '../../schemas/questionnaireSchema'
import { SECTION_TITLES } from '../../lib/summary'

const sectionSteps = [
  ProjectBasics,
  PhysicalSpace,
  ExistingEnvironment,
  InternetConnection,
  Devices,
  NetworkSetupPreferences,
  BudgetBusinessContext,
  OverallSummary,
] as const

const sectionKeys = Object.keys(SECTION_TITLES) as Array<keyof typeof SECTION_TITLES>

const steps = [...sectionSteps]

const fullSchema = questionnaireSchema

type FormInput = z.input<typeof fullSchema>
type FormOutput = z.output<typeof fullSchema>
type FormField = FieldPath<FormInput>

function Questionnaire() {
  const [currentStep, setCurrentStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const sectionHeadingRef = useRef<HTMLHeadingElement>(null)
  const isInitialRender = useRef(true)

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

      businessContext: {},
    },
  })

  const { isSubmitting } = form.formState
  const CurrentSection = steps[currentStep]
  const currentSectionKey = currentStep < sectionKeys.length ? sectionKeys[currentStep] : undefined
  const totalSteps = steps.length

  useEffect(() => {
    if (typeof document !== 'undefined') {
      closeOpenSelectPortals(document)
      const active = document.activeElement
      if (active instanceof HTMLElement) {
        active.blur()
      }
    }

    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    sectionHeadingRef.current?.focus()
  }, [currentStep])

  const showSummaryPanel = currentStep < totalSteps - 1
  const mainGridClass = showSummaryPanel
    ? 'lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.4fr)] lg:gap-12'
    : 'lg:grid-cols-1 lg:justify-center'

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
    closeOpenSelectPortals(typeof document !== 'undefined' ? document : null)
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
    closeOpenSelectPortals(typeof document !== 'undefined' ? document : null)
    setSubmitError(null)
    form.clearErrors()

    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
    }
  }

  const onSubmit = async (data: FormOutput) => {
    closeOpenSelectPortals(typeof document !== 'undefined' ? document : null)
    setSubmitError(null)

    const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
    const apiUrl = configuredApiUrl || 'http://localhost:8000'

    if (!configuredApiUrl) {
      console.warn(
        '[Questionnaire] VITE_API_URL is not configured. Falling back to http://localhost:8000 for local development.',
        { data },
      )
    }

    const payload = mapFormToNetworkConfiguration(data)
    const requestUrl = `${apiUrl.replace(/\/$/, '')}/generate`

    console.log('[Questionnaire] Using API URL:', requestUrl)

    console.log('[Questionnaire] Network payload:', payload)
    console.log('[Questionnaire] API URL:', requestUrl)
    console.log('[Questionnaire] API request:', {
      method: 'POST',
      url: requestUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      payload,
    })

    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text()
      let responseBody: unknown = responseText

      try {
        responseBody = JSON.parse(responseText)
      } catch {
        // Response body is not JSON; keep the plain text for debugging.
      }

      console.log('[Questionnaire] API response:', {
        status: response.status,
        statusText: response.statusText,
        url: requestUrl,
        body: responseBody,
      })

      if (!response.ok) {
        console.error('[Questionnaire] API request failed')
        console.error('[Questionnaire] Error:', new Error(`HTTP ${response.status}: ${response.statusText}`))
        console.error('[Questionnaire] API URL:', requestUrl)
        setSubmitError('Unable to submit your questionnaire. Please check your connection and try again.')
        return
      }

      console.log('[Questionnaire] Request succeeded')
      console.log('Recommendation result:', responseBody)
    } catch (error) {
      const fetchError = error instanceof Error ? error : new Error('Unknown fetch error')

      console.error('[Questionnaire] API request failed')
      console.error('[Questionnaire] Error:', fetchError)
      console.error('[Questionnaire] API URL:', requestUrl)

      setSubmitError('Unable to submit your questionnaire. Please check your connection and try again.')
    }
  }

  return (
    <FormProvider {...form}>
      <main className="min-h-screen bg-muted/30 px-4 py-8 sm:px-8 sm:py-12">
        <div className={`mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-8 ${mainGridClass}`}>
          {showSummaryPanel && <SummaryPanel sectionKey={currentSectionKey} />}

          <Card className={`flex flex-col overflow-hidden lg:h-[calc(100dvh-6rem)] lg:min-h-[36rem] ${!showSummaryPanel ? 'mx-auto w-full max-w-5xl' : ''}`}>
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

                  <p
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
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

                <section aria-labelledby="current-section-title">
                  <h2
                    id="current-section-title"
                    ref={sectionHeadingRef}
                    tabIndex={-1}
                    className="sr-only"
                  >
                    {currentSectionKey
                      ? SECTION_TITLES[currentSectionKey]
                      : 'Overall Network Planning Summary'}
                  </h2>

                  <CurrentSection />
                </section>

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