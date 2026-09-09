import { useFormContext } from 'react-hook-form'

function PhysicalSpace() {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  return (
    <section>
      <h2>Section B — Physical Space</h2>

      <div>
        <label htmlFor="floors">
          Number of floors
        </label>

        <input
          id="floors"
          type="number"
          min="1"
          placeholder="Enter number of floors"
          {...register('floors')}
        />

        {errors.floors && (
          <p>{errors.floors.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="floorArea">
          Approximate floor area per floor (sqm)
        </label>

        <input
          id="floorArea"
          type="number"
          min="1"
          placeholder="Enter area in square meters"
          {...register('floorArea')}
        />

        {errors.floorArea && (
          <p>{errors.floorArea.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="rooms">
          Number of rooms/work areas per floor
        </label>

        <input
          id="rooms"
          type="number"
          min="1"
          placeholder="Enter number of rooms"
          {...register('rooms')}
        />

        {errors.rooms && (
          <p>{errors.rooms.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="largeRooms">
          Are there large-group rooms?
        </label>

        <select
          id="largeRooms"
          {...register('largeRooms')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>

        {errors.largeRooms && (
          <p>{errors.largeRooms.message as string}</p>
        )}
      </div>
    </section>
  )
}

export default PhysicalSpace