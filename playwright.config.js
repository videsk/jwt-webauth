import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  fullyParallel: true,
  // Falla si te dejaste un .only en local al subir al CI
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Base URL para que tus page.goto('/') sean relativos
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
    // Captura consola del browser en los logs del test
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Opcional: Probar en Webkit para asegurar compatibilidad con iOS/Safari
    /*
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],

  // Esta es la parte clave: Levanta tu server automáticamente
  webServer: {
    command: 'node ./test/server.js',
    url: 'http://localhost:3005',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});