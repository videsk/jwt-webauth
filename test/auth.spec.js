import { test, expect } from '@playwright/test';
import { server } from './server.js';
import fs from 'fs';
import path from 'path';

// Cargamos el código de la librería para inyectarlo en el browser
const authSessionCode = fs.readFileSync(path.resolve('./src/index.js'), 'utf8')
  .replace('export default AuthSession;', 'window.AuthSession = AuthSession;');

test.describe('Test AuthSession', () => {

  test.beforeEach(async ({ page }) => {
    // Vamos a una página en blanco y cargamos la clase en el contexto del browser
    await page.goto('about:blank');
    await page.evaluate(authSessionCode);
    // Limpiamos storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Get default options', async ({ page }) => {
    const options = await page.evaluate(() => window.AuthSession.options);

    expect(options.accessTokenStorageKey).toBe('session-resources-token');
    expect(options.refreshTokenStorageKey).toBe('session-token');
    expect(options.maxRetries).toBe(3);
  });

  test('Get localStorage for persistent session', async ({ page }) => {
    const storage = await page.evaluate(() => {
      const session = new window.AuthSession(true);
      return session.storage;
    });
    expect(storage).toBe('localStorage');
  });

  test('Get accessToken correctly from sessionStorage', async ({ page }) => {
    const tokenValue = 'my-access-token';
    const result = await page.evaluate((token) => {
      const session = new window.AuthSession();
      // Simulamos que ya hay algo en el storage del browser
      sessionStorage.setItem('session-resources-token', token);
      return session.accessToken;
    }, tokenValue);

    expect(result).toBe(tokenValue);
  });

  test('Set and Get refreshToken', async ({ page }) => {
    const result = await page.evaluate(() => {
      const session = new window.AuthSession();
      session.refreshToken = 'refresh-123';
      return session.refreshToken;
    });
    expect(result).toBe('refresh-123');
  });

  test('Check valid accessToken via Service', async ({ page }) => {
    const isValid = await page.evaluate(async () => {
      const session = new window.AuthSession();
      session.accessToken = 'valid-token';
      // Mock del servicio de validación
      session.checker = () => Promise.resolve(true);
      return await session.check();
    });
    expect(isValid).toBe(true);
  });

  test('Renew token logic (Event dispatching)', async ({ page }) => {
    const renewedToken = await page.evaluate(async () => {
      const session = new window.AuthSession();
      session.refreshToken = 'old-refresh';

      // Mock de renovación exitosa
      session.renewal = () => Promise.resolve('new-access-token');

      return new Promise((resolve) => {
        session.addEventListener('token:renewed', (e) => {
          resolve(e.detail.accessToken);
        });
        session.renew();
      });
    });

    expect(renewedToken).toBe('new-access-token');
  });

  test('Purge session removes tokens from storage', async ({ page }) => {
    const storageEmpty = await page.evaluate(() => {
      const session = new window.AuthSession();
      session.accessToken = 'to-be-purged';
      session.purge();
      return sessionStorage.getItem('session-resources-token');
    });
    expect(storageEmpty).toBeNull();
  });

});