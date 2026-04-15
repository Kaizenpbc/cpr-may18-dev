/**
 * E2E: Authentication flows (no-login tests only)
 *
 * Only contains tests that do NOT require a valid login:
 *   - Login form rendering
 *   - Invalid credential error display
 *   - Public page accessibility
 *   - Unauthenticated redirect
 *
 * Tests requiring an authenticated session live in portal.spec.ts
 * alongside the role's other tests, so each role logs in exactly once.
 */
import { test, expect } from '@playwright/test';

test.describe('Login page — public access', () => {
  test('renders username and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('invalid credentials are rejected by the server', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[name="username"]');
    await page.fill('input[name="username"]', 'nobody');
    await page.fill('input[name="password"]', 'wrongpass');
    // Accept 401 (bad creds) or 429 (rate limited) — both are error responses
    const [response] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/auth/login') && resp.request().method() === 'POST',
        { timeout: 10000 }
      ),
      page.click('button[type="submit"]'),
    ]);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    // App navigates back to /login (tokenService.forceLogout fires on 401 during login)
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('public pages accessible without login', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1, h4').first()).toBeVisible();
    await page.goto('/terms');
    await expect(page.locator('h1, h4').first()).toBeVisible();
  });

  test('unauthenticated access to protected route redirects to /login', async ({ page }) => {
    await page.goto('/instructor/dashboard');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});
