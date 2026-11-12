import { Controller, useFormContext } from 'react-hook-form'

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/form-ui'
import {
  clampWholeNumberInput,
  preventWholeNumberKeys,
} from '@/lib/numberInput'

function ProjectBasics() {
  const { control } = useFormContext()

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
                <FieldLabel htmlFor={field.name} required>
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
                <FieldLabel htmlFor={field.name} required>
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
              <FieldLabel htmlFor={field.name} required>
                Number of business locations
              </FieldLabel>

              <FieldDescription>
                  The plan this questionnaire will generate covers one site, regardless of the number of business locations. For another site, repeat this questionnaire.
              </FieldDescription>  

              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  {field.value ? (
                    <span className="flex-1 text-left">
                      {field.value === 'one' ? 'One site' : 'Two or more sites'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select an option</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">One site</SelectItem>
                  <SelectItem value="two_or_more">Two or more sites</SelectItem>
                </SelectContent>
              </Select>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

      </FieldGroup>
    </FieldSet>
  )
}

export default ProjectBasics