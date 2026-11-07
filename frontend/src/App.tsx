import { Route, Routes } from 'react-router-dom'
import SplashPage from './SplashPage'
import Questionnaire from './components/questionnaire/Questionnaire'
import ComparisonRoute from './components/comparison/comparison-route'
import { SelectedPlanProvider } from './components/comparison/selected-plan-context'
import { lazy, Suspense } from "react";
import Report from './components/report/Report'

const ComparisonDev = lazy(() => import("@/components/comparison/ComparisonDev"));

function App() {
  return (
    <SelectedPlanProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/comparison" element={<ComparisonRoute />} />
          <Route path="/report" element={<Report />} />
          {/* Dev-only route */}
          {import.meta.env.DEV && (
            <Route path="/dev/comparison" element={<ComparisonDev />} />
          )}
        </Routes>
      </Suspense>
    </SelectedPlanProvider>
  )
}

export default App