import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet, FieldLegend, FieldGroup,
  Field, FieldLabel, FieldError,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/form-ui"

function ProjectBasics() {
  const { control } = useFormContext()

  const locationOptions = [
    { label: "One site", value: "one" },
    { label: "Two or more sites", value: "multiple" },
  ]

  return (
    <FieldSet>
      <FieldLegend>Project Basics</FieldLegend>

      <FieldGroup>
        <Controller
          name="companyName"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Project or company name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="text"
                placeholder="Enter project or company name"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="locations"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Number of business locations</FieldLabel>
              <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={field.name} className="w-[180px]" aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select an answer" />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="headcount"
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
                max="200"
                placeholder="1–200"
                aria-invalid={fieldState.invalid}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </FieldSet>
  )
}

export default ProjectBasics 