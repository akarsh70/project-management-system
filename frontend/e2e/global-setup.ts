import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Register/login a test user to get auth state
    await page.goto(`${baseURL}/register`);
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });

    const testEmail = `e2e-global-${Date.now()}@example.com`;

    await page.fill('input[name="firstName"]', 'E2E');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard redirect
    await page.waitForURL(`${baseURL}/dashboard`, { timeout: 20000 });

    // Save auth state
    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    await page.context().storageState({ path: path.join(authDir, 'user.json') });
    console.log('✅ Auth state saved for E2E tests');
  } catch (e) {
    console.warn('⚠️ Could not set up auth state — app might not be running');
    console.warn(e);

    // Create empty auth file so tests can still run (they will fail gracefully)
    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(authDir, 'user.json'),
      JSON.stringify({ cookies: [], origins: [] }),
    );
  } finally {
    await browser.close();
  }
}

export default globalSetup;
