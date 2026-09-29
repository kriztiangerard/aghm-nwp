import { Controller, useFieldArray, useFormContext } from 'react-hook-form'

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
  SelectValue,
  Button,
} from '@/components/ui/form-ui'

function PhysicalSpace() {
  const { control, watch } = useFormContext()

  const largeRoomsAnswer = watch(
    'physicalSpace.largeGroupRooms.hasLargeGroupRooms',
  )

  const floorsCount = watch('physicalSpace.numberOfFloors')

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'physicalSpace.largeGroupRooms.rooms',
  })

  const floorOptions = Array.from(
    {
      length: Number(floorsCount) > 0 ? Number(floorsCount) : 0,
    },
    (_, index) => index + 1,
  )

  return (
    <FieldSet>
      <FieldLegend>Physical Space</FieldLegend>

      <FieldGroup>
        <Controller
          name="physicalSpace.numberOfFloors"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Number of floors
              </FieldLabel>

              <Input
                {...field}
                id={field.name}
                type="number"
                min="1"
                placeholder="Enter number of floors"
                aria-invalid={fieldState.invalid}
                onChange={(event) =>
                  field.onChange(event.target.valueAsNumber)
                }
              />

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="physicalSpace.floorAreaPerFloor"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Approximate floor area per floor (sqm)
              </FieldLabel>

              <FieldDescription>
                Enter the approximate area of one floor in square meters.
              </FieldDescription>

              <Input
                {...field}
                id={field.name}
                type="number"
                min="1"
                placeholder="Enter area in square meters"
                aria-invalid={fieldState.invalid}
                value={field.value ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  field.onChange(
                    value === '' ? undefined : event.target.valueAsNumber,
                  )
                }}
              />

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="physicalSpace.roomsPerFloor"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Number of rooms/work areas per floor
              </FieldLabel>

              <Input
                {...field}
                id={field.name}
                type="number"
                min="1"
                placeholder="Enter number of rooms"
                aria-invalid={fieldState.invalid}
                onChange={(event) =>
                  field.onChange(event.target.valueAsNumber)
                }
              />

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="physicalSpace.largeGroupRooms.hasLargeGroupRooms"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Are there large-group rooms?
              </FieldLabel>

              <FieldDescription>
                These are rooms used for meetings, training, or events
                that can accommodate many people.
              </FieldDescription>

              <Select
                value={field.value ? 'yes' : 'no'}
                onValueChange={(value) =>
                  field.onChange(value === 'yes')
                }
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select an answer" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        {largeRoomsAnswer && (
          <FieldSet>
            <FieldLegend variant="label">
              Large-group rooms
            </FieldLegend>

            <FieldDescription>
              Add each large-group room, including its floor and maximum
              capacity.
            </FieldDescription>

            <FieldGroup>
              {fields.map((item, index) => (
                <Field key={item.id} orientation="horizontal">
                  <Controller
                    name={`physicalSpace.largeGroupRooms.rooms.${index}.floor`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          Floor
                        </FieldLabel>

                        <Select
                          value={
                            field.value
                              ? String(field.value)
                              : undefined
                          }
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          disabled={floorOptions.length === 0}
                        >
                          <SelectTrigger
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                          >
                            <SelectValue
                              placeholder={
                                floorOptions.length === 0
                                  ? 'Enter floors above first'
                                  : 'Select floor'
                              }
                            />
                          </SelectTrigger>

                          <SelectContent>
                            {floorOptions.map((floorNumber) => (
                              <SelectItem
                                key={floorNumber}
                                value={String(floorNumber)}
                              >
                                Floor {floorNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    name={`physicalSpace.largeGroupRooms.rooms.${index}.capacity`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          Capacity (people)
                        </FieldLabel>

                        <Input
                          {...field}
                          id={field.name}
                          type="number"
                          min="1"
                          placeholder="Enter capacity"
                          aria-invalid={fieldState.invalid}
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ''
                                ? undefined
                                : event.target.valueAsNumber,
                            )
                          }
                        />

                        {fieldState.invalid && (
                          <FieldError
                            errors={[fieldState.error]}
                          />
                        )}
                      </Field>
                    )}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </Field>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    floor: undefined,
                    capacity: undefined,
                  })
                }
              >
                Add room
              </Button>
            </FieldGroup>
          </FieldSet>
        )}
      </FieldGroup>
    </FieldSet>
  )
}

export default PhysicalSpace