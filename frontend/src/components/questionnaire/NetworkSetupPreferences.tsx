import { useFormContext } from 'react-hook-form'

function NetworkSetupPreferences() {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  return (
    <section>
      <h2>Section F — Network Setup Preferences</h2>

      <div>
        <label htmlFor="guestWifi">
          Do you need Guest Wi-Fi?
        </label>

        <select
          id="guestWifi"
          {...register('guestWifi')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>

        {errors.guestWifi && (
          <p>{errors.guestWifi.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="sensitiveData">
          Does the business handle sensitive data?
        </label>

        <select
          id="sensitiveData"
          {...register('sensitiveData')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
          <option value="not-sure">Not sure</option>
        </select>

        {errors.sensitiveData && (
          <p>{errors.sensitiveData.message as string}</p>
        )}
      </div>

      <div>
        <p>Main network usage:</p>

        <label>
          <input
            type="checkbox"
            value="video-conferencing"
            {...register('usage')}
          />
          Video conferencing
        </label>

        <label>
          <input
            type="checkbox"
            value="voip"
            {...register('usage')}
          />
          VoIP
        </label>

        <label>
          <input
            type="checkbox"
            value="pos"
            {...register('usage')}
          />
          POS/Payment
        </label>

        <label>
          <input
            type="checkbox"
            value="cloud"
            {...register('usage')}
          />
          Cloud storage
        </label>

        <label>
          <input
            type="checkbox"
            value="erp"
            {...register('usage')}
          />
          ERP/Accounting
        </label>

        <label>
          <input
            type="checkbox"
            value="streaming"
            {...register('usage')}
          />
          Streaming/Downloads
        </label>

        <label>
          <input
            type="checkbox"
            value="security"
            {...register('usage')}
          />
          Security camera viewing/recording
        </label>

        <label>
          <input
            type="checkbox"
            value="basic"
            {...register('usage')}
          />
          Basic browsing
        </label>

        {errors.usage && (
          <p>{errors.usage.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="equipmentHousing">
          Where should the main network equipment be housed?
        </label>

        <select
          id="equipmentHousing"
          {...register('equipmentHousing')}
        >
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

        {errors.equipmentHousing && (
          <p>{errors.equipmentHousing.message as string}</p>
        )}
      </div>
    </section>
  )
}

export default NetworkSetupPreferences