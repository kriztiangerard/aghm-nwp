function PhysicalSpace() {
  return (
    <section>
      <h2>Section B — Physical Space</h2>

      <div>
        <label htmlFor="floors">Number of floors</label>
        <input
          id="floors"
          type="number"
          min="1"
          placeholder="Enter number of floors"
        />
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
        />
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
        />
      </div>

      <div>
        <label htmlFor="largeRooms">
          Are there large-group rooms?
        </label>
        <select id="largeRooms">
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
    </section>
  )
}

export default PhysicalSpace