import { useFormContext } from 'react-hook-form'

function InternetConnection() {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  return (
    <section>
      <h2>Section D — Internet Connection</h2>

      <div>
        <label htmlFor="internetSpeed">
          Current internet speed (Mbps)
        </label>

        <input
          id="internetSpeed"
          type="number"
          min="1"
          placeholder="Enter Mbps"
          {...register('internetSpeed')}
        />

        {errors.internetSpeed && (
          <p>{errors.internetSpeed.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="connectionType">
          Internet connection type
        </label>

        <select
          id="connectionType"
          {...register('connectionType')}
        >
          <option value="fiber">Fiber</option>
          <option value="dsl">DSL</option>
          <option value="wireless">Wireless/Cellular</option>
          <option value="not-checked">Not checked</option>
        </select>

        {errors.connectionType && (
          <p>{errors.connectionType.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="downtime">
          How much does internet downtime matter?
        </label>

        <select
          id="downtime"
          {...register('downtime')}
        >
          <option value="wait">
            We can wait it out
          </option>
          <option value="same-day">
            It matters if it lasts the whole day
          </option>
          <option value="critical">
            Every minute matters
          </option>
        </select>

        {errors.downtime && (
          <p>{errors.downtime.message as string}</p>
        )}
      </div>
    </section>
  )
}

export default InternetConnection