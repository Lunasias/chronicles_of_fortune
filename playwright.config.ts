import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', timeout: 90000, expect: { timeout: 20000 }, workers: 1,
  forbidOnly: !!process.env.CI, retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/browser-report.json' }]],
  use: { baseURL: 'http://127.0.0.1:5180', viewport: { width: 1280, height: 720 }, serviceWorkers: 'block', reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node scripts/test-peer-server.cjs', port: 9000, reuseExistingServer: false },
    { command: 'npm run dev -- --port 5180 --strictPort', url: 'http://127.0.0.1:5180', reuseExistingServer: false, env: { VITE_MULTIPLAYER_TRANSPORT: 'webrtc', VITE_PEER_HOST: '127.0.0.1', VITE_PEER_PORT: '9000' } },
    { command: 'npm run preview -- --host 127.0.0.1 --port 5181 --strictPort', url: 'http://127.0.0.1:5181', reuseExistingServer: false },
  ],
});
