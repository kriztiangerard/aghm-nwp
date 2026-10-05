import { useEffect } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import {
  FieldSet,
  FieldLegend,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/form-ui'
import { formatSelectLabel } from '@/lib/formatters'

function ExistingEnvironment() {
  const { control, setValue, clearErrors } = useFormContext()
  const equipmentStatus = useWatch({
    control,
    name: 'existingNetwork.equipmentStatus',
  })
  const showEquipmentDetails = equipmentStatus === 'yes'
  const switches = useWatch({
    control,
    name: 'existingNetwork.equipment.switches',
  })
  const wifiAccessPoints = useWatch({
    control,
    name: 'existingNetwork.equipment.wifiAccessPoints',
  })

  useEffect(() => {
    if (!showEquipmentDetails) {
      setValue('existingNetwork.equipment', undefined, {
        shouldDirty: true,
        shouldValidate: false,
      })
      setValue('existingNetwork.existingCabling', undefined, {
        shouldDirty: true,
        shouldValidate: false,
      })

      clearErrors([
        'existingNetwork.equipment',
        'existingNetwork.equipment.routerModem',
        'existingNetwork.equipment.switches',
        'existingNetwork.equipment.switches.quantity',
        'existingNetwork.equipment.wifiAccessPoints',
        'existingNetwork.equipment.wifiAccessPoints.quantity',
        'existingNetwork.equipment.cablingAlreadyRun',
        'existingNetwork.equipment.otherOrUnknown',
        'existingNetwork.existingCabling',
      ])
    }
  }, [clearErrors, setValue, showEquipmentDetails])

  const deviceList = [
    {
      name: 'existingNetwork.equipment.routerModem',
      label: 'Router / Modem',
      hasQuantity: false,
    },
    {
      name: 'existingNetwork.equipment.switches',
      label: 'Switch',
      hasQuantity: true,
    },
    {
      name: 'existingNetwork.equipment.wifiAccessPoints',
      label: 'Wi-Fi Access Point',
      hasQuantity: true,
    },
    {
      name: 'existingNetwork.equipment.cablingAlreadyRun',
      label: 'Cabling already run',
      hasQuantity: false,
    },
    {
      name: 'existingNetwork.equipment.otherOrUnknown',
      label: 'Other / not sure',
      hasQuantity: false,
    },
  ] as const

  return (
    <FieldSet>
      <FieldLegend>Existing Environment</FieldLegend>

      <FieldGroup>
        <Controller
          name="existingNetwork.equipmentStatus"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Is there existing network equipment on site?
              </FieldLabel>

              <FieldDescription>
                This includes routers, switches, and Wi-Fi access points already in use.
              </FieldDescription>

              <Select
                value={field.value ?? ''}
                onValueChange={(value) => {
                  field.onChange(value)
                }}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="text-sm"
                >
                  {field.value ? (
                    <span className="flex-1 text-left text-sm leading-normal">
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm leading-normal">
                      Select an answer
                    </span>
                  )}
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="not_sure">Not sure</SelectItem>
                </SelectContent>
              </Select>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        {showEquipmentDetails && (
          <>
            <Field>
              <FieldLabel>
                Roughly what do you have? (check all that apply)
              </FieldLabel>
              <FieldDescription>
                Select the network equipment already in use at your site.
              </FieldDescription>
              {deviceList.map(({ name, label, hasQuantity }) => (
                <Controller
                  key={name}
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Checkbox
                        id={name}
                        checked={!!field.value}
                        onCheckedChange={(checked) => {
                          const selected = Boolean(checked)
                          if (hasQuantity) {
                            field.onChange(selected ? { quantity: undefined } : undefined)
                            if (!selected) {
                              const quantityName = `${name}.quantity`
                              setValue(quantityName, undefined, {
                                shouldDirty: true,
                                shouldValidate: false,
                              })
                              clearErrors(quantityName)
                            }
                          } else {
                            field.onChange(selected)
                          }
                        }}
                      />
                      <FieldLabel htmlFor={name}>{label}</FieldLabel>
                    </Field>
                  )}
                />
              ))}
            </Field>

            {Boolean(switches) && (
              <Controller
                name="existingNetwork.equipment.switches.quantity"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Roughly how many switches?
                    </FieldLabel>

                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        className="text-sm"
                      >
                        {field.value ? (
                          <span className="flex-1 text-left text-sm leading-normal">
                            {formatSelectLabel(field.value)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm leading-normal">
                            Select a quantity
                          </span>
                        )}
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2-3">2–3</SelectItem>
                        <SelectItem value="more_than_3">
                          More than 3
                        </SelectItem>
                        <SelectItem value="not_sure">Not sure</SelectItem>
                      </SelectContent>
                    </Select>

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}

            {Boolean(wifiAccessPoints) && (
              <Controller
                name="existingNetwork.equipment.wifiAccessPoints.quantity"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Roughly how many WiFi access points?
                    </FieldLabel>

                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        className="text-sm"
                      >
                        {field.value ? (
                          <span className="flex-1 text-left text-sm leading-normal">
                            {formatSelectLabel(field.value)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm leading-normal">
                            Select a quantity
                          </span>
                        )}
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2-3">2–3</SelectItem>
                        <SelectItem value="more_than_3">
                          More than 3
                        </SelectItem>
                        <SelectItem value="not_sure">Not sure</SelectItem>
                      </SelectContent>
                    </Select>

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}

            <Controller
              name="existingNetwork.existingCabling"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    What type of network cabling is already installed?
                  </FieldLabel>

                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      className="text-sm"
                    >
                      {field.value ? (
                        <span className="flex-1 text-left text-sm leading-normal">
                          {formatSelectLabel(field.value)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm leading-normal">
                          Select an answer
                        </span>
                      )}
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="none_or_not_sure">
                        None / Not sure
                      </SelectItem>

                      <SelectItem value="cat5e_or_cat6">
                        Cat5e / Cat6
                      </SelectItem>

                      <SelectItem value="fiber">
                        Fiber
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </>
        )}
      </FieldGroup>
    </FieldSet>
  )
}

export default ExistingEnvironment