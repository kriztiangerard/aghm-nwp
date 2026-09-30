import { Controller, useFormContext } from 'react-hook-form'

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
import { formatSelectLabel } from '@/lib/formatters'

function InternetConnection() {
  const { control } = useFormContext()

  return (
    <FieldSet>
      <FieldLegend>Internet Connection</FieldLegend>

      <FieldGroup>
        <Controller
          name="internet.connectionType"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                What type of internet connection do you currently have?
              </FieldLabel>

              <FieldDescription>
                If you're not sure what type of connection you have,
                choose "Not checked / Not sure."
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
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select an answer
                    </span>
                  )}
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="fiber">
                    Fiber
                  </SelectItem>

                  <SelectItem value="dsl_or_cellular">
                    DSL / Cellular
                  </SelectItem>

                  <SelectItem value="not_checked">
                    Not checked / Not sure
                  </SelectItem>
                </SelectContent>
              </Select>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="internet.currentSpeedMbps"
          control={control}
          render={({ field: { value, onChange, ...field }, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                What is your current internet speed?
              </FieldLabel>

              <FieldDescription>
                Enter the speed shown by your internet provider or
                speed test, in Mbps. You can leave this blank if you
                don't know it.
              </FieldDescription>

              <Input
                {...field}
                value={value ?? ''}
                id={field.name}
                type="number"
                min="1"
                placeholder="Enter a number in Mbps"
                aria-invalid={fieldState.invalid}
                onChange={(event) => {
                  const val = event.target.valueAsNumber
                  onChange(Number.isNaN(val) ? '' : val)
                }}
              />

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="internet.downtimeImpact"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                How important is it for your internet connection to
                stay available?
              </FieldLabel>

              <FieldDescription>
                Think about what would happen to your business if the
                internet stopped working. Choose the option that best
                describes how quickly you would need it working again.
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
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select an answer
                    </span>
                  )}
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="can_wait">
                    We can wait for it to be fixed
                  </SelectItem>

                  <SelectItem value="same_day_matters">
                    It should be fixed within the same day
                  </SelectItem>

                  <SelectItem value="every_minute_matters">
                    We need the internet available with very little
                    downtime
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
    </FieldSet>
  )
}

export default InternetConnection