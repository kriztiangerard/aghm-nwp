import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet, FieldLegend, FieldGroup,
  Field, FieldLabel, FieldError,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/form-ui"
import { Checkbox } from "@/components/ui/checkbox"

function NetworkSetupPreferences() {
  const { control } = useFormContext()

  return (
    <FieldSet>
      <FieldLegend>Network Setup Preferences</FieldLegend>

      <FieldGroup>
        <Controller name="guestWifi" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Do you need Guest Wi-Fi?</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select an answer" /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="sensitiveData" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Does the business handle sensitive data?</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select an answer" /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="not-sure">Not sure</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
        <Controller name="usage" control={control} render={({ field, fieldState }) => {
          const usageOptions = [
            ['video-conferencing', 'Video conferencing'], ['voip', 'VoIP'], ['pos', 'POS/Payment'],
            ['cloud', 'Cloud storage'], ['erp', 'ERP/Accounting'], ['streaming', 'Streaming/Downloads'],
            ['security', 'Security camera viewing/recording'], ['basic', 'Basic browsing'],
          ] as const
          return <Field data-invalid={fieldState.invalid}><FieldLabel>Main network usage</FieldLabel><FieldGroup data-slot="checkbox-group">
            {usageOptions.map(([value, label]) => <Field key={value} orientation="horizontal"><Checkbox id={`usage-${value}`} checked={field.value?.includes(value)} onCheckedChange={(checked) => field.onChange(checked ? [...(field.value ?? []), value] : (field.value ?? []).filter((item: string) => item !== value))} aria-invalid={fieldState.invalid} /><FieldLabel htmlFor={`usage-${value}`}>{label}</FieldLabel></Field>)}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </FieldGroup></Field>
        }} />
        <Controller name="equipmentHousing" control={control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>Where should the main network equipment be housed?</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select an option" /></SelectTrigger><SelectContent><SelectItem value="rack">Full-size rack in a dedicated closet/room</SelectItem><SelectItem value="wall-cabinet">Wall cabinet</SelectItem><SelectItem value="not-sure">Not sure / Recommend</SelectItem></SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
        )} />
      </FieldGroup>
    </FieldSet>
  )
}

export default NetworkSetupPreferences