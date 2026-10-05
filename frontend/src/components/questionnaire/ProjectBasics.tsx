import { Controller, useFormContext, useWatch } from 'react-hook-form'

import { QUESTIONNAIRE_LIMITS } from '@/lib/questionnaireLimits'
import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  Input,
} from '@/components/ui/form-ui'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  clampWholeNumberInput,
  preventWholeNumberKeys,
} from '@/lib/numberInput'

function ProjectBasics() {
  const { control, setValue } = useFormContext()
  const numberOfSites = useWatch({ control, name: 'project.numberOfSites' })
  const isMultiSite = numberOfSites === 'two_or_more'

  return (
    <FieldSet>
      <FieldLegend>Project Basics</FieldLegend>

      <FieldGroup>
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[3fr_1fr]">
          <Controller
            name="project.name"
            control={control}
            render={({ field: { value, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Project or company name
                </FieldLabel>

                <Input
                  {...field}
                  value={value ?? ''}
                  id={field.name}
                  type="text"
                  maxLength={QUESTIONNAIRE_LIMITS.project.name.max}
                  placeholder="Enter project or company name"
                  aria-invalid={fieldState.invalid}
                  className={
                    fieldState.invalid
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                />

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="project.totalUsers"
            control={control}
            render={({ field: { value, onChange, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Employee headcount
                </FieldLabel>

                <Input
                  {...field}
                  value={value ?? ''}
                  id={field.name}
                  type="number"
                  inputMode="numeric"
                  min={QUESTIONNAIRE_LIMITS.project.totalUsers.min}
                  max={QUESTIONNAIRE_LIMITS.project.totalUsers.max}
                  step="1"
                  pattern="[0-9]*"
                  placeholder="Enter number of users"
                  aria-invalid={fieldState.invalid}
                  className={
                    fieldState.invalid
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                  onKeyDown={preventWholeNumberKeys}
                  onPaste={(event) => {
                    const pastedText = event.clipboardData.getData('text')

                    if (pastedText === '') {
                      return
                    }

                    const sanitizedValue = clampWholeNumberInput(
                      pastedText.trim(),
                      QUESTIONNAIRE_LIMITS.project.totalUsers.min,
                      QUESTIONNAIRE_LIMITS.project.totalUsers.max,
                    )

                    if (sanitizedValue === undefined) {
                      event.preventDefault()
                      return
                    }

                    if (Number(sanitizedValue) !== Number(pastedText.trim())) {
                      event.preventDefault()
                      onChange(Number(sanitizedValue))
                    }
                  }}
                  onChange={(event) => {
                    const rawValue = event.target.value

                    if (rawValue === '') {
                      onChange('')
                      return
                    }

                    const sanitizedValue = clampWholeNumberInput(
                      rawValue,
                      QUESTIONNAIRE_LIMITS.project.totalUsers.min,
                      QUESTIONNAIRE_LIMITS.project.totalUsers.max,
                    )

                    if (sanitizedValue === undefined) {
                      return
                    }

                    if (Number(sanitizedValue) !== Number(rawValue)) {
                      onChange(Number(sanitizedValue))
                      return
                    }

                    onChange(sanitizedValue)
                  }}
                />

                {/* <FieldDescription>
                  This helps keep the plan appropriate for a small or medium business.
                </FieldDescription> 
                TO REPLACE W/ ERROR if user tries to enter more than 200 instead.
                */ }

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <Controller
          name="project.numberOfSites"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Number of business locations
              </FieldLabel>

              <FieldDescription>
                  The plan this questionnaire will generate covers one site, regardless of the number of business locations. For another site, repeat this questionnaire.
              </FieldDescription>  

              <RadioGroup
                id={field.name}
                value={field.value ?? ''}
                onValueChange={(value) => {
                  field.onChange(value)

                  if (value === 'one') {
                    setValue('project.siteRelationship', undefined, {
                      shouldDirty: true,
                      shouldValidate: false,
                    })
                  }
                }}
              >
                <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <RadioGroupItem value="one" id="project-number-of-sites-one" />
                  <span>One site</span>
                </label>

                <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
                  <RadioGroupItem value="two_or_more" id="project-number-of-sites-two-or-more" />
                  <span>Two or more sites</span>
                </label>
              </RadioGroup>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        {isMultiSite && (
          <Controller
            name="project.siteRelationship"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Where are these sites located?
                </FieldLabel>

                <RadioGroup
                  id={field.name}
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                >
                  <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
                    <RadioGroupItem value="same_city" id="project-site-relationship-same-city" />
                    <span>Same city</span>
                  </label>

                  <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
                    <RadioGroupItem value="same_country" id="project-site-relationship-same-country" />
                    <span>Same country</span>
                  </label>

                  <label className="flex items-center gap-3 rounded-md border p-3 text-sm">
                    <RadioGroupItem value="different_countries" id="project-site-relationship-different-countries" />
                    <span>Different countries</span>
                  </label>
                </RadioGroup>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}
      </FieldGroup>
    </FieldSet>
  )
}

export default ProjectBasics