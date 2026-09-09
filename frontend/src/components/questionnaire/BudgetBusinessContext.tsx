import { useFormContext } from 'react-hook-form'

function BudgetBusinessContext() {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  return (
    <section>
      <h2>Section G — Budget & Business Context</h2>

      <div>
        <label htmlFor="budget">
          Monthly IT spending budget
        </label>

        <select
          id="budget"
          {...register('budget')}
        >
          <option value="under-15k">Under ₱15,000</option>
          <option value="15k-40k">₱15,000–₱40,000</option>
          <option value="over-40k">Over ₱40,000</option>
        </select>

        {errors.budget && (
          <p>{errors.budget.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="itSupport">
          IT support
        </label>

        <select
          id="itSupport"
          {...register('itSupport')}
        >
          <option value="none">No dedicated IT support</option>
          <option value="outside">Outside person/company</option>
          <option value="in-house">In-house IT</option>
        </select>

        {errors.itSupport && (
          <p>{errors.itSupport.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="electricity">
          Electricity reliability
        </label>

        <select
          id="electricity"
          {...register('electricity')}
        >
          <option value="stable">Stable</option>
          <option value="outages">
            Frequent brownouts/outages
          </option>
        </select>

        {errors.electricity && (
          <p>{errors.electricity.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="growth">
          Do you expect business growth in the next 1–2 years?
        </label>

        <select
          id="growth"
          {...register('growth')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>

        {errors.growth && (
          <p>{errors.growth.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="growthRate">
          Expected headcount growth
        </label>

        <select
          id="growthRate"
          {...register('growthRate')}
        >
          <option value="0-10">0–10%</option>
          <option value="11-30">11–30%</option>
          <option value="31-plus">31%+</option>
        </select>

        {errors.growthRate && (
          <p>{errors.growthRate.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="additionalSites">
          Expected additional sites
        </label>

        <select
          id="additionalSites"
          {...register('additionalSites')}
        >
          <option value="none">None</option>
          <option value="one">1</option>
          <option value="two-plus">2+</option>
        </select>

        {errors.additionalSites && (
          <p>{errors.additionalSites.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="management">
          Preferred network management
        </label>

        <select
          id="management"
          {...register('management')}
        >
          <option value="simple">
            Simple app/web dashboard
          </option>
          <option value="technical">
            Traditional CLI/technical
          </option>
          <option value="not-sure">
            Not sure
          </option>
        </select>

        {errors.management && (
          <p>{errors.management.message as string}</p>
        )}
      </div>
    </section>
  )
}

export default BudgetBusinessContext