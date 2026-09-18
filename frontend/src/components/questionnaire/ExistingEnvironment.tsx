import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet, FieldLegend, FieldGroup,
  Field, FieldLabel, FieldError,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/form-ui"

function ExistingEnvironment() {
  const { control } = useFormContext()

  return (
    <FieldSet>
      <FieldLegend>What's Already There</FieldLegend>

      <FieldGroup>
        <Controller name="existingEquipment" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Do you already have network equipment?</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select an answer" /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="not-sure">Not sure</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="equipment" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Existing equipment</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select equipment" /></SelectTrigger><SelectContent><SelectItem value="router">Router/Modem</SelectItem><SelectItem value="switch">Switches</SelectItem><SelectItem value="access-point">Access Points</SelectItem><SelectItem value="cabling">Network Cabling</SelectItem><SelectItem value="not-sure">Not sure</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="cabling" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Existing network cabling</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select cabling" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="cat5e">Cat5e</SelectItem><SelectItem value="cat6">Cat6</SelectItem><SelectItem value="fiber">Fiber</SelectItem><SelectItem value="not-sure">Not sure</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
      </FieldGroup>
    </FieldSet>
  )
}

export default ExistingEnvironment