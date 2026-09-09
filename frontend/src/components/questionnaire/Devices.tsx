function Devices() {
  return (
    <section>
      <h2>Section E — Devices</h2>

      <div>
        <label htmlFor="wiredDevices">
          Number of wired desktops/laptops
        </label>
        <input
          id="wiredDevices"
          type="number"
          min="0"
          placeholder="Enter number"
        />
      </div>

      <div>
        <label htmlFor="wifiDevices">
          Number of Wi-Fi devices
        </label>
        <input
          id="wifiDevices"
          type="number"
          min="0"
          placeholder="Enter number"
        />
      </div>

      <div>
        <label htmlFor="voip">
          Do you use VoIP phones?
        </label>
        <select id="voip">
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      <div>
        <label htmlFor="cameras">
          Do you use IP cameras?
        </label>
        <select id="cameras">
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      <div>
        <label htmlFor="otherDevices">
          Other network-connected devices
        </label>
        <input
          id="otherDevices"
          type="text"
          placeholder="Enter other devices"
        />
      </div>
    </section>
  )
}

export default Devices