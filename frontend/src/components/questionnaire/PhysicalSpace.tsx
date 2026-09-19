import { Controller, useFieldArray, useFormContext } from 'react-hook-form'

import {
  FieldSet, FieldLegend, FieldGroup,
  Field, FieldLabel, FieldDescription, FieldError,
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Button,
} from "@/components/ui/form-ui"

function PhysicalSpace() {
  const { control, watch } = useFormContext()

  const largeRoomsAnswer = watch('largeRooms')

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'largeRoomDetails',
  })
  
  const floorsCount = watch('floors')

  const floorOptions = Array.from(
    { length: Number(floorsCount) > 0 ? Number(floorsCount) : 0 },
    (_, i) => i + 1
  )

  return (
    <FieldSet>
      <FieldLegend>Physical Space</FieldLegend>

      <FieldGroup>
        <Controller
          name="floors"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Number of floors</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                min="1"
                placeholder="Enter number of floors"
                aria-invalid={fieldState.invalid}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="floorArea"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Approximate floor area per floor (sqm)
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                min="1"
                placeholder="Enter area in square meters"
                aria-invalid={fieldState.invalid}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="rooms"
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
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="largeRooms"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Are there large-group rooms?</FieldLabel>
              <FieldDescription>
                Rooms used for meetings, training, or events with more than a handful of people.
              </FieldDescription>
              <Select name={field.name} value={field.value} onValueChange={field.onChange}>
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

        {largeRoomsAnswer === 'yes' && (
          <FieldSet>
            <FieldLegend variant="label">Large-group rooms</FieldLegend>
            <FieldDescription>
              List each large-group room, its floor, and how many people it can hold.
            </FieldDescription>

            <FieldGroup>
              {fields.map((item, index) => (
                <Field key={item.id} orientation="horizontal">
                  <Controller
                    name={`largeRoomDetails.${index}.floor`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Floor</FieldLabel>
                        <Select
                          name={field.name}
                          value={field.value ? String(field.value) : undefined}
                          onValueChange={(value) => field.onChange(Number(value))}
                          disabled={floorOptions.length === 0}
                        >
                          <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                            <SelectValue placeholder={floorOptions.length === 0 ? "Enter floors above first" : "Select floor"} />
                          </SelectTrigger>
                          <SelectContent>
                            {floorOptions.map((floorNum) => (
                              <SelectItem key={floorNum} value={String(floorNum)}>
                                Floor {floorNum}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name={`largeRoomDetails.${index}.capacity`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Capacity (people)</FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          type="number"
                          aria-invalid={fieldState.invalid}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Button type="button" variant="outline" onClick={() => remove(index)}>
                    Remove
                  </Button>
                </Field>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ floor: undefined, capacity: undefined })}
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