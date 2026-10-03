import { useFormContext } from 'react-hook-form'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getSummarySections } from '../../lib/summary'

function OverallSummary() {
  const { watch } = useFormContext()
  const values = watch()
  const sections = getSummarySections(values)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-2 py-2 sm:px-4">
      <header className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Overall Summary
        </h2>
        <p className="text-sm text-muted-foreground">
          Review all questionnaire answers before submitting.
        </p>
      </header>

      <div className="mx-auto max-w-3xl space-y-4">
        {sections.length === 0 ? (
          <Card className="mx-auto w-full">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">Not provided</p>
            </CardContent>
          </Card>
        ) : (
          sections.map((section) => (
            <Card key={section.title} className="mx-auto w-full max-w-5xl">
              <CardHeader className="pb-3 text-center">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {section.title}
                </h3>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {section.items.length > 0 ? (
                  section.items.map((item, index) => (
                    <div
                      key={item.id ?? `${section.title}-${item.label}-${index}`}
                      className="grid gap-2 border-b border-border/70 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,220px)_1fr]"
                    >
                      <dt className="text-sm font-medium text-foreground">
                        {item.label}
                      </dt>
                      <dd className="text-sm text-muted-foreground">
                        {Array.isArray(item.value) ? item.value.join(', ') : item.value || 'Not provided'}
                      </dd>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not provided</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default OverallSummary
