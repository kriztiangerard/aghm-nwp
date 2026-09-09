import { Route, Routes, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import './App.css'

function SplashPage() {
  const navigate = useNavigate()

  return (
    <main>
      <h1>Network Generation Tool</h1>

      <p>
        A network generation tool designed to help small and medium-sized
        enterprises plan suitable network solutions.
      </p>

      <Button onClick={() => navigate('/questionnaire')}>
        Start Network Generation
      </Button>
    </main>
  )
}

function QuestionnairePage() {
  return (
    <main>
      <h1>Questionnaire</h1>
      <p>This is the first step of the network requirements questionnaire.</p>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/questionnaire" element={<QuestionnairePage />} />
    </Routes>
  )
}

export default App