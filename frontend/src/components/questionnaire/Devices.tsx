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
import {
  handleWholeNumberChange,
  handleWholeNumberPaste,
  preventWholeNumberKeys,
} from '@/lib/numberInput'

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
                min="0"
                max="9999"
                step="1"
                placeholder="Enter a number"
                aria-invalid={fieldState.invalid}
                onKeyDown={preventWholeNumberKeys}
                onPaste={handleWholeNumberPaste}
                onChange={(e) => handleWholeNumberChange(e.target.value, onChange)}
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
                min="0"
                max="9999"
                step="1"
                placeholder="Enter a number"
                aria-invalid={fieldState.invalid}
                onKeyDown={preventWholeNumberKeys}
                onPaste={handleWholeNumberPaste}
                onChange={(e) => handleWholeNumberChange(e.target.value, onChange)}
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
                  min="0"
                  max="9999"
                  step="1"
                  placeholder="Enter a number"
                  aria-invalid={fieldState.invalid}
                  onKeyDown={preventWholeNumberKeys}
                  onPaste={handleWholeNumberPaste}
                  onChange={(e) => handleWholeNumberChange(e.target.value, onChange)}
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
                  min="0"
                  max="9999"
                  step="1"
                  placeholder="Enter a number"
                  aria-invalid={fieldState.invalid}
                  onKeyDown={preventWholeNumberKeys}
                  onPaste={handleWholeNumberPaste}
                  onChange={(e) => handleWholeNumberChange(e.target.value, onChange)}
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