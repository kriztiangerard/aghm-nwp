import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/form-ui'

function BudgetBusinessContext() {
  const {
    control,
    watch,
    formState: { isSubmitted },
  } = useFormContext()

  const expectedGrowth = watch('businessContext.expectedGrowth')

  const monthlyBudgetLabels: Record<string, string> = {
    under_15000: 'Under $15,000',
    '15000_40000': '$15,000–$40,000',
    over_40000: 'Over $40,000',
  }

  const itSupportLabels: Record<string, string> = {
    none: 'No dedicated IT support',
    external: 'Outside person/company',
    in_house: 'In-house IT',
  }

  const electricityLabels: Record<string, string> = {
    stable: 'Stable',
    frequent_outages: 'Frequent brownouts/outages',
  }

  const growthLabels: Record<string, string> = {
    no: 'No',
    yes: 'Yes',
  }

  const headcountLabels: Record<string, string> = {
    '0_10': '0–10%',
    '11_30': '11–30%',
    '31_plus': '31%+',
  }

  const siteLabels: Record<string, string> = {
    none: 'None',
    one: '1',
    two_or_more: '2+',
  }

  return (
    <FieldSet>
      <FieldLegend>Budget &amp; Business Context</FieldLegend>

      <FieldGroup>
        <Controller
          name="businessContext.monthlyITBudget"
          control={control}
          render={({ field, fieldState }) => {
            const shouldShowError =
              fieldState.invalid && (fieldState.isTouched || isSubmitted)

            return (
              <Field data-invalid={shouldShowError}>
                <FieldLabel htmlFor={field.name}>Monthly IT budget</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id={field.name} aria-invalid={shouldShowError}>
                    {field.value ? (
                      <span className="flex-1 text-left">{monthlyBudgetLabels[field.value]}</span>
                    ) : (
                      <span className="text-muted-foreground">Select an option</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_15000">Under $15,000</SelectItem>
                    <SelectItem value="15000_40000">$15,000–$40,000</SelectItem>
                    <SelectItem value="over_40000">Over $40,000</SelectItem>
                  </SelectContent>
                </Select>
                {shouldShowError && <FieldError errors={[fieldState.error]} />}
              </Field>
            )
          }}
        />

        <Controller
          name="businessContext.ITSupport"
          control={control}
          render={({ field, fieldState }) => {
            const shouldShowError =
              fieldState.invalid && (fieldState.isTouched || isSubmitted)

            return (
              <Field data-invalid={shouldShowError}>
                <FieldLabel htmlFor={field.name}>IT support</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id={field.name} aria-invalid={shouldShowError}>
                    {field.value ? (
                      <span className="flex-1 text-left">{itSupportLabels[field.value]}</span>
                    ) : (
                      <span className="text-muted-foreground">Select an option</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No dedicated IT support</SelectItem>
                    <SelectItem value="external">Outside person/company</SelectItem>
                    <SelectItem value="in_house">In-house IT</SelectItem>
                  </SelectContent>
                </Select>
                {shouldShowError && <FieldError errors={[fieldState.error]} />}
              </Field>
            )
          }}
        />

        <Controller
          name="businessContext.electricityReliability"
          control={control}
          render={({ field, fieldState }) => {
            const shouldShowError =
              fieldState.invalid && (fieldState.isTouched || isSubmitted)

            return (
              <Field data-invalid={shouldShowError}>
                <FieldLabel htmlFor={field.name}>Electricity reliability</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id={field.name} aria-invalid={shouldShowError}>
                    {field.value ? (
                      <span className="flex-1 text-left">{electricityLabels[field.value]}</span>
                    ) : (
                      <span className="text-muted-foreground">Select an option</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="frequent_outages">Frequent brownouts/outages</SelectItem>
                  </SelectContent>
                </Select>
                {shouldShowError && <FieldError errors={[fieldState.error]} />}
              </Field>
            )
          }}
        />

        <Controller
          name="businessContext.expectedGrowth"
          control={control}
          render={({ field, fieldState }) => {
            const shouldShowError =
              fieldState.invalid && (fieldState.isTouched || isSubmitted)

            return (
              <Field data-invalid={shouldShowError}>
                <FieldLabel htmlFor={field.name}>
                  Do you expect business growth in the next 1–2 years?
                </FieldLabel>
                <Select
                  value={field.value === undefined ? '' : field.value ? 'yes' : 'no'}
                  onValueChange={(val) => field.onChange(val === 'yes')}
                >
                  <SelectTrigger id={field.name} aria-invalid={shouldShowError}>
                    {field.value !== undefined ? (
                      <span className="flex-1 text-left">{growthLabels[field.value ? 'yes' : 'no']}</span>
                    ) : (
                      <span className="text-muted-foreground">Select an option</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
                {shouldShowError && <FieldError errors={[fieldState.error]} />}
              </Field>
            )
          }}
        />

        {expectedGrowth && (
          <>
            <Controller
              name="businessContext.growth.headcountGrowth"
              control={control}
              render={({ field, fieldState }) => {
                const shouldShowError =
                  fieldState.invalid && (fieldState.isTouched || isSubmitted)

                return (
                  <Field data-invalid={shouldShowError}>
                    <FieldLabel htmlFor={field.name}>Expected headcount growth</FieldLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id={field.name} aria-invalid={shouldShowError}>
                        {field.value ? (
                          <span className="flex-1 text-left">{headcountLabels[field.value]}</span>
                        ) : (
                          <span className="text-muted-foreground">Select an option</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0_10">0–10%</SelectItem>
                        <SelectItem value="11_30">11–30%</SelectItem>
                        <SelectItem value="31_plus">31%+</SelectItem>
                      </SelectContent>
                    </Select>
                    {shouldShowError && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )
              }}
            />

            <Controller
              name="businessContext.growth.newSites"
              control={control}
              render={({ field, fieldState }) => {
                const shouldShowError =
                  fieldState.invalid && (fieldState.isTouched || isSubmitted)

                return (
                  <Field data-invalid={shouldShowError}>
                    <FieldLabel htmlFor={field.name}>Expected additional sites</FieldLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id={field.name} aria-invalid={shouldShowError}>
                        {field.value ? (
                          <span className="flex-1 text-left">{siteLabels[field.value]}</span>
                        ) : (
                          <span className="text-muted-foreground">Select an option</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="one">1</SelectItem>
                        <SelectItem value="two_or_more">2+</SelectItem>
                      </SelectContent>
                    </Select>
                    {shouldShowError && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )
              }}
            />
          </>
        )}
      </FieldGroup>
    </FieldSet>
  )
}

export default BudgetBusinessContext