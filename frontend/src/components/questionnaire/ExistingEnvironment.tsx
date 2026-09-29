
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
  SelectValue,
} from '@/components/ui/form-ui'

function ExistingEnvironment() {
  const { control } = useFormContext()

  return (
    <FieldSet>
      <FieldLegend>What's Already There</FieldLegend>

      <FieldGroup>
        <Controller
          name="existingNetwork.equipmentStatus"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Do you already have network equipment?
              </FieldLabel>

              <FieldDescription>
                This includes routers, switches, or Wi-Fi access points
                that are already being used.
              </FieldDescription>

              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select an answer" />
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
                Do you have an existing router or modem?
              </FieldLabel>

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

        <Controller
          name="existingNetwork.equipment.switches.quantity"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                How many network switches do you already have?
              </FieldLabel>

              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select a quantity" />
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
                Wi-Fi access points provide wireless network coverage
                for phones, laptops, tablets, and other devices.
              </FieldDescription>

              <Select
                value={field.value ?? ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select a quantity" />
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
                Has network cabling already been installed?
              </FieldLabel>

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

        <Controller
          name="existingNetwork.existingCabling"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                What type of network cabling is already installed?
              </FieldLabel>

              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select an answer" />
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