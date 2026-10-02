import { FileText } from 'lucide-react'
import { useFormContext } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { getSummarySections, SECTION_TITLES } from '../../lib/summary'

type SummaryPanelProps = {
  sectionKey?: keyof typeof SECTION_TITLES
}

function SummaryPanel({ sectionKey }: SummaryPanelProps) {
  const { watch } = useFormContext()
  const formData = watch()
  const sections = getSummarySections(formData, sectionKey)

  return (
    <aside
      aria-labelledby="section-summary-title"
      className="flex max-h-[calc(100dvh-6rem)] min-h-[18rem] flex-col overflow-hidden border border-border/70 bg-background p-4 shadow-sm lg:sticky lg:top-8"
    >
      <div className="mb-4 flex items-center gap-3 border-b border-border/70 pb-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <h2 id="section-summary-title" className="text-lg font-semibold text-foreground">
          Section Summary
        </h2>
      </div>

      <div
            className="space-y-5 overflow-y-auto"
            aria-live="polite"
            aria-atomic="false"
          >
        {sections.length === 0 ? (
          <div
              role="status"
              className="rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-4 text-sm text-muted-foreground"
            >
              Your answers will appear here
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {section.title}
              </h3>

              <dl className="space-y-3">
                {section.items.map((item, index) => (
                  <div key={item.id ?? `${section.title}-${item.label}-${index}`} className="space-y-1">
                    <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd>
                      {Array.isArray(item.value) ? (
                        <div className="flex flex-wrap gap-2">
                          {item.value.map((valueItem) => (
                            <Badge key={`${item.label}-${valueItem}`}>{valueItem}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-foreground">{item.value}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))
        )}
      </div>
    </aside>
  )
}

export default SummaryPanel
export { getSummarySections }
