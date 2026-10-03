import { useEffect } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'

import { QUESTIONNAIRE_LIMITS } from '@/lib/questionnaireLimits'
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

export default function Devices() {
  const { control, setValue, clearErrors } = useFormContext()

  const [voipEnabled, ipCamerasEnabled, otherDevicesEnabled] = useWatch({
    control,
    name: [
      'devices.voip.enabled',
      'devices.ipCameras.enabled',
      'devices.otherNetworkDevices.enabled',
    ],
  })

  useEffect(() => {
    if (!voipEnabled) {
      setValue('devices.voip.phoneCount', undefined, {
        shouldDirty: true,
        shouldValidate: false,
      })
      clearErrors(['devices.voip.phoneCount'])
    }
  }, [clearErrors, setValue, voipEnabled])

  useEffect(() => {
    if (!ipCamerasEnabled) {
      setValue('devices.ipCameras.cameraCount', undefined, {
        shouldDirty: true,
        shouldValidate: false,
      })
      clearErrors(['devices.ipCameras.cameraCount'])
    }
  }, [clearErrors, ipCamerasEnabled, setValue])

  useEffect(() => {
    if (!otherDevicesEnabled) {
      setValue('devices.otherNetworkDevices.description', undefined, {
        shouldDirty: true,
        shouldValidate: false,
      })
      clearErrors(['devices.otherNetworkDevices.description'])
    }
  }, [clearErrors, otherDevicesEnabled, setValue])

  return (
    <FieldSet>
      <FieldLegend>Devices</FieldLegend>

      <FieldGroup>
        {/* Wired Computers */}
        <Controller
          name="devices.wiredComputers"
          control={control}
          render={({ field: { value, onChange, ...field }, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Roughly how many desktop or laptop computers will be wired directly into the network?</FieldLabel>
              <FieldDescription>
                Include desktops and laptops that connect through Ethernet instead of Wi-Fi.
              </FieldDescription>
              <Input
                {...field}
                value={value ?? ''}
                id={field.name}
                type="number"
                inputMode="numeric"
                min={QUESTIONNAIRE_LIMITS.devices.wiredComputers.min}
                max={QUESTIONNAIRE_LIMITS.devices.wiredComputers.max}
                step="1"
                placeholder="Enter a number"
                aria-invalid={fieldState.invalid}
                onKeyDown={preventWholeNumberKeys}
                onPaste={(e) =>
                  handleWholeNumberPaste(
                    e,
                    QUESTIONNAIRE_LIMITS.devices.wiredComputers.min,
                    QUESTIONNAIRE_LIMITS.devices.wiredComputers.max,
                  )
                }
                onChange={(e) =>
                  handleWholeNumberChange(
                    e.target.value,
                    onChange,
                    QUESTIONNAIRE_LIMITS.devices.wiredComputers.min,
                    QUESTIONNAIRE_LIMITS.devices.wiredComputers.max,
                  )
                }
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Wi-Fi Devices */}
        <Controller
          name="devices.wifiDevices"
          control={control}
          render={({ field: { value, onChange, ...field }, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Roughly how many devices will connect over Wi-Fi?</FieldLabel>
              <FieldDescription>
                Include laptops, phones, tablets, and other devices that connect by Wi-Fi.
              </FieldDescription>
              <Input
                {...field}
                value={value ?? ''}
                id={field.name}
                type="number"
                inputMode="numeric"
                min={QUESTIONNAIRE_LIMITS.devices.wifiDevices.min}
                max={QUESTIONNAIRE_LIMITS.devices.wifiDevices.max}
                step="1"
                placeholder="Enter a number"
                aria-invalid={fieldState.invalid}
                onKeyDown={preventWholeNumberKeys}
                onPaste={(e) =>
                  handleWholeNumberPaste(
                    e,
                    QUESTIONNAIRE_LIMITS.devices.wifiDevices.min,
                    QUESTIONNAIRE_LIMITS.devices.wifiDevices.max,
                  )
                }
                onChange={(e) =>
                  handleWholeNumberChange(
                    e.target.value,
                    onChange,
                    QUESTIONNAIRE_LIMITS.devices.wifiDevices.min,
                    QUESTIONNAIRE_LIMITS.devices.wifiDevices.max,
                  )
                }
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* VoIP Enabled */}
        <Controller
          name="devices.voip.enabled"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Will you use internet-based desk phones (VoIP) instead of, or alongside, a traditional phone line?</FieldLabel>
              <FieldDescription>
                This includes desk phones and other office phones that connect over the internet.
              </FieldDescription>
              <Select
                value={field.value === undefined ? '' : field.value ? 'yes' : 'no'}
                onValueChange={(val) => field.onChange(val === 'yes')}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  {field.value !== undefined ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
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

        {/* VoIP Phone Count */}
        {voipEnabled && (
          <Controller
            name="devices.voip.phoneCount"
            control={control}
            render={({ field: { value, onChange, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>How many VoIP phones will you have?</FieldLabel>
                <Input
                  {...field}
                  value={value ?? ''}
                  id={field.name}
                  type="number"
                  inputMode="numeric"
                  min={QUESTIONNAIRE_LIMITS.devices.voipPhoneCount.min}
                  max={QUESTIONNAIRE_LIMITS.devices.voipPhoneCount.max}
                  step="1"
                  placeholder="Enter a number"
                  aria-invalid={fieldState.invalid}
                  onKeyDown={preventWholeNumberKeys}
                  onPaste={(e) =>
                    handleWholeNumberPaste(
                      e,
                      QUESTIONNAIRE_LIMITS.devices.voipPhoneCount.min,
                      QUESTIONNAIRE_LIMITS.devices.voipPhoneCount.max,
                    )
                  }
                  onChange={(e) =>
                    handleWholeNumberChange(
                      e.target.value,
                      onChange,
                      QUESTIONNAIRE_LIMITS.devices.voipPhoneCount.min,
                      QUESTIONNAIRE_LIMITS.devices.voipPhoneCount.max,
                    )
                  }
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}

        {/* IP Cameras Enabled */}
        <Controller
          name="devices.ipCameras.enabled"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Will you have security cameras connected to this network (IP cameras)?</FieldLabel>
              <FieldDescription>
                This includes security or monitoring cameras connected to your network.
              </FieldDescription>
              <Select
                value={field.value === undefined ? '' : field.value ? 'yes' : 'no'}
                onValueChange={(val) => field.onChange(val === 'yes')}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  {field.value !== undefined ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
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

        {/* IP Camera Count */}
        {ipCamerasEnabled && (
          <Controller
            name="devices.ipCameras.cameraCount"
            control={control}
            render={({ field: { value, onChange, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Roughly how many cameras?</FieldLabel>
                <Input
                  {...field}
                  value={value ?? ''}
                  id={field.name}
                  type="number"
                  inputMode="numeric"
                  min={QUESTIONNAIRE_LIMITS.devices.ipCameraCount.min}
                  max={QUESTIONNAIRE_LIMITS.devices.ipCameraCount.max}
                  step="1"
                  placeholder="Enter a number"
                  aria-invalid={fieldState.invalid}
                  onKeyDown={preventWholeNumberKeys}
                  onPaste={(e) =>
                    handleWholeNumberPaste(
                      e,
                      QUESTIONNAIRE_LIMITS.devices.ipCameraCount.min,
                      QUESTIONNAIRE_LIMITS.devices.ipCameraCount.max,
                    )
                  }
                  onChange={(e) =>
                    handleWholeNumberChange(
                      e.target.value,
                      onChange,
                      QUESTIONNAIRE_LIMITS.devices.ipCameraCount.min,
                      QUESTIONNAIRE_LIMITS.devices.ipCameraCount.max,
                    )
                  }
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}

        {/* Other Network Devices Enabled */}
        <Controller
          name="devices.otherNetworkDevices.enabled"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Any other network-connected devices?
              </FieldLabel>
              <FieldDescription>
                Examples include door access control, point-of-sale systems, printers, or smart building sensors.
              </FieldDescription>
              <Select
                value={field.value === undefined ? '' : field.value ? 'yes' : 'no'}
                onValueChange={(val) => field.onChange(val === 'yes')}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  {field.value !== undefined ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
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

        {/* Other Network Devices Description */}
        {otherDevicesEnabled && (
          <Controller
            name="devices.otherNetworkDevices.description"
            control={control}
            render={({ field: { value, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>List the other network-connected devices</FieldLabel>
                <Input
                  {...field}
                  value={value ?? ''}
                  id={field.name}
                  type="text"
                  maxLength={QUESTIONNAIRE_LIMITS.text.otherDescription.max}
                  placeholder="Enter names or descriptions"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}
      </FieldGroup>
    </FieldSet>
  )
}