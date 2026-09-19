import { Route, Routes } from 'react-router-dom'
import SplashPage from './SplashPage'
import Questionnaire from './components/questionnaire/Questionnaire'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/questionnaire" element={<Questionnaire />} />
    </Routes>
  )
}

export default App