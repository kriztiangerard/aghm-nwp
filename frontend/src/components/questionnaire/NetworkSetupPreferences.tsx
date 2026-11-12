import { useEffect } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'

import { QUESTIONNAIRE_LIMITS } from '@/lib/questionnaireLimits'
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
} from '@/components/ui/form-ui'
import { Checkbox } from '@/components/ui/checkbox'

function NetworkSetupPreferences() {
  const { control, clearErrors, setValue } = useFormContext()
  const otherUsageEnabled = useWatch({
    control,
    name: 'preferences.applications.otherEnabled',
  })

  useEffect(() => {
    if (!otherUsageEnabled) {
      setValue('preferences.applications.other', '', {
        shouldDirty: true,
        shouldValidate: false,
      })
      clearErrors(['preferences.applications.other'])
    }
  }, [clearErrors, otherUsageEnabled, setValue])

  const equipmentLocationLabels: Record<string, string> = {
    full_size_rack: 'Full-size rack in a dedicated closet/room',
    wall_cabinet: 'Wall cabinet',
    not_sure: 'Not sure / Recommend',
  }

  const managementPreferenceLabels: Record<string, string> = {
    dashboard: "A simple app or web dashboard (easier to use, good if you don't have dedicated IT staff)",
    command_line:
      'Traditional command-line/technical management (for experienced IT staff)',
    not_sure: 'Not sure — recommend for me',
  }

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
              <FieldLabel htmlFor={field.name} required>Do you need Guest Wi-Fi?</FieldLabel>
              <Select
                value={field.value === undefined ? '' : field.value ? 'yes' : 'no'}
                onValueChange={(val) => field.onChange(val === 'yes')}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  {field.value !== undefined ? (
                    <span className="flex-1 text-left">
                      {field.value ? 'Yes' : 'No'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select an answer</span>
                  )}
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
              <FieldLabel htmlFor={field.name} required>Will this network handle sensitive data?</FieldLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  {field.value ? (
                    <span className="flex-1 text-left">
                      {field.value === 'no' ? 'No' : field.value === 'yes' ? 'Yes' : 'Not sure'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select an answer</span>
                  )}
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
          <FieldLabel>Which of these will your team regularly use on this network?</FieldLabel>
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

        {/* Other Network Usage Toggle */}
        <Controller
          name="preferences.applications.otherEnabled"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-start gap-3">
                <Checkbox
                  id={field.name}
                  checked={!!field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                />
                <div className="space-y-1">
                  <FieldLabel htmlFor={field.name}>Other network usage</FieldLabel>
                </div>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {otherUsageEnabled && (
          <Controller
            name="preferences.applications.other"
            control={control}
            render={({ field: { value, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} required>Tell us what other network usage you have</FieldLabel>
                <Input
                  {...field}
                  value={value ?? ''}
                  id={field.name}
                  type="text"
                  maxLength={QUESTIONNAIRE_LIMITS.text.otherDescription.max}
                  placeholder="Enter other usage"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}

        {/* Equipment Location */}
        <Controller
          name="preferences.equipmentLocation"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name} required>
                Where will the main network equipment (switches, router) be housed?
              </FieldLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  {field.value ? (
                    <span className="flex-1 text-left">
                      {equipmentLocationLabels[field.value]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select an option</span>
                  )}
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
              <FieldLabel htmlFor={field.name} required>
                How would you like to manage the network day-to-day?
              </FieldLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  {field.value ? (
                    <span className="flex-1 text-left">
                      {managementPreferenceLabels[field.value]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select an option</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">
                    A simple app or web dashboard (easier to use, good if you don't have dedicated IT staff)
                  </SelectItem>
                  <SelectItem value="command_line">
                    Traditional command-line/technical management (for experienced IT staff)
                  </SelectItem>
                  <SelectItem value="not_sure">
                    Not sure — recommend for me
                  </SelectItem>
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