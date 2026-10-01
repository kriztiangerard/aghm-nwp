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
import {
  handleWholeNumberChange,
  handleWholeNumberPaste,
  preventWholeNumberKeys,
} from '@/lib/numberInput'

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
                What type of internet connection do you have or plan to get?
              </FieldLabel>

              <FieldDescription>
                Choose the option that best matches your current or planned connection.
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
                Current internet speed, if known (in Mbps)
              </FieldLabel>

              <FieldDescription>
                This is your internet plan's advertised speed. Check your ISP bill or
                router settings. Not sure? Skip this and we will estimate it safely.
              </FieldDescription>

              <Input
                {...field}
                value={value ?? ''}
                id={field.name}
                type="number"
                inputMode="numeric"
                min="1"
                max="1000000"
                step="1"
                placeholder="Enter a number in Mbps"
                aria-invalid={fieldState.invalid}
                onKeyDown={preventWholeNumberKeys}
                onPaste={handleWholeNumberPaste}
                onChange={(event) => {
                  handleWholeNumberChange(event.target.value, onChange)
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
                If your internet went down for an hour, how much would it hurt the business?
              </FieldLabel>

              <FieldDescription>
                Think about how quickly the business would be affected if the internet were
                unavailable for a while.
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