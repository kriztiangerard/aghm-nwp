import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet, FieldLegend, FieldGroup,
  Field, FieldLabel, FieldError,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/form-ui"
import { Checkbox } from "@/components/ui/checkbox"

function NetworkSetupPreferences() {
  const { control } = useFormContext()

  const applicationList = [
    { name: 'preferences.applications.videoConferencing', label: 'Video conferencing' },
    { name: 'preferences.applications.voipCalls', label: 'VoIP calls' },
    { name: 'preferences.applications.posPayment', label: 'POS/Payment' },
    { name: 'preferences.applications.cloudStorage', label: 'Cloud storage' },
    { name: 'preferences.applications.businessSoftware', label: 'Business software' },
    { name: 'preferences.applications.videoStreaming', label: 'Video streaming' },
    { name: 'preferences.applications.securityCameraViewing', label: 'Security camera viewing' },
    { name: 'preferences.applications.basicBrowsingEmail', label: 'Basic browsing / email' },
  ] as const

  return (
    <FieldSet>
      <FieldLegend>Network Setup Preferences</FieldLegend>

      <FieldGroup>
        {/* Guest Wi-Fi */}
        <Controller
          name="preferences.guestWifi"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Do you need Guest Wi-Fi?</FieldLabel>
              <Select
                value={field.value ? 'yes' : 'no'}
                onValueChange={(val) => field.onChange(val === 'yes')}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select an answer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Sensitive Data */}
        <Controller
          name="preferences.sensitiveData"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Does the business handle sensitive data?</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select an answer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="not_sure">Not sure</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Application Checkboxes */}
        <Field>
          <FieldLabel>Main network usage</FieldLabel>
          <FieldGroup data-slot="checkbox-group">
            {applicationList.map(({ name, label }) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Checkbox
                      id={name}
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                    />
                    <FieldLabel htmlFor={name}>{label}</FieldLabel>
                  </Field>
                )}
              />
            ))}
          </FieldGroup>
        </Field>

        {/* Other Application Description */}
        <Controller
          name="preferences.applications.other"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Other network usage</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="text"
                placeholder="Enter other usage"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Equipment Location */}
        <Controller
          name="preferences.equipmentLocation"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Where should the main network equipment be housed?
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_size_rack">
                    Full-size rack in a dedicated closet/room
                  </SelectItem>
                  <SelectItem value="wall_cabinet">Wall cabinet</SelectItem>
                  <SelectItem value="not_sure">Not sure / Recommend</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Management Preference */}
        <Controller
          name="preferences.managementPreference"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Preferred network management</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Simple app/web dashboard</SelectItem>
                  <SelectItem value="command_line">Traditional CLI/technical</SelectItem>
                  <SelectItem value="not_sure">Not sure</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </FieldSet>
  )
}

export default NetworkSetupPreferences