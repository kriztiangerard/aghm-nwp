import { useFormContext } from 'react-hook-form'

function ExistingEnvironment() {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  return (
    <section>
      <h2>Section C — What’s Already There</h2>

      <div>
        <label htmlFor="existingEquipment">
          Do you already have network equipment?
        </label>

        <select
          id="existingEquipment"
          {...register('existingEquipment')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
          <option value="not-sure">Not sure</option>
        </select>

        {errors.existingEquipment && (
          <p>{errors.existingEquipment.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="equipment">
          Existing equipment
        </label>

        <select
          id="equipment"
          {...register('equipment')}
        >
          <option value="router">Router/Modem</option>
          <option value="switch">Switches</option>
          <option value="access-point">Access Points</option>
          <option value="cabling">Network Cabling</option>
          <option value="not-sure">Not sure</option>
        </select>

        {errors.equipment && (
          <p>{errors.equipment.message as string}</p>
        )}
      </div>

      <div>
        <label htmlFor="cabling">
          Existing network cabling
        </label>

        <select
          id="cabling"
          {...register('cabling')}
        >
          <option value="none">None</option>
          <option value="cat5e">Cat5e</option>
          <option value="cat6">Cat6</option>
          <option value="fiber">Fiber</option>
          <option value="not-sure">Not sure</option>
        </select>

        {errors.cabling && (
          <p>{errors.cabling.message as string}</p>
        )}
      </div>
    </section>
  )
}

export default ExistingEnvironment