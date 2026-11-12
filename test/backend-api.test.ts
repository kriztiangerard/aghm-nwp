import { spawn } from 'node:child_process'
import path from 'node:path'

describe('local /generate API', () => {
  test('responds with the received payload for POST requests', async () => {
    const serverProcess = spawn(process.execPath, ['backend/server.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const waitForServer = new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 1500)
      serverProcess.stdout?.on('data', () => {
        clearTimeout(timeout)
        resolve()
      })
      serverProcess.stderr?.on('data', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    await waitForServer

    try {
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: {
            name: 'Test Project',
          },
        }),
      })

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.received.project.name).toBe('Test Project')
    } finally {
      serverProcess.kill('SIGTERM')
    }
  })
})
