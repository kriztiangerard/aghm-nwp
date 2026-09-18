import { Controller, useFormContext } from 'react-hook-form'

import {
  FieldSet, FieldLegend, FieldGroup,
  Field, FieldLabel, FieldError,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/form-ui"

function BudgetBusinessContext() {
  const { control } = useFormContext()

  const fields = [
    { name: 'itSupport', label: 'IT support', options: [['none', 'No dedicated IT support'], ['outside', 'Outside person/company'], ['in-house', 'In-house IT']] },
    { name: 'electricity', label: 'Electricity reliability', options: [['stable', 'Stable'], ['outages', 'Frequent brownouts/outages']] },
    { name: 'growth', label: 'Do you expect business growth in the next 1–2 years?', options: [['no', 'No'], ['yes', 'Yes']] },
    { name: 'growthRate', label: 'Expected headcount growth', options: [['0-10', '0–10%'], ['11-30', '11–30%'], ['31-plus', '31%+']] },
    { name: 'additionalSites', label: 'Expected additional sites', options: [['none', 'None'], ['one', '1'], ['two-plus', '2+']] },
    { name: 'management', label: 'Preferred network management', options: [['simple', 'Simple app/web dashboard'], ['technical', 'Traditional CLI/technical'], ['not-sure', 'Not sure']] },
  ] as const

  return (
    <FieldSet>
      <FieldLegend>Budget &amp; Business Context</FieldLegend>

      <FieldGroup>
        {fields.map(({ name, label, options }) => (
          <Controller key={name} name={name} control={control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}><FieldLabel htmlFor={field.name}>{label}</FieldLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue placeholder="Select an option" /></SelectTrigger><SelectContent>{options.map(([value, optionLabel]) => <SelectItem key={value} value={value}>{optionLabel}</SelectItem>)}</SelectContent></Select>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</Field>
          )} />
        ))}
      </FieldGroup>
    </FieldSet>
  )
}

export default BudgetBusinessContext