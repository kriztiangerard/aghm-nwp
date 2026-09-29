import { FileText } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"


function SummaryPanel() {
  return (
    <Card className="flex flex-col overflow-hidden lg:h-[calc(100dvh-6rem)] lg:min-h-[36rem]">
      <CardHeader>
        <h2 id="summary-title" className="text-2xl font-semibold text-foreground">
          Project summary
        </h2>
      </CardHeader>
      <CardContent>
      {/* Placeholder State */}
      <div className="flex items-center justify-start gap-3 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 p-6 text-left text-muted-foreground">
        <FileText className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">
          Your answers will appear here.
        </p>
      </div>
    </CardContent>
    </Card>
  )
}

export default SummaryPanel