import { useState } from 'react'

import ProjectBasics from './ProjectBasics'
import PhysicalSpace from './PhysicalSpace'
import ExistingEnvironment from './ExistingEnvironment'
import InternetConnection from './InternetConnection'
import Devices from './Devices'
import NetworkSetupPreferences from './NetworkSetupPreferences'
import BudgetBusinessContext from './BudgetBusinessContext'

const steps = [
  ProjectBasics,
  PhysicalSpace,
  ExistingEnvironment,
  InternetConnection,
  Devices,
  NetworkSetupPreferences,
  BudgetBusinessContext,
]

function Questionnaire() {
  const [currentStep, setCurrentStep] = useState(0)

  const CurrentSection = steps[currentStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((step) => step + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
    }
  }

  return (
    <div>
      <CurrentSection />

      <div>
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentStep === steps.length - 1}
        >
          Next
        </button>
      </div>

      <p>
        Step {currentStep + 1} of {steps.length}
      </p>
    </div>
  )
}

export default Questionnaire