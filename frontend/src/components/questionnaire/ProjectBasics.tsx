
import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/form-ui'

function ProjectBasics() {
  const { control } = useFormContext()

  return (
    <FieldSet>
      <FieldLegend>Project Basics</FieldLegend>

      <FieldGroup>
        <Controller
          name="project.name"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Project or company name
              </FieldLabel>

              <Input
                {...field}
                id={field.name}
                type="text"
                placeholder="Enter project or company name"
                aria-invalid={fieldState.invalid}
              />

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <FieldGroup>
        <Controller
          name="project.numberOfSites"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Number of business locations
              </FieldLabel>

              <Input
                {...field}
                id={field.name}
                type="number"
                min="1"
                placeholder="Enter number of locations"
                aria-invalid={fieldState.invalid}
                onChange={(event) =>
                  field.onChange(event.target.valueAsNumber)
                }
              />

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <FieldGroup>
        <Controller
          name="project.siteRelationship"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                How are the business locations related?
              </FieldLabel>

              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select an answer" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="same_city">
                    Same city
                  </SelectItem>

                  <SelectItem value="same_country">
                    Same country
                  </SelectItem>

                  <SelectItem value="different_countries">
                    Different countries
                  </SelectItem>
                </SelectContent>
              </Select>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <FieldGroup>
        <Controller
          name="project.totalUsers"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Total number of people who will use this network
              </FieldLabel>

              <Input
                {...field}
                id={field.name}
                type="number"
                min="1"
                placeholder="Enter number of users"
                aria-invalid={fieldState.invalid}
                onChange={(event) =>
                  field.onChange(event.target.valueAsNumber)
                }
              />

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