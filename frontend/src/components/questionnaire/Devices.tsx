import { Controller, useFormContext, useWatch } from 'react-hook-form'

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

export default function Devices() {
  const { control } = useFormContext()

  // 1. Optimized rendering using useWatch with targeted field names
  const [voipEnabled, ipCamerasEnabled, otherDevicesEnabled] = useWatch({
    control,
    name: [
      'devices.voip.enabled',
      'devices.ipCameras.enabled',
      'devices.otherNetworkDevices.enabled',
    ],
  })

  // Helper for numeric input parsing to safely handle NaN / empty states
  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: number | string) => void
  ) => {
    const val = e.target.valueAsNumber
    onChange(Number.isNaN(val) ? '' : val)
  }

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
              <FieldLabel htmlFor={field.name}>How many wired computers are in use?</FieldLabel>
              <FieldDescription>
                Include desktops and laptops that connect through Ethernet.
              </FieldDescription>
              <Input
                {...field}
                value={value ?? ''}
                id={field.name}
                type="number"
                min="0"
                placeholder="Enter a number"
                aria-invalid={fieldState.invalid}
                onChange={(e) => handleNumberChange(e, onChange)}
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
              <FieldLabel htmlFor={field.name}>How many wireless devices are connected?</FieldLabel>
              <FieldDescription>
                Include phones, laptops, tablets, printers, and other devices that use Wi-Fi.
              </FieldDescription>
              <Input
                {...field}
                value={value ?? ''}
                id={field.name}
                type="number"
                min="0"
                placeholder="Enter a number"
                aria-invalid={fieldState.invalid}
                onChange={(e) => handleNumberChange(e, onChange)}
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
              <FieldLabel htmlFor={field.name}>Do you use voice over internet protocol phones?</FieldLabel>
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
                <FieldLabel htmlFor={field.name}>How many voice over internet protocol phones do you have?</FieldLabel>
                <Input
                  {...field}
                  value={value ?? ''}
                  id={field.name}
                  type="number"
                  min="0"
                  placeholder="Enter a number"
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => handleNumberChange(e, onChange)}
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
              <FieldLabel htmlFor={field.name}>Do you use internet protocol cameras?</FieldLabel>
              <FieldDescription>
                This includes security cameras or monitoring cameras connected to your network.
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
                <FieldLabel htmlFor={field.name}>How many internet protocol cameras do you have?</FieldLabel>
                <Input
                  {...field}
                  value={value ?? ''}
                  id={field.name}
                  type="number"
                  min="0"
                  placeholder="Enter a number"
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => handleNumberChange(e, onChange)}
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
                Do you have other network-connected devices?
              </FieldLabel>
              <FieldDescription>
                Include devices such as printers, smart sensors, displays, or other equipment on your network.
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