import { useFormContext } from 'react-hook-form'
import { FileText, AlertCircle } from 'lucide-react'

import { Separator } from '@/components/ui/separator'
import { getSummarySections } from '../../lib/summary'

function OverallSummary() {
  const { watch } = useFormContext()
  const values = watch()
  const sections = getSummarySections(values)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-2 py-4 sm:px-4 text-left">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Overall Summary
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Review all questionnaire answers before submitting.
        </p>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl space-y-6">
        {sections.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-6 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">No information provided.</p>
          </div>
        ) : (
          sections.map((section, index) => (
            <div key={section.title} className="space-y-6">
              
              {/* Divider per section (skips the first one) */}
              {index > 0 && <Separator className="bg-border/60" />}

              <div>
                {/* Section Header */}
                <div className="flex items-center gap-2 pb-4">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {section.title}
                  </h3>
                </div>

                {/* Section Items */}
                <dl className="space-y-4 pl-7">
                  {section.items.length > 0 ? (
                    section.items.map((item, itemIndex) => (
                      <div
                        key={item.id ?? `${section.title}-${item.label}-${itemIndex}`}
                        className="grid gap-1 sm:grid-cols-[minmax(0,220px)_1fr]"
                      >
                        <dt className="text-sm font-medium text-foreground">
                          {item.label}
                        </dt>
                        <dd className="text-sm text-muted-foreground">
                          {Array.isArray(item.value)
                            ? item.value.join(', ')
                            : item.value || 'Not provided'}
                        </dd>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      Not provided
                    </p>
                  )}
                </dl>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default OverallSummary