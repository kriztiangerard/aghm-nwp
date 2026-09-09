function ProjectBasics() {
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
        />
      </div>

      <div>
        <label htmlFor="locations">
          Number of business locations
        </label>

        <select id="locations">
          <option value="one">One site</option>
          <option value="multiple">Two or more sites</option>
        </select>
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
        />
      </div>
    </section>
  );
}

export default ProjectBasics;