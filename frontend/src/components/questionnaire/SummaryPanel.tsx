import { FileText } from 'lucide-react'
import { useFormContext } from 'react-hook-form'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

import { getSummarySections } from '../../lib/summary'

function SummaryPanel() {
  const { watch } = useFormContext()
  const formData = watch()
  const sections = getSummarySections(formData)

  return (
    <Card className="flex flex-col overflow-hidden border-border/70 bg-background shadow-sm lg:h-[calc(100dvh-6rem)] lg:min-h-[36rem]">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <h2 id="summary-title" className="text-xl font-semibold text-foreground">
            Project summary
          </h2>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 overflow-y-auto p-4">
        {sections.length === 0 ? (
          <div className="flex items-center justify-start gap-3 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/40 p-6 text-left text-muted-foreground">
            <FileText className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">Your answers will appear here after submission.</p>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {section.title}
              </h3>

              <ul className="space-y-2.5">
                {section.items.map((item) => (
                  <li
                    key={`${section.title}-${item.label}`}
                    className="rounded-lg border border-border/60 bg-muted/20 p-2.5"
                  >
                    <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm text-foreground">{item.value}</div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default SummaryPanel
export { getSummarySections }
