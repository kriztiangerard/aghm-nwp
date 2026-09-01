# Network Planning Calculator

The Network Planning Calculator is a network planning tool that generates network recommendations based on user-provided requirements. The system supports network recommendation, Bill of Materials (BOM) generation, pricing and cost estimation, network topology generation, and report generation.

## Local Development Setup
### Prerequisites
Before setting up the project locally, make sure the following are installed:

- Git
- Node.js
- npm

Verify the installations:

- `git --version`
- `node --version`
- `npm --version`

### 1. Clone the Repository
Clone the project repository:

- `git clone <repository-url>`

Navigate to the project directory:

- `cd <project-folder>`

### 2. Switch to the Development Branch
Use the development branch as the starting point for local development:

- `git checkout development`

- `git pull origin development`

### 3. Install Dependencies
Install the project's dependencies using `npm`:

- `npm install`

### 4. Configure Environment Variables
Create a local `.env` file using the provided example:

- `cp .env.example .env`

Open `.env` and configure the required environment variables.

**Important:** Do not commit `.env` to the repository. Environment files may contain credentials, API keys, database information, or other sensitive configuration.

### 5. Run the Application
Run the application using the appropriate `npm` script:

- `npm run dev`

To see all available `npm` scripts:

- `npm run`

**Note:** The exact development command depends on the scripts configured in `package.json`.

### 6. Run Tests

Run the project's automated tests:

- `npm test`

Make sure the relevant tests pass before submitting a Pull Request.

## Git Workflow
Do not commit directly to `main` or `development`. All changes must be made on a separate branch and submitted through a Pull Request targeting `development`.

### Branch Naming Convention
Every branch must follow this format:

- `<type>/NWP-<story-id>-<short-description>`

The NWP Story ID should identify the specific story or task being worked on.

| Type       | Purpose                   | Example                                 |
| ---------- | ------------------------- | --------------------------------------- |
| `feature/` | New functionality         | `feature/NWP-001-device-recommendation` |
| `fix/`     | Bug fixes                 | `fix/NWP-002-pricing-calculation`       |
| `style/`   | UI/design changes         | `style/NWP-003-results-page`            |
| `test/`    | Tests                     | `test/NWP-004-bom-validation`           |
| `docs/`    | Documentation             | `docs/NWP-005-update-readme`            |
| `chore/`   | Maintenance/configuration | `chore/NWP-006-update-dependencies`     |
 
### Branch Naming Rules
- Always include the applicable NWP Story ID.
- Use lowercase for the description.
- Use hyphens (-) to separate words.
- Keep the description short and descriptive.
- Do not use spaces.
  
## Pull Request (PR) Process
All completed work must go through a Pull Request before being merged.

### 1. Start from development
- `git checkout development`
- `git pull origin development`

### 2. Create a Branch
- `git checkout -b feature/NWP-XXX-short-description`

### 3. Make and Test Your Changes
Complete the assigned task and test the changes locally.
- `npm test`

### 4. Commit Your Changes
Use a clear and descriptive commit message.
- `git add .`
- `git commit -m "Describe your changes"`

### 5. Push Your Branch
Push your branch to GitHub.
- `git push origin feature/NWP-XXX-short-description`

### 6. Open a PR
- Target the development branch.
- Reference the appropriate NWP Story ID.
- Clearly describe the changes made.
- Explain how the changes address the assigned story/task.

#### PR Title Format:

`[NWP-Story-ID]` Short description of changes

##### Example:

`[NWP-123]` Add device recommendation logic

### 7. Request Review
- The PR requires approval from both Gerard and Angel before it can be merged.

### 8. Wait for Approval
- Do not merge the PR yourself.
- Wait for the required reviewers to review and approve the PR.
