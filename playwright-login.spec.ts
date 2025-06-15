import { test, expect } from '@playwright/test';

test('Instructor can log in to the portal', async ({ page }) => {
  // Go to the login page
  await page.goto('http://localhost:5173/login');

  // Fill in the username and password
  await page.fill('input[name="username"]', 'instructor');
  await page.fill('input[name="password"]', 'test123');

  // Click the login button
  await page.click('button[type="submit"]');

  // Wait for redirect or dashboard element
  // Adjust the selector or URL as needed for your app
  await expect(page).toHaveURL(/dashboard|portal|instructor/i);

  // Optionally, check for a welcome message or dashboard content
  // await expect(page.locator('text=Welcome')).toBeVisible();
}); 