import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet, FieldLegend, FieldGroup,
  Field, FieldLabel, FieldError,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/form-ui"

function InternetConnection() {
  const { control } = useFormContext()

  return (
    <FieldSet>
      <FieldLegend>Internet Connection</FieldLegend>

      <FieldGroup>
        <Controller name="internetSpeed" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Current internet speed (Mbps)</FieldLabel><Input {...field} id={field.name} type="number" min="1" placeholder="Enter Mbps" aria-invalid={fieldState.invalid} onChange={(event) => field.onChange(event.target.valueAsNumber)} />{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="connectionType" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Internet connection type</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select connection type" /></SelectTrigger><SelectContent><SelectItem value="fiber">Fiber</SelectItem><SelectItem value="dsl">DSL</SelectItem><SelectItem value="wireless">Wireless/Cellular</SelectItem><SelectItem value="not-checked">Not checked</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="downtime" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>How much does internet downtime matter?</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select an answer" /></SelectTrigger><SelectContent><SelectItem value="wait">We can wait it out</SelectItem><SelectItem value="same-day">It matters if it lasts the whole day</SelectItem><SelectItem value="critical">Every minute matters</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
      </FieldGroup>
    </FieldSet>
  )
}

export default InternetConnection