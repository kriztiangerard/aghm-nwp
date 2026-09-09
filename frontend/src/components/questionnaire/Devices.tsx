import { useFormContext } from 'react-hook-form'

function Devices() {
  const {
    register,
    formState: { errors },
  } = useFormContext()

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
          {...register('wiredDevices')}
        />

        {errors.wiredDevices && (
          <p>{errors.wiredDevices.message as string}</p>
        )}
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
          {...register('wifiDevices')}
        />

        {errors.wifiDevices && (
          <p>{errors.wifiDevices.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="voip">
          Do you use VoIP phones?
        </label>

        <select
          id="voip"
          {...register('voip')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>

        {errors.voip && (
          <p>{errors.voip.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="cameras">
          Do you use IP cameras?
        </label>

        <select
          id="cameras"
          {...register('cameras')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>

        {errors.cameras && (
          <p>{errors.cameras.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="otherDevices">
          Other network-connected devices
        </label>

        <input
          id="otherDevices"
          type="text"
          placeholder="Enter other devices"
          {...register('otherDevices')}
        />

        {errors.otherDevices && (
          <p>{errors.otherDevices.message as string}</p>
        )}
      </div>
    </section>
  )
}

export default Devices