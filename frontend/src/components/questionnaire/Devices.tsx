import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet, FieldLegend, FieldGroup,
  Field, FieldLabel, FieldError,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/form-ui"

function Devices() {
  const { control, watch } = useFormContext()

  const voipEnabled = watch('devices.voip.enabled')
  const ipCamerasEnabled = watch('devices.ipCameras.enabled')
  const otherDevicesEnabled = watch('devices.otherNetworkDevices.enabled')

  return (
    <FieldSet>
      <FieldLegend>Devices</FieldLegend>

      <FieldGroup>
        {/* Wired Computers */}
        <Controller
          name="devices.wiredComputers"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Number of wired desktops/laptops</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                min="0"
                placeholder="Enter number"
                aria-invalid={fieldState.invalid}
                onChange={(event) => field.onChange(event.target.valueAsNumber)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Wi-Fi Devices */}
        <Controller
          name="devices.wifiDevices"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Number of Wi-Fi devices</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                min="0"
                placeholder="Enter number"
                aria-invalid={fieldState.invalid}
                onChange={(event) => field.onChange(event.target.valueAsNumber)}
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
              <FieldLabel htmlFor={field.name}>Do you use VoIP phones?</FieldLabel>
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

        {/* VoIP Phone Count */}
        {voipEnabled && (
          <Controller
            name="devices.voip.phoneCount"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Number of VoIP phones</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="number"
                  min="0"
                  placeholder="Enter number"
                  aria-invalid={fieldState.invalid}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
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
              <FieldLabel htmlFor={field.name}>Do you use IP cameras?</FieldLabel>
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

        {/* IP Camera Count */}
        {ipCamerasEnabled && (
          <Controller
            name="devices.ipCameras.cameraCount"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Number of IP cameras</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="number"
                  min="0"
                  placeholder="Enter number"
                  aria-invalid={fieldState.invalid}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
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
              <FieldLabel htmlFor={field.name}>Do you have other network-connected devices?</FieldLabel>
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

        {/* Other Network Devices Description */}
        {otherDevicesEnabled && (
          <Controller
            name="devices.otherNetworkDevices.description"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Other network-connected devices</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="text"
                  placeholder="Enter other devices"
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

export default Devices