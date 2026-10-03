import { useEffect } from 'react'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'

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
  SelectValue,
  Button,
} from "@/components/ui/form-ui"
import {
  handleWholeNumberChange,
  handleWholeNumberPaste,
  preventWholeNumberKeys,
} from '@/lib/numberInput'

function PhysicalSpace() {
  const { control, watch, setValue, clearErrors } = useFormContext()

  const largeRoomsAnswer = watch('physicalSpace.largeGroupRooms.hasLargeGroupRooms')
  const isLargeRoomsSelected = largeRoomsAnswer === true
  const floorsCount = watch('physicalSpace.numberOfFloors')

  const { fields, append, remove, replace } = useFieldArray<any>({
    control,
    name: 'physicalSpace.largeGroupRooms.rooms' as any,
  })

  const floorOptions = Array.from(
    {
      length:
        Number(floorsCount) > 0
          ? Number(floorsCount)
          : 0,
    },
    (_, i) => i + 1
  )

  /*
   * If the user changes the answer from Yes to No,
   * remove the large-room details because they are no longer relevant.
   */
  useEffect(() => {
    if (largeRoomsAnswer === false) {
      replace([])
      setValue('physicalSpace.largeGroupRooms.rooms', undefined, {
        shouldDirty: true,
        shouldValidate: false,
      })
      clearErrors('physicalSpace.largeGroupRooms')
    }
  }, [clearErrors, largeRoomsAnswer, replace, setValue])

  /*
   * If the number of floors is reduced, remove any room
   * that refers to a floor that no longer exists.
   */
  useEffect(() => {
    const numberOfFloors = Number(floorsCount)

    if (!numberOfFloors || numberOfFloors < 1) {
      return
    }

    fields.forEach((room, index) => {
      const roomFloor = Number(
        (room as { floor?: number | string }).floor
      )

      if (roomFloor > numberOfFloors) {
        setValue(
          `largeRoomDetails.${index}.floor`,
          undefined,
          {
            shouldValidate: true,
            shouldDirty: true,
          }
        )
      }
    })
  }, [floorsCount, fields, setValue])

  return (
    <FieldSet>
      <FieldLegend>Physical Space</FieldLegend>

      <FieldGroup>
        {/* NUMBER OF FLOORS */}
        <Controller
          name="physicalSpace.numberOfFloors"
          control={control}
          render={({
            field: { value, onChange, ...field },
            fieldState,
          }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Number of floors this network will cover
              </FieldLabel>

              <Input
                {...field}
                value={value ?? ''}
                id={field.name}
                type="number"
                inputMode="numeric"
                min={QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.min}
                max={QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.max}
                step="1"
                placeholder="Enter number of floors"
                aria-invalid={fieldState.invalid}
                onKeyDown={preventWholeNumberKeys}
                onPaste={(e) => {
                  handleWholeNumberPaste(
                    e,
                    QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.min,
                    QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.max,
                  )
                }}
                onChange={(e) => {
                  handleWholeNumberChange(
                    e.target.value,
                    onChange,
                    QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.min,
                    QUESTIONNAIRE_LIMITS.physicalSpace.numberOfFloors.max,
                  )
                }}
              />

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />

        {/* FLOOR AREA */}
        <Controller
          name="physicalSpace.floorAreaPerFloor"
          control={control}
          render={({
            field: { value, onChange, ...field },
            fieldState,
          }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Approximate floor area per floor, in square meters, if known
              </FieldLabel>

              <FieldDescription>
                Not sure? If you truly do not know, skip this and we will estimate it from
                the room count below.
              </FieldDescription>

              <Input
                {...field}
                value={value ?? ''}
                id={field.name}
                type="number"
                inputMode="numeric"
                min={QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.min}
                max={QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.max}
                step="1"
                placeholder="Enter area in square meters"
                aria-invalid={fieldState.invalid}
                onKeyDown={preventWholeNumberKeys}
                onPaste={(e) => {
                  handleWholeNumberPaste(
                    e,
                    QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.min,
                    QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.max,
                  )
                }}
                onChange={(e) => {
                  handleWholeNumberChange(
                    e.target.value,
                    onChange,
                    QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.min,
                    QUESTIONNAIRE_LIMITS.physicalSpace.floorAreaPerFloor.max,
                  )
                }}
              />

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />

        {/* ROOMS */}
        <Controller
          name="physicalSpace.roomsPerFloor"
          control={control}
          render={({
            field: { value, onChange, ...field },
            fieldState,
          }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Roughly how many separate rooms or work areas per floor?
              </FieldLabel>

              <Input
                {...field}
                value={value ?? ''}
                id={field.name}
                type="number"
                inputMode="numeric"
                min={QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.min}
                max={QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.max}
                step="1"
                placeholder="Enter number of rooms"
                aria-invalid={fieldState.invalid}
                onKeyDown={preventWholeNumberKeys}
                onPaste={(e) => {
                  handleWholeNumberPaste(
                    e,
                    QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.min,
                    QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.max,
                  )
                }}
                onChange={(e) => {
                  handleWholeNumberChange(
                    e.target.value,
                    onChange,
                    QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.min,
                    QUESTIONNAIRE_LIMITS.physicalSpace.roomsPerFloor.max,
                  )
                }}
              />

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />

        {/* LARGE-GROUP ROOMS */}
        <Controller
          name="physicalSpace.largeGroupRooms.hasLargeGroupRooms"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Are there any rooms where large groups of people will congregate?
              </FieldLabel>

              <FieldDescription>
                Think of large meeting rooms, training rooms, or event spaces.
              </FieldDescription>

              <Select
                value={field.value === undefined ? '' : field.value ? 'yes' : 'no'}
                onValueChange={(value) => field.onChange(value === 'yes')}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  {field.value !== undefined ? (
                    <span className="flex-1 text-left">
                      {field.value ? 'Yes' : 'No'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select an answer</span>
                  )}
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="no">
                    No
                  </SelectItem>

                  <SelectItem value="yes">
                    Yes
                  </SelectItem>
                </SelectContent>
              </Select>

              {fieldState.invalid && (
                <FieldError
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />

        {/* LARGE-GROUP ROOM DETAILS */}
        {isLargeRoomsSelected && (
          <FieldSet>
            <FieldLegend variant="label">
              Large-group rooms
            </FieldLegend>

            <FieldDescription>
              List each large-group room, its floor,
              and how many people it can hold.
            </FieldDescription>

            <FieldGroup>
              {fields.map((item, index) => (
                <Field
                  key={item.id}
                  orientation="horizontal"
                >
                  {/* FLOOR */}
                  <Controller
                    name={`physicalSpace.largeGroupRooms.rooms.${index}.floor`}
                    control={control}
                    render={({
                      field,
                      fieldState,
                    }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>
                          Floor
                        </FieldLabel>

                        <Select
                          value={
                            field.value !== undefined &&
                            field.value !== null
                              ? String(field.value)
                              : ''
                          }
                          onValueChange={(value) => {
                            field.onChange(
                              Number(value)
                            )
                          }}
                          disabled={
                            floorOptions.length === 0
                          }
                        >
                          <SelectTrigger
                            id={field.name}
                            aria-invalid={
                              fieldState.invalid
                            }
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
                            {floorOptions.map(
                              (floorNum) => (
                                <SelectItem
                                  key={floorNum}
                                  value={String(
                                    floorNum
                                  )}
                                >
                                  Floor {floorNum}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>

                        {fieldState.invalid && (
                          <FieldError
                            errors={[
                              fieldState.error,
                            ]}
                          />
                        )}
                      </Field>
                    )}
                  />

                  {/* CAPACITY */}
                  <Controller
                    name={`physicalSpace.largeGroupRooms.rooms.${index}.capacity`}
                    control={control}
                    render={({
                      field: {
                        value,
                        onChange,
                        ...field
                      },
                      fieldState,
                    }) => (
                      <Field
                        data-invalid={
                          fieldState.invalid
                        }
                      >
                        <FieldLabel htmlFor={field.name}>
                          Capacity (people)
                        </FieldLabel>

                        <Input
                          {...field}
                          value={value ?? ''}
                          id={field.name}
                          type="number"
                          inputMode="numeric"
                          min={QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.min}
                          max={QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.max}
                          step="1"
                          placeholder="Enter capacity"
                          aria-invalid={
                            fieldState.invalid
                          }
                          onKeyDown={preventWholeNumberKeys}
                          onPaste={(e) => {
                            handleWholeNumberPaste(
                              e,
                              QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.min,
                              QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.max,
                            )
                          }}
                          onChange={(e) => {
                            handleWholeNumberChange(
                              e.target.value,
                              onChange,
                              QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.min,
                              QUESTIONNAIRE_LIMITS.physicalSpace.largeGroupRooms.capacity.max,
                            )
                          }}
                        />

                        {fieldState.invalid && (
                          <FieldError
                            errors={[
                              fieldState.error,
                            ]}
                          />
                        )}
                      </Field>
                    )}
                  />

                  {/* REMOVE */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </Button>
                </Field>
              ))}

              {/* ADD ROOM */}
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
