import { Route, Routes } from 'react-router-dom'
import SplashPage from './SplashPage'
import Questionnaire from './components/questionnaire/Questionnaire'
import Comparison from './components/comparison/Comparison'
import { lazy, Suspense } from "react";

const ComparisonDev = lazy(() => import("@/components/comparison/ComparisonDev"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/comparison" element={<Comparison />} />

        {/* Dev-only route */}
        {import.meta.env.DEV && (
          <Route path="/dev/comparison" element={<ComparisonDev />} />
        )}
      </Routes>
    </Suspense>
  )
}

export default App