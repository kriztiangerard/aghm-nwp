import { Route, Routes } from 'react-router-dom'
import SplashPage from './SplashPage'
import Questionnaire from './components/questionnaire/Questionnaire'
import Comparison from './components/comparison/Comparison'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/questionnaire" element={<Questionnaire />} />
      <Route path="/comparison" element={<Comparison />} />
    </Routes>
  )
}

export default App