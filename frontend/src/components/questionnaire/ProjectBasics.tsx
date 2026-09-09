import { useFormContext } from 'react-hook-form'

function ProjectBasics() {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  return (
    <section>
      <h2>Section A – Project Basics</h2>

      <div>
        <label htmlFor="companyName">
          Project or company name
        </label>

        <input
          id="companyName"
          type="text"
          placeholder="Enter project or company name"
          {...register('companyName')}
        />

        {errors.companyName && (
          <p>{errors.companyName.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="locations">
          Number of business locations
        </label>

        <select
          id="locations"
          {...register('locations')}
        >
          <option value="one">One site</option>
          <option value="multiple">Two or more sites</option>
        </select>

        {errors.locations && (
          <p>{errors.locations.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="headcount">
          Total number of people who will use this network
        </label>

        <input
          id="headcount"
          type="number"
          min="1"
          max="200"
          placeholder="1–200"
          {...register('headcount')}
        />

        {errors.headcount && (
          <p>{errors.headcount.message as string}</p>
        )}
      </div>
    </section>
  )
}

export default ProjectBasics