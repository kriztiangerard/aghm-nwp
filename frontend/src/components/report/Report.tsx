// components/report/ReportRoute.tsx
import { Navigate } from 'react-router-dom'
import { useSelectedPlan } from '../comparison/selected-plan-context'

export default function Report() {
  const { choice, plan } = useSelectedPlan()

  // After a refresh the context is empty, so go back to the start.
  if (!choice || !plan) return <Navigate to="/" replace />

  return (
    <pre>{JSON.stringify({ choice, total: plan.totalCost }, null, 2)}</pre>
    // later: <FinalReport tier={choice.tier} vendor={choice.vendor} plan={plan} />
  )
}