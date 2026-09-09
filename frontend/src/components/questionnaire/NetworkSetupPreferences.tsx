function NetworkSetupPreferences() {
  return (
    <section>
      <h2>Section F — Network Setup Preferences</h2>

      <div>
        <label htmlFor="guestWifi">
          Do you need Guest Wi-Fi?
        </label>
        <select id="guestWifi">
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      <div>
        <label htmlFor="sensitiveData">
          Does the business handle sensitive data?
        </label>
        <select id="sensitiveData">
          <option value="no">No</option>
          <option value="yes">Yes</option>
          <option value="not-sure">Not sure</option>
        </select>
      </div>

      <div>
        <p>Main network usage:</p>

        <label>
          <input type="checkbox" value="video-conferencing" />
          Video conferencing
        </label>

        <label>
          <input type="checkbox" value="voip" />
          VoIP
        </label>

        <label>
          <input type="checkbox" value="pos" />
          POS/Payment
        </label>

        <label>
          <input type="checkbox" value="cloud" />
          Cloud storage
        </label>

        <label>
          <input type="checkbox" value="erp" />
          ERP/Accounting
        </label>

        <label>
          <input type="checkbox" value="streaming" />
          Streaming/Downloads
        </label>

        <label>
          <input type="checkbox" value="security" />
          Security camera viewing/recording
        </label>

        <label>
          <input type="checkbox" value="basic" />
          Basic browsing
        </label>
      </div>

      <div>
        <label htmlFor="equipmentHousing">
          Where should the main network equipment be housed?
        </label>

        <select id="equipmentHousing">
          <option value="rack">
            Full-size rack in a dedicated closet/room
          </option>
          <option value="wall-cabinet">
            Wall cabinet
          </option>
          <option value="not-sure">
            Not sure / Recommend
          </option>
        </select>
      </div>
    </section>
  )
}

export default NetworkSetupPreferences