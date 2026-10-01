import { Controller, useFormContext } from 'react-hook-form'

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
  const { control } = useFormContext()

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
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  {field.value ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
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

        <Controller
          name="existingNetwork.equipment.routerModem"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Roughly what do you have? (check all that apply)
              </FieldLabel>

              <FieldDescription>
                This refers to the main equipment that connects your
                site to the internet.
              </FieldDescription>

              <Select
                value={field.value === undefined ? '' : field.value ? 'yes' : 'no'}
                onValueChange={(value) =>
                  field.onChange(value === 'yes')
                }
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  {field.value !== undefined ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select an answer
                    </span>
                  )}
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

        <Controller
          name="existingNetwork.equipment.switches.quantity"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                How many network switches do you already have?
              </FieldLabel>

              <FieldDescription>
                Switches connect devices within your network and help
                route traffic between them.
              </FieldDescription>

              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  {field.value ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
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
                  <SelectItem value="not_sure">
                    Not sure
                  </SelectItem>
                </SelectContent>
              </Select>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="existingNetwork.equipment.wifiAccessPoints.quantity"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                How many Wi-Fi access points do you already have?
              </FieldLabel>

              <FieldDescription>
                These are the wireless devices that extend Wi-Fi
                coverage across your space.
              </FieldDescription>

              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  {field.value ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
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
                  <SelectItem value="not_sure">
                    Not sure
                  </SelectItem>
                </SelectContent>
              </Select>

              {fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="existingNetwork.equipment.cablingAlreadyRun"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Is there existing network cabling in the walls or ceiling?
              </FieldLabel>

              <Select
                value={field.value === undefined ? '' : field.value ? 'yes' : 'no'}
                onValueChange={(value) =>
                  field.onChange(value === 'yes')
                }
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  {field.value !== undefined ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select an answer
                    </span>
                  )}
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

        <Controller
          name="existingNetwork.equipment.otherOrUnknown"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Do you have other existing network equipment?
              </FieldLabel>

              <FieldDescription>
                Select Yes if you have equipment that is not listed
                above or you are unsure what equipment you have.
              </FieldDescription>

              <Select
                value={field.value === undefined ? '' : field.value ? 'yes' : 'no'}
                onValueChange={(value) =>
                  field.onChange(value === 'yes')
                }
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  {field.value !== undefined ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Select an answer
                    </span>
                  )}
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
                >
                  {field.value ? (
                    <span className="flex-1 text-left">
                      {formatSelectLabel(field.value)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
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
      </FieldGroup>
    </FieldSet>
  )
}

export default ExistingEnvironment