import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet, FieldLegend, FieldGroup,
  Field, FieldLabel, FieldError,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/form-ui"

function Devices() {
  const { control } = useFormContext()

  return (
    <FieldSet>
      <FieldLegend>Devices</FieldLegend>

      <FieldGroup>
        <Controller name="wiredDevices" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Number of wired desktops/laptops</FieldLabel><Input {...field} id={field.name} type="number" min="0" placeholder="Enter number" aria-invalid={fieldState.invalid} onChange={(event) => field.onChange(event.target.valueAsNumber)} />{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="wifiDevices" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Number of Wi-Fi devices</FieldLabel><Input {...field} id={field.name} type="number" min="0" placeholder="Enter number" aria-invalid={fieldState.invalid} onChange={(event) => field.onChange(event.target.valueAsNumber)} />{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="voip" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Do you use VoIP phones?</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select an answer" /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="cameras" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Do you use IP cameras?</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select an answer" /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="otherDevices" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Other network-connected devices</FieldLabel><Input {...field} id={field.name} type="text" placeholder="Enter other devices" aria-invalid={fieldState.invalid} />{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
      </FieldGroup>
    </FieldSet>
  )
}

export default Devices